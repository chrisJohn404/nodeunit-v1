/**
 * Custom Node.js Task Runner Script (Replicating nodeunit Makefile)
 *
 * This script serves as a simple build/task runner, executing commands
 * based on command line arguments, similar to a traditional Makefile.
 *
 * Run from the terminal: node task_runner.js <command> [options]
 * Examples:
 * node task_runner.js build
 * node task_runner.js browser
 * node task_runner.js install
 * node task_runner.js -h
 * 
 * Author: Chris Johnson (chrisjohn404)
 * September 2025
 * License: GPLv2
 */

const { execSync } = require('child_process');
const fs = require('fs');

// --- 1. Argument Parsing and Setup ---

// Get all command line arguments starting from the third element (index 2).
const userArgs = process.argv.slice(2);

// Extract the primary command (the first argument not starting with a hyphen).
let primaryCommand = userArgs.find(arg => !arg.startsWith('-')) || '';
primaryCommand = primaryCommand.toLowerCase();

// Get all flags/options (arguments starting with a hyphen).
const options = userArgs.filter(arg => arg.startsWith('-'));

// Define variables mimicking the Makefile (simplified for Node context)
const BUILDDIR = 'dist';
const PREFIX = '/usr/local';
const BINDIR = `${PREFIX}/bin`;
const MANDIR = `${PREFIX}/share/man`;
const LIBDIR = `${PREFIX}/lib`;
const PACKAGE = 'nodeunit';

// --- Helper Functions ---

/**
 * Executes a shell command synchronously and prints output.
 * @param {string} command - The shell command to execute.
 * @param {string} taskName - Name of the task for error reporting.
 */
function exec(command, taskName = 'Task') {
    try {
        console.log(`   -> Executing: ${command}`);
        // Run command, capture output, and print it
        const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        if (output) {
             // Print output line-by-line for readability
             output.trim().split('\n').forEach(line => console.log(`      | ${line}`));
        }
    } catch (error) {
        console.error(`\n❌ ERROR in ${taskName}: Command failed.`);
        // Show only the command output part of the error
        if (error.stderr) {
            console.error(`--- Shell Error Output ---`);
            console.error(error.stderr.trim());
            console.error(`--------------------------`);
        }
        // Exit the script on failure, mirroring Makefile behavior
        process.exit(1);
    }
}

/**
 * Ensures the build directory exists.
 */
function setupBuildDir() {
    if (!fs.existsSync(BUILDDIR)) {
        console.log(`   -> Creating build directory: ${BUILDDIR}`);
        fs.mkdirSync(BUILDDIR);
    }
}

// --- 2. Define Core Tasks ---

/**
 * Executes the 'clean' task (from Makefile).
 */
function runClean() {
    console.log('\n🧹 Running CLEAN task...');
    if (fs.existsSync(BUILDDIR)) {
        exec(`rm -rf ${BUILDDIR}`, 'Clean');
    }
    // Remove stamp-build file if it exists
    if (fs.existsSync('stamp-build')) {
        exec(`rm -f stamp-build`, 'Clean');
    }
    console.log('✅ Clean complete!');
}

/**
 * Executes the main 'build' task (from Makefile).
 */
function runBuild() {
    console.log(`\n📦 Running BUILD task (Node Module)...`);
    setupBuildDir();
    
    // Equivalent to 'touch $@' (stamp-build) - creates the dependency marker
    exec(`touch stamp-build`, 'Build');
    
    // Equivalent to mkdir and cp -R for the module directory
    exec(`mkdir -p ${BUILDDIR}/${PACKAGE}`, 'Build');
    console.log('   -> Copying source files to dist/...');
    // NOTE: This assumes 'bin', 'deps', 'lib', 'index.js', 'package.json', 'share' exist locally.
    exec(`cp -R bin deps index.js lib package.json share ${BUILDDIR}/${PACKAGE}`, 'Build');

    // Create the nodeunit shell wrapper script
    const nodejsLibDir = `${LIBDIR}/node`;
    const wrapperScript = `#!/bin/sh\nnode ${nodejsLibDir}/${PACKAGE}/bin/nodeunit $@`;
    fs.writeFileSync(`${BUILDDIR}/nodeunit.sh`, wrapperScript, { mode: 0o755 });
    
    console.log('✅ Node module build complete!');
}

/**
 * Executes the 'browser' build task (from Makefile).
 */
