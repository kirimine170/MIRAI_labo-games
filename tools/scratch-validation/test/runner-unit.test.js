'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {StateAssertionError, assertState, compareState} = require('../src/assertions');
const {writeReports, xmlEscape} = require('../src/reporters');

assert.equal(compareState({score: 1}, {score: 1}), null);
assert.deepEqual(compareState({score: 0}, {score: 1}), {
    key: 'score', expected: 1, actual: 0
});
assert.equal(compareState({x: 1.005}, {x: {approx: 1, tolerance: 0.01}}), null);
assert.throws(() => assertState({score: 0}, {score: 1}), StateAssertionError);
assert.equal(xmlEscape('<tag>&'), '&lt;tag&gt;&amp;');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mirai-reporters-'));
const jsonPath = path.join(temporary, 'report.json');
const junitPath = path.join(temporary, 'report.xml');
writeReports([
    {game: 'sample', variant: 'complete', scenario: 'passes', status: 'passed', actions: []},
    {
        game: 'sample',
        variant: 'defective',
        scenario: 'negative',
        status: 'expected-failure',
        actions: [],
        negative_control: {first_divergence: {key: 'score', expected: 1, actual: 0}}
    }
], {scratch_vm_version: '15.0.1'}, jsonPath, junitPath);
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
assert.equal(report.summary.failed, 0);
assert.equal(report.summary.expected_failures_observed, 1);
assert.match(fs.readFileSync(junitPath, 'utf8'), /Expected failure observed/);
fs.rmSync(temporary, {recursive: true, force: true});

console.log('Scratch validation unit tests passed');
