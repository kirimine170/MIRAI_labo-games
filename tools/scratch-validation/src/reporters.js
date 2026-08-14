'use strict';

const fs = require('node:fs');
const path = require('node:path');

const xmlEscape = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const writeReports = (results, metadata, jsonPath, junitPath) => {
    const failures = results.filter(result => result.status === 'failed');
    const expectedFailures = results.filter(result => result.status === 'expected-failure');
    const report = {
        schema_version: '1.0.0',
        ...metadata,
        summary: {
            total: results.length,
            passed: results.length - failures.length,
            failed: failures.length,
            expected_failures_observed: expectedFailures.length
        },
        scenarios: results
    };
    fs.mkdirSync(path.dirname(jsonPath), {recursive: true});
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

    const cases = results.map(result => {
        const attributes = `classname="scratch.behavior.${xmlEscape(result.game)}" name="${xmlEscape(`${result.variant}: ${result.scenario}`)}"`;
        if (result.status === 'failed') {
            const body = xmlEscape(JSON.stringify(result.failure, null, 2));
            return `  <testcase ${attributes}><failure message="${xmlEscape(result.failure.message)}">${body}</failure></testcase>`;
        }
        if (result.status === 'expected-failure') {
            const output = xmlEscape(JSON.stringify(result.negative_control, null, 2));
            return `  <testcase ${attributes}><system-out>Expected failure observed: ${output}</system-out></testcase>`;
        }
        return `  <testcase ${attributes}/>`;
    });
    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuite name="scratch-headless" tests="${results.length}" failures="${failures.length}">`,
        ...cases,
        '</testsuite>',
        ''
    ].join('\n');
    fs.writeFileSync(junitPath, xml);
};

module.exports = {writeReports, xmlEscape};