function runBrowser() {
    console.log('\n🌐 Running BROWSER build task...');
    
    // NOTE: This task is highly dependent on specific file structure (share/, lib/, deps/)
    // and complex shell commands (cat, sed, uglifyjs). In a modern environment, this
    // would be handled by Webpack or Rollup.
    
    // We demonstrate the complexity by using exec for the steps.
    exec(`mkdir -p ${BUILDDIR}/browser`, 'Browser Build');
    exec(`rm -rf ${BUILDDIR}/browser/*`, 'Browser Build');
    
    // Step 1: Concatenate files into ${BUILDDIR}/browser/nodeunit.js
    console.log('   -> Concatenating library files (lib/core.js, lib/assert.js, etc.)...');
    
    // Since we cannot replicate the complex 'cat' and file creation logic perfectly
    // without the source files, we will use a single placeholder command for the final output.
    // The original Makefile logic would be:
    // cat share/license.js >> file
    // echo "nodeunit = (function(){" >> file
    // ... many cat and echo steps ...
    
    console.log('   -> [SKIPPED] Complex file concatenation/injection due to missing source files.');
    
    // Step 2: Minify the file using uglifyjs
    // Requires 'uglify-js' to be installed via npm
    console.log('   -> Minifying browser bundle using uglify-js...');
    exec(`node_modules/uglify-js/bin/uglifyjs ${BUILDDIR}/browser/nodeunit.js > ${BUILDDIR}/browser/nodeunit.min.js || echo "Minification skipped (file missing)."`, 'Browser Build');
    
    // Step 3: Copy CSS and Test files
    console.log('   -> Copying assets and test scripts...');
    exec(`cp share/nodeunit.css ${BUILDDIR}/browser/nodeunit.css || true`, 'Browser Build');
    exec(`mkdir -p ${BUILDDIR}/browser/test`, 'Browser Build');

    console.log('✅ Browser build complete (Requires full source files to function).');
}

/**
 * Executes the 'commonjs' build task (from Makefile).
 */
function runCommonJS() {
    console.log('\n🧩 Running COMMONJS build task...');
    
    // NOTE: This is similar to the 'browser' task, involving concatenation and sed.
    // It is primarily a placeholder using exec for demonstration.
    
    exec(`mkdir -p ${BUILDDIR}/commonjs`, 'CommonJS Build');
    exec(`rm -rf ${BUILDDIR}/commonjs/*`, 'CommonJS Build');
    
    console.log('   -> [SKIPPED] Complex file concatenation/injection for CommonJS module.');
    
    // The original Makefile used 'sed -i' for in-place replacement, which is OS-dependent.
    // We represent this as a command.
    console.log('   -> Applying CommonJS specific sed replacements...');
    exec(`sed -i "/\\@REMOVE_LINE_FOR_BROWSER/d" ${BUILDDIR}/commonjs/nodeunit.js || echo "Sed step skipped (file missing)."`, 'CommonJS Build');
    
    console.log('✅ CommonJS build complete (Requires full source files to function).');
}


/**
 * Executes the 'test' task (from Makefile).
 */
function runTest() {
    console.log(`\n🧪 Running TEST task...`);
    // Assuming 'nodeunit' is installed locally or globally
    exec(`node ./bin/nodeunit test`, 'Test');
    console.log('✅ Tests finished.');
}

/**
 * Executes the 'lint' task (from Makefile).
 */
function runLint() {
    console.log(`\n🔍 Running LINT task...`);
    // Assuming 'nodelint' is installed via npm
    exec(`nodelint --config nodelint.cfg ./index.js ./bin/nodeunit ./bin/nodeunit.json ./lib/*.js ./lib/reporters/*.js ./test/*.js`, 'Lint');
    console.log('✅ Lint complete.');
}

/**
 * Executes the 'doc' task (Man page generation).
 */
function runDoc() {
    console.log(`\n📖 Running DOC task (Man page generation)...`);
    // Requires 'ronn' to be installed globally (gem install ronn or npm install ronn)
    exec(`mkdir -p man1`, 'Doc');
    
    // The complex rule man1/%.1: doc/%.md requires iterating over docs and running ronn.
    // We represent this with a placeholder:
    console.log('   -> [Placeholder] Converting doc/*.md to man1/*.1 using ronn...');
    // A command to generate one example man page:
    exec('ronn --roff doc/nodeunit.md > man1/nodeunit.1 || echo "Ronn command failed or doc/nodeunit.md not found."', 'Doc');
    
    console.log('✅ Doc generation complete.');
}


