#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');

const {StateAssertionError, assertState, compareState} = require('./assertions');
const {writeReports} = require('./reporters');
const {PINNED_VM_VERSION, ScratchVmAdapter, sleep} = require('./scratch-vm-adapter');

const {values} = parseArgs({
    options: {
        'complete-dir': {type: 'string'},
        'defect-dir': {type: 'string'},
        'report-dir': {type: 'string'},
        config: {type: 'string'},
        game: {type: 'string'}
    }
});

for (const required of ['complete-dir', 'defect-dir', 'report-dir']) {
    if (!values[required]) {
        console.error(`error: --${required} is required`);
        process.exit(2);
    }
}

const toolRoot = path.resolve(__dirname, '..');
const configPath = path.resolve(values.config || path.join(toolRoot, 'config/projects.json'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.scratch_vm_version !== PINNED_VM_VERSION) {
    throw new Error(`config requires scratch-vm ${config.scratch_vm_version}, adapter uses ${PINNED_VM_VERSION}`);
}

const render = value => JSON.stringify(value);

const runScenario = async (adapter, game, variant, scenario) => {
    let currentAction = 'load project';
    let negativeControl = null;
    const actions = [];
    try {
        for (const step of scenario.steps) {
            currentAction = step.label || step.action;
            if (step.action === 'green-flag') {
                adapter.greenFlag();
                // Let the scheduled flag hats execute before a following
                // wait-state can accidentally observe the previous run.
                await sleep(75);
                actions.push({action: currentAction, status: 'completed'});
            } else if (step.action === 'sleep') {
                await sleep(step.milliseconds);
                actions.push({action: currentAction, status: 'completed'});
            } else if (step.action === 'click') {
                await adapter.clickSprite(
                    step.count || 1,
                    step.delay_milliseconds || 90,
                    step.sprite
                );
                actions.push({action: currentAction, status: 'completed', count: step.count || 1});
            } else if (step.action === 'set-stage-variable') {
                adapter.setStageVariable(step.variable, step.value);
                actions.push({
                    action: currentAction,
                    status: 'completed',
                    variable: step.variable,
                    value: step.value
                });
            } else if (step.action === 'expect') {
                const actual = adapter.snapshot();
                assertState(actual, step.expected);
                actions.push({action: currentAction, status: 'passed', expected: step.expected, actual});
            } else if (step.action === 'wait-state') {
                const deadline = Date.now() + (step.timeout_milliseconds || 6000);
                let actual = adapter.snapshot();
                while (compareState(actual, step.expected) && Date.now() < deadline) {
                    await sleep(25);
                    actual = adapter.snapshot();
                }
                assertState(actual, step.expected);
                actions.push({action: currentAction, status: 'passed', expected: step.expected, actual});
            } else if (step.action === 'negative-control') {
                const actual = adapter.snapshot();
                const firstDivergence = compareState(actual, step.complete_expected);
                if (!firstDivergence) {
                    throw new Error('negative control unexpectedly satisfied the complete-project expectation');
                }
                negativeControl = {
                    expected: step.complete_expected,
                    actual,
                    first_divergence: firstDivergence
                };
                actions.push({action: currentAction, status: 'expected-failure', ...negativeControl});
            } else {
                throw new Error(`unknown scenario action: ${step.action}`);
            }
        }
        return {
            game,
            variant,
            scenario: scenario.name,
            status: negativeControl ? 'expected-failure' : 'passed',
            actions,
            ...(negativeControl ? {negative_control: negativeControl} : {})
        };
    } catch (error) {
        const failure = {
            message: error.message,
            action: currentAction,
            expected: error instanceof StateAssertionError ? error.expected : null,
            actual: error instanceof StateAssertionError ? error.actual : null,
            first_divergence: error instanceof StateAssertionError ? error.firstDivergence : null
        };
        return {game, variant, scenario: scenario.name, status: 'failed', actions, failure};
    }
};

const printResult = result => {
    if (result.status === 'failed') {
        console.error(`FAIL game=${result.game} variant=${result.variant} scenario=${result.scenario}`);
        console.error(`  action=${result.failure.action}`);
        console.error(`  expected=${render(result.failure.expected)}`);
        console.error(`  actual=${render(result.failure.actual)}`);
        console.error(`  first_divergence=${render(result.failure.first_divergence)}`);
    } else if (result.status === 'expected-failure') {
        console.log(`XFAIL game=${result.game} variant=${result.variant} scenario=${result.scenario}`);
        console.log(`  first_divergence=${render(result.negative_control.first_divergence)}`);
    } else {
        console.log(`PASS game=${result.game} variant=${result.variant} scenario=${result.scenario}`);
    }
};

const main = async () => {
    const results = [];
    const selectedGames = values.game ?
        config.games.filter(gameConfig => gameConfig.game === values.game) :
        config.games;
    if (selectedGames.length === 0) {
        throw new Error(`configured game does not exist: ${values.game}`);
    }
    for (const gameConfig of selectedGames) {
        const scenarioPath = path.resolve(path.dirname(configPath), gameConfig.scenarios);
        const definitions = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
        for (const variant of ['complete', 'defective']) {
            const directory = variant === 'complete' ? values['complete-dir'] : values['defect-dir'];
            const artifact = variant === 'complete' ? gameConfig.complete_artifact : gameConfig.defect_artifact;
            const archivePath = path.resolve(directory, artifact);
            const adapter = new ScratchVmAdapter(
                archivePath,
                gameConfig.input_sprite,
                gameConfig.observe_sprite
            );
            try {
                await adapter.load();
                for (const scenario of definitions[variant]) {
                    const result = await runScenario(adapter, gameConfig.game, variant, scenario);
                    results.push(result);
                    printResult(result);
                }
            } catch (error) {
                const result = {
                    game: gameConfig.game,
                    variant,
                    scenario: 'load-project',
                    status: 'failed',
                    actions: [],
                    failure: {
                        message: error.message,
                        action: 'load project',
                        expected: {loadable: true},
                        actual: {loadable: false},
                        first_divergence: {key: 'loadable', expected: true, actual: false}
                    }
                };
                results.push(result);
                printResult(result);
            } finally {
                adapter.close();
            }
        }
    }

    const reportDir = path.resolve(values['report-dir']);
    writeReports(
        results,
        {
            runner: 'mirai-scratch-vm-headless',
            scratch_vm_version: PINNED_VM_VERSION,
            adapter: 'version-locked source entry and runtime.startHats click adapter'
        },
        path.join(reportDir, 'scratch-headless.json'),
        path.join(reportDir, 'scratch-headless.junit.xml')
    );
    const failures = results.filter(result => result.status === 'failed');
    console.log(`Headless summary: total=${results.length} failed=${failures.length}`);
    process.exitCode = failures.length ? 1 : 0;
};

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
