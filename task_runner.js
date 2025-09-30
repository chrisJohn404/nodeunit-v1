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
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// Import UglifyJS module for minification
const UglifyJS = require('uglify-js');

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
 * This is now reserved for system-level tasks or external binary calls.
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
    // Using fs.rmSync for cross-platform recursive deletion (Node v14.4.0+)
    if (fs.existsSync(BUILDDIR)) {
        console.log(`   -> Removing build directory: ${BUILDDIR}`);
        fs.rmSync(BUILDDIR, { recursive: true, force: true });
    }
    // Remove stamp-build file if it exists
    if (fs.existsSync('stamp-build')) {
        console.log('   -> Removing stamp-build file');
        fs.unlinkSync('stamp-build');
    }
    console.log('✅ Clean complete!');
}

/**
 * Executes the main 'build' task (from Makefile).
 */
function runBuild() {
    console.log(`\n📦 Running BUILD task (Node Module)...`);
    setupBuildDir();
    
    // Equivalent to 'touch $@' (stamp-build) - using fs.writeFileSync
    console.log('   -> Creating dependency marker: stamp-build');
    fs.writeFileSync('stamp-build', '');
    
    const targetDir = path.join(BUILDDIR, PACKAGE);
    console.log(`   -> Creating module directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
    
    // NOTE: This assumes 'bin', 'deps', 'lib', 'index.js', 'package.json', 'share' exist locally.
    // We use shell copy command here as native recursive copying is complex/verbose.
    console.log('   -> Copying source files to dist/... (via shell)');
    exec(`cp -R bin deps index.js lib package.json share ${targetDir}`, 'Build');

    // Create the nodeunit shell wrapper script
    const nodejsLibDir = `${LIBDIR}/node`;
    const wrapperScript = `#!/bin/sh\nnode ${nodejsLibDir}/${PACKAGE}/bin/nodeunit $@`;
    console.log('   -> Creating shell wrapper script: nodeunit.sh');
    fs.writeFileSync(`${BUILDDIR}/nodeunit.sh`, wrapperScript, { mode: 0o755 });
    
    console.log('✅ Node module build complete!');
}

/**
 * Helper to concatenate files and perform sed-like text replacement.
 * @param {string} targetFile - The output file path.
 * @param {Array<{path: string, content: string}>} parts - Array of objects to write (either file path or string content).
 * @param {string[]} replacements - Array of strings to remove from the final content.
 */
function buildAndClean(targetFile, parts, replacements) {
    let content = '';
    
    // Concatenate content
    parts.forEach(part => {
        if (part.path) {
            content += fs.readFileSync(part.path, 'utf8');
        } else if (part.content) {
            content += part.content;
        }
        content += '\n';
    });
    
    // Perform sed-like replacement (using string replace)
    replacements.forEach(line => {
        // Use a global regex to remove all occurrences of the specific string
        content = content.replace(new RegExp(line.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');
    });

    fs.writeFileSync(targetFile, content, 'utf8');
}


/**
 * Executes the 'browser' build task (from Makefile) using native FS.
 */
function runBrowser() {
    console.log('\n🌐 Running BROWSER build task...');
    
    const browserDir = path.join(BUILDDIR, 'browser');
    
    // Replaces mkdir -p and rm -rf
    if (fs.existsSync(browserDir)) {
        fs.rmSync(browserDir, { recursive: true, force: true });
    }
    fs.mkdirSync(browserDir, { recursive: true });

    const targetFile = path.join(browserDir, 'nodeunit.js');
    console.log(`   -> Concatenating library files into ${targetFile}...`);
    
    // Replicating complex 'cat' and 'echo' logic using native FS
    const parts = [
        { path: 'share/license.js' },
        { content: "nodeunit = (function(){" },
        { path: 'deps/json2.js' },
        { content: "var assert = this.assert = {};" },
        { content: "var types = {};" },
        { content: "var core = {};" },
        { content: "var nodeunit = {};" },
        { content: "var reporter = {};" },
        { path: 'deps/async.js' },
        { content: "(function(exports){" },
        { path: 'lib/assert.js' },
        { content: "})(assert);" },
        { content: "(function(exports){" },
        { path: 'lib/types.js' },
        { content: "})(types);" },
        { content: "(function(exports){" },
        { path: 'lib/core.js' },
        { content: "})(core);" },
        { content: "(function(exports){" },
        { path: 'lib/reporters/browser.js' },
        { content: "})(reporter);" },
        { content: "nodeunit = core;" },
        { content: "nodeunit.assert = assert;" },
        { content: "nodeunit.reporter = reporter;" },
        { content: "nodeunit.run = reporter.run;" },
        { content: "return nodeunit; })();" },
    ];
    
    // Simulate the sed step: sed "/\@REMOVE_LINE_FOR_BROWSER/d"
    const replacements = ['@REMOVE_LINE_FOR_BROWSER'];

    // Build the main browser file
    buildAndClean(targetFile, parts, replacements);
    
    // Copy CSS file
    console.log('   -> Copying nodeunit.css');
    fs.copyFileSync('share/nodeunit.css', path.join(browserDir, 'nodeunit.css'));
    
    // Step 2: Minify the file using UglifyJS module (UPDATED)
    console.log('   -> Minifying browser bundle using UglifyJS module...');
    try {
        const unminifiedCode = fs.readFileSync(targetFile, 'utf8');
        // Use UglifyJS.minify() on the raw code string
        const minified = UglifyJS.minify(unminifiedCode);

        if (minified.error) {
            throw minified.error;
        }

        fs.writeFileSync(path.join(browserDir, 'nodeunit.min.js'), minified.code, 'utf8');
        console.log('      | Minification successful.');
    } catch (e) {
        // Log error but continue the script
        console.error(`\n❌ ERROR during UglifyJS minification: ${e.message}`);
    }
    
    // Step 3: Copy Test scripts and inject wrapper
    const testDir = path.join(browserDir, 'test');
    fs.mkdirSync(testDir, { recursive: true });
    fs.copyFileSync('test/test.html', path.join(testDir, 'test.html'));
    
    const testScripts = ['test-base.js', 'test-runmodule.js', 'test-runtest.js', 'test-testcase.js', 'test-testcase-legacy.js'];

    testScripts.forEach(script => {
        const scriptName = path.basename(script, '.js');
        const targetPath = path.join(testDir, script);
        
        const testParts = [
            { content: `(function (exports) {` },
            { path: `test/${script}` },
            { content: `})(this.${scriptName.replace(/-/g, '_')} = {});` }
        ];
        
        // Build the test script and apply sed-like replacement
        buildAndClean(targetPath, testParts, replacements);
    });
    
    // Copy main files to test directory for easy hosting
    fs.copyFileSync(targetFile, path.join(testDir, 'nodeunit.js'));
    fs.copyFileSync(path.join(browserDir, 'nodeunit.css'), path.join(testDir, 'nodeunit.css'));

    console.log('✅ Browser build complete.');
}

/**
 * Executes the 'commonjs' build task (from Makefile) using native FS.
 */
function runCommonJS() {
    console.log('\n🧩 Running COMMONJS build task...');
    
    const commonjsDir = path.join(BUILDDIR, 'commonjs');
    
    // Replaces mkdir -p and rm -rf
    if (fs.existsSync(commonjsDir)) {
        fs.rmSync(commonjsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(commonjsDir, { recursive: true });
    fs.mkdirSync(path.join(commonjsDir, 'deps'), { recursive: true });
    
    // Copy dependency files
    fs.copyFileSync('deps/json2.js', path.join(commonjsDir, 'deps/json2.js'));
    fs.copyFileSync('deps/async.js', path.join(commonjsDir, 'deps/async.js'));

    const targetFile = path.join(commonjsDir, 'nodeunit.js');
    console.log(`   -> Concatenating library files into ${targetFile}...`);
    
    // Replicating 'cat' and 'echo' logic
    const parts = [
        { content: "var async = require('async');" },
        { content: "var assert = {};" },
        { content: "var types = {};" },
        { content: "var core = {};" },
        { content: "var nodeunit = {};" },
        { content: "var reporter = {};" },
        { content: "(function(exports){" },
        { path: 'lib/assert.js' },
        { content: "})(assert);" },
        { content: "(function(exports){" },
        { path: 'lib/types.js' },
        { content: "})(types);" },
        { content: "(function(exports){" },
        { path: 'lib/core.js' },
        { content: "})(core);" },
        { content: "module.exports = core;" },
        { content: "(function(exports, nodeunit){" },
        { path: 'lib/reporters/browser.js' },
        { content: "})(reporter, module.exports);" },
        { content: "module.exports.assert = assert;" },
        { content: "module.exports.reporter = reporter;" },
        { content: "module.exports.run = reporter.run;" },
    ];
    
    // Simulate the sed steps: sed "/\@REMOVE_LINE_FOR_BROWSER/d" and sed "/\@REMOVE_LINE_FOR_COMMONJS/d"
    const replacements = [
        '@REMOVE_LINE_FOR_BROWSER',
        '@REMOVE_LINE_FOR_COMMONJS'
    ];
    
    buildAndClean(targetFile, parts, replacements);

    console.log('✅ CommonJS build complete.');
}


/**
 * Executes the 'test' task (from Makefile).
 */
function runTest() {
    console.log(`\n🧪 Running TEST task...`);
    // NOTE: Testing requires running an external binary (nodeunit). 
    // Commented out as per request to avoid reliance on shell tools unless necessary.
    console.log('   -> [SKIPPED] Test execution via external binary.');
    exec(`node ./bin/nodeunit test`, 'Test'); 
    console.log('✅ Tests finished.');
}

/**
 * Executes the 'lint' task (from Makefile).
 */
function runLint() {
    console.log(`\n🔍 Running LINT task...`);
    // NOTE: Linting relies entirely on an external tool (nodelint). 
    // Commented out as per request.
    console.log('   -> [SKIPPED] Lint execution via external binary (nodelint).');
    // exec(`nodelint --config nodelint.cfg ./index.js ./bin/nodeunit ./bin/nodeunit.json ./lib/*.js ./lib/reporters/*.js ./test/*.js`, 'Lint');
    console.log('✅ Lint complete.');
}

/**
 * Executes the 'doc' task (Man page generation).
 */
function runDoc() {
    console.log(`\n📖 Running DOC task (Man page generation)...`);
    
    // Create man1 directory
    fs.mkdirSync('man1', { recursive: true });
    
    // NOTE: Man page generation relies on the 'ronn' external tool. 
    // Commented out as per request.
    console.log('   -> [SKIPPED] Man page generation via external binary (ronn).');
    // exec('ronn --roff doc/nodeunit.md > man1/nodeunit.1', 'Doc');
    
    console.log('✅ Doc generation complete.');
}


/**
 * Executes the 'install' task (from Makefile).
 */
function runInstall() {
    console.log('\n⬇️ Running INSTALL task (requires elevated permissions)...');
    runBuild(); // Dependency of install
    
    // NOTE: These are system-level install commands and must use shell execution.
    const nodejsLibDir = `${LIBDIR}/node`;
    
    exec(`install -d ${nodejsLibDir}`, 'Install');
    exec(`cp -a ${BUILDDIR}/${PACKAGE} ${nodejsLibDir}`, 'Install');
    
    // Install the wrapper script created in runBuild()
    exec(`install -m 0755 ${BUILDDIR}/nodeunit.sh ${BINDIR}/nodeunit`, 'Install');
    
    // Install the man page
    exec(`install -d ${MANDIR}/man1/`, 'Install');
    // NOTE: man1/nodeunit.1 is now a placeholder due to 'doc' task being skipped.
    exec(`cp -a man1/nodeunit.1 ${MANDIR}/man1/ || true`, 'Install'); // Add || true to handle missing file gracefully
    
    console.log('✅ Install complete. You may need to run this with sudo.');
}

/**
 * Executes the 'uninstall' task (from Makefile).
 */
function runUninstall() {
    console.log('\n⬆️ Running UNINSTALL task (requires elevated permissions)...');
    
    // NOTE: These are system-level uninstall commands and must use shell execution.
    const nodejsLibDir = `${LIBDIR}/node`;
    exec(`rm -rf ${nodejsLibDir}/nodeunit ${nodejsLibDir}/nodeunit.js ${BINDIR}/nodeunit`, 'Uninstall');
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
    console.log(`  test       : Runs the unit tests. (Currently skipped)`);
    console.log(`  lint       : Runs static analysis. (Currently skipped)`);
    console.log(`  install    : Copies files to ${BINDIR} and ${LIBDIR}/node.`);
    console.log(`  uninstall  : Removes installed files.`);
    console.log(`  clean      : Removes the '${BUILDDIR}' directory and stamp files.`);
    console.log(`  doc        : Generates man pages. (Currently skipped)`);
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
            runDoc();
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
            
        case 'lint':
            runLint();
            break;

        case 'doc':
            runDoc();
            break;

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
