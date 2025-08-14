#!/usr/bin/env node

/**
 * Frontend test runner with detailed reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(message) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(message, 'cyan'));
  console.log('='.repeat(60));
}

function printSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function printError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function printWarning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

function printInfo(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

async function checkDependencies() {
  printHeader('Checking Dependencies');
  
  const requiredDeps = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event'
  ];
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    printError('package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  let allInstalled = true;
  
  requiredDeps.forEach(dep => {
    if (allDeps[dep]) {
      printSuccess(`${dep} is installed`);
    } else {
      printError(`${dep} is missing`);
      allInstalled = false;
    }
  });
  
  if (!allInstalled) {
    printWarning('Install missing dependencies with:');
    printInfo('npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event');
  }
  
  return allInstalled;
}

function runTests() {
  return new Promise((resolve) => {
    printHeader('Running Frontend Tests');
    
    const testProcess = spawn('npm', ['test', '--', '--watchAll=false', '--verbose'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        printSuccess('All tests passed!');
      } else {
        printError(`Tests failed with exit code: ${code}`);
      }
      resolve(code === 0);
    });
    
    testProcess.on('error', (error) => {
      printError(`Failed to run tests: ${error.message}`);
      resolve(false);
    });
  });
}

function runComponentTests() {
  return new Promise((resolve) => {
    printHeader('Running Component Tests');
    
    const testProcess = spawn('npm', ['test', '--', 'tests/components', '--watchAll=false', '--verbose'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    testProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    testProcess.on('error', (error) => {
      printError(`Failed to run component tests: ${error.message}`);
      resolve(false);
    });
  });
}

function runIntegrationTests() {
  return new Promise((resolve) => {
    printHeader('Running Integration Tests');
    
    const testProcess = spawn('npm', ['test', '--', 'tests/integration', '--watchAll=false', '--verbose'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    testProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    testProcess.on('error', (error) => {
      printError(`Failed to run integration tests: ${error.message}`);
      resolve(false);
    });
  });
}

async function runCoverage() {
  return new Promise((resolve) => {
    printHeader('Running Coverage Report');
    
    const coverageProcess = spawn('npm', ['test', '--', '--coverage', '--watchAll=false'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });
    
    coverageProcess.on('close', (code) => {
      if (code === 0) {
        printSuccess('Coverage report generated');
        printInfo('Coverage report available in coverage/ directory');
      } else {
        printWarning('Coverage report generation failed');
      }
      resolve(code === 0);
    });
    
    coverageProcess.on('error', (error) => {
      printError(`Failed to run coverage: ${error.message}`);
      resolve(false);
    });
  });
}

function generateTestReport() {
  printHeader('Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    testResults: 'See above output for detailed results'
  };
  
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  printInfo(`Test report saved to: ${reportPath}`);
}

async function main() {
  try {
    printHeader('Frontend Test Suite');
    
    // Check dependencies
    const depsOk = await checkDependencies();
    if (!depsOk) {
      printError('Missing dependencies. Please install them first.');
      process.exit(1);
    }
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Usage: node runTests.js [options]

Options:
  --components     Run only component tests
  --integration    Run only integration tests
  --coverage       Run tests with coverage report
  --help, -h       Show this help message

Examples:
  node runTests.js                    # Run all tests
  node runTests.js --components       # Run component tests only
  node runTests.js --coverage         # Run all tests with coverage
      `);
      return;
    }
    
    let success = true;
    
    if (args.includes('--components')) {
      success = await runComponentTests();
    } else if (args.includes('--integration')) {
      success = await runIntegrationTests();
    } else if (args.includes('--coverage')) {
      success = await runCoverage();
    } else {
      // Run all tests
      const componentSuccess = await runComponentTests();
      const integrationSuccess = await runIntegrationTests();
      success = componentSuccess && integrationSuccess;
      
      if (success) {
        // Run coverage if all tests pass
        await runCoverage();
      }
    }
    
    // Generate report
    generateTestReport();
    
    if (success) {
      printSuccess('All tests completed successfully!');
      process.exit(0);
    } else {
      printError('Some tests failed. Please check the output above.');
      process.exit(1);
    }
    
  } catch (error) {
    printError(`Test runner failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  printWarning('\nTests interrupted by user');
  process.exit(1);
});

if (require.main === module) {
  main();
}