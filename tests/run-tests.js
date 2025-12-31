/**
 * Simple Test Runner for REFLECTIONS
 * Runs all test files and reports results
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Test assertion utilities
 */
export const assert = {
    equal(actual, expected, message = '') {
        totalTests++;
        if (actual === expected) {
            passedTests++;
            console.log(`  ${colors.green}✓${colors.reset} ${message || 'passed'}`);
            return true;
        } else {
            failedTests++;
            console.log(`  ${colors.red}✗${colors.reset} ${message || 'failed'}`);
            console.log(`    Expected: ${colors.green}${expected}${colors.reset}`);
            console.log(`    Actual:   ${colors.red}${actual}${colors.reset}`);
            return false;
        }
    },

    notEqual(actual, expected, message = '') {
        totalTests++;
        if (actual !== expected) {
            passedTests++;
            console.log(`  ${colors.green}✓${colors.reset} ${message || 'passed'}`);
            return true;
        } else {
            failedTests++;
            console.log(`  ${colors.red}✗${colors.reset} ${message || 'failed'}`);
            console.log(`    Should not equal: ${colors.red}${expected}${colors.reset}`);
            return false;
        }
    },

    ok(value, message = '') {
        totalTests++;
        if (value) {
            passedTests++;
            console.log(`  ${colors.green}✓${colors.reset} ${message || 'passed'}`);
            return true;
        } else {
            failedTests++;
            console.log(`  ${colors.red}✗${colors.reset} ${message || 'failed'}`);
            console.log(`    Expected truthy value, got: ${colors.red}${value}${colors.reset}`);
            return false;
        }
    },

    deepEqual(actual, expected, message = '') {
        totalTests++;
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr === expectedStr) {
            passedTests++;
            console.log(`  ${colors.green}✓${colors.reset} ${message || 'passed'}`);
            return true;
        } else {
            failedTests++;
            console.log(`  ${colors.red}✗${colors.reset} ${message || 'failed'}`);
            console.log(`    Expected: ${colors.green}${expectedStr}${colors.reset}`);
            console.log(`    Actual:   ${colors.red}${actualStr}${colors.reset}`);
            return false;
        }
    },

    throws(fn, message = '') {
        totalTests++;
        try {
            fn();
            failedTests++;
            console.log(`  ${colors.red}✗${colors.reset} ${message || 'failed'}`);
            console.log(`    Expected function to throw`);
            return false;
        } catch (e) {
            passedTests++;
            console.log(`  ${colors.green}✓${colors.reset} ${message || 'passed'}`);
            return true;
        }
    }
};

/**
 * Test suite wrapper
 */
export function describe(suiteName, fn) {
    console.log(`\n${colors.blue}${suiteName}${colors.reset}`);
    fn();
}

/**
 * Individual test wrapper
 */
export function test(testName, fn) {
    try {
        fn();
    } catch (error) {
        failedTests++;
        console.log(`  ${colors.red}✗${colors.reset} ${testName}`);
        console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    }
}

/**
 * Run all test files
 */
async function runAllTests() {
    console.log(`${colors.yellow}Running REFLECTIONS Test Suite${colors.reset}`);
    console.log(`${colors.gray}${'='.repeat(50)}${colors.reset}\n`);

    const testFiles = readdirSync(__dirname)
        .filter(file => file.endsWith('.test.js') && file !== 'run-tests.js');

    for (const testFile of testFiles) {
        try {
            await import(join(__dirname, testFile));
        } catch (error) {
            console.log(`${colors.red}Error loading ${testFile}:${colors.reset}`, error.message);
        }
    }

    // Print summary
    console.log(`\n${colors.gray}${'='.repeat(50)}${colors.reset}`);
    console.log(`\n${colors.yellow}Test Summary:${colors.reset}`);
    console.log(`  Total:  ${totalTests}`);
    console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);

    if (failedTests > 0) {
        console.log(`\n${colors.red}Tests failed!${colors.reset}`);
        process.exit(1);
    } else {
        console.log(`\n${colors.green}All tests passed!${colors.reset}`);
        process.exit(0);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
    process.exit(1);
});