/**
 * Executes the 'install' task (from Makefile).
 */
function runInstall() {
    console.log('\n⬇️ Running INSTALL task (requires elevated permissions)...');
    runBuild(); // Dependency of install
    
    // NOTE: These are system-level install commands. They require proper permissions
    // (e.g., running with 'sudo') and the target paths to exist.
    
    exec(`install -d ${LIBDIR}/node`, 'Install');
    exec(`cp -a ${BUILDDIR}/${PACKAGE} ${LIBDIR}/node`, 'Install');
    
    // Install the wrapper script created in runBuild()
    exec(`install -m 0755 ${BUILDDIR}/nodeunit.sh ${BINDIR}/nodeunit`, 'Install');
    
    // Install the man page
    exec(`install -d ${MANDIR}/man1/`, 'Install');
    exec(`cp -a man1/nodeunit.1 ${MANDIR}/man1/`, 'Install');
    
    console.log('✅ Install complete. You may need to run this with sudo.');
}

/**
 * Executes the 'uninstall' task (from Makefile).
 */
function runUninstall() {
    console.log('\n⬆️ Running UNINSTALL task (requires elevated permissions)...');
    
    // NOTE: These are system-level uninstall commands.
    exec(`rm -rf ${LIBDIR}/node/nodeunit ${LIBDIR}/node/nodeunit.js ${BINDIR}/nodeunit`, 'Uninstall');
    exec(`rm -rf ${MANDIR}/man1/nodeunit.1`, 'Uninstall');
    
    console.log('✅ Uninstall complete. You may need to run this with sudo.');
}


/**
 * Displays the help menu.
 * @param {boolean} showVerbose - If true, show extended help information.
 */
function showHelp(showVerbose) {
    console.log(`\n=================================================`);
    console.log(`       Node.js Task Runner Help Menu (nodeunit)`);
    console.log(`=================================================`);
    console.log(`Usage: node task_runner.js <command> [options]`);
    console.log(`\nAvailable Commands (from Makefile):`);
    console.log(`  all        : Runs 'build' and 'doc'.`);
    console.log(`  build      : Copies source files and creates installer script.`);
    console.log(`  browser    : Creates the concatenated browser bundle (.js, .min.js).`);
    console.log(`  commonjs   : Creates the CommonJS browser module bundle.`);
    console.log(`  test       : Runs the unit tests.`);
    console.log(`  lint       : Runs static analysis using 'nodelint'.`);
    console.log(`  install    : Copies files to ${BINDIR} and ${LIBDIR}/node.`);
    console.log(`  uninstall  : Removes installed files.`);
    console.log(`  clean      : Removes the '${BUILDDIR}' directory and stamp files.`);
    console.log(`  doc        : Generates man pages using 'ronn'.`);
    console.log(`  help (-h)  : Shows this simple help message.`);

    if (showVerbose) {
        console.log(`\nAvailable Options (Flags):`);
        console.log(`  -h, --help : Simple help view (use with no command).`);
        console.log(`  -hh        : Verbose help view (use with no command).`);
    }
    console.log(`=================================================`);
}

// --- 3. Command Switch Logic ---

// Check for help flags first, as they are often used without a command.
if (options.includes('-h') || options.includes('--help')) {
    showHelp(false);
} else if (options.includes('-hh')) {
    showHelp(true);
} else if (primaryCommand === '') {
    // If no command and no help flag, show error and simple help.
    console.error(`\n❌ ERROR: No command provided.`);
    showHelp(false);
} else {
    // Execute the task based on the primary command
    switch (primaryCommand) {
        case 'all':
            runBuild();
            // runDoc();
            break;

        case 'build':
            runBuild();
            break;
            
        case 'browser':
            runBrowser();
            break;
            
        case 'commonjs':
            runCommonJS();
            break;

        case 'test':
            runTest();
            break;

        case 'clean':
            runClean();
            break;
            
        // case 'lint':
        //     runLint();
        //     break;

        // case 'doc':
        //     runDoc();
        //     break;

        case 'install':
            runInstall();
            break;

        case 'uninstall':
            runUninstall();
            break;
            
        default:
            console.error(`\n❌ ERROR: Unknown command: '${primaryCommand}'`);
            showHelp(false);
            break;
    }
}


/* Author(s): Chris Johnson (chrisjohn404) September 2025 GPLv2 */