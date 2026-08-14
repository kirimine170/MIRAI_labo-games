'use strict';

class StateAssertionError extends Error {
    constructor (expected, actual, firstDivergence) {
        super(`state diverged at ${firstDivergence.key}`);
        this.name = 'StateAssertionError';
        this.expected = expected;
        this.actual = actual;
        this.firstDivergence = firstDivergence;
    }
}

const compareState = (actual, expected) => {
    for (const [key, expectedValue] of Object.entries(expected)) {
        const actualValue = actual[key];
        const isApproximation = expectedValue &&
            typeof expectedValue === 'object' &&
            typeof expectedValue.approx === 'number' &&
            typeof expectedValue.tolerance === 'number';
        const matches = isApproximation ?
            typeof actualValue === 'number' &&
                Math.abs(actualValue - expectedValue.approx) <= expectedValue.tolerance :
            Object.is(actualValue, expectedValue);
        if (!matches) {
            return {key, expected: expectedValue, actual: actualValue};
        }
    }
    return null;
};

const assertState = (actual, expected) => {
    const firstDivergence = compareState(actual, expected);
    if (firstDivergence) {
        throw new StateAssertionError(expected, actual, firstDivergence);
    }
};

module.exports = {StateAssertionError, assertState, compareState};
