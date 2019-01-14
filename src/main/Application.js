var pkg = require("../../package.json");

/**
 * Application class is handles all the commands in the terminal
 * and call respected controller to respond to the request
 * @author Shahin (shahin@uilicious.com)
 */
// 'use strict';

//------------------------------------------------------------------------------------------
//
// Dependencies
//
//------------------------------------------------------------------------------------------
const program = require('commander');

// Module Dependencies (non-npm)
const TestRunnerController = require('../controller/TestRunnerController');
const ImportExportController = require('../controller/ImportExportController');

//------------------------------------------------------------------------------
//	Main Function
//------------------------------------------------------------------------------

function CLIApp() {

	// Basic CLI parameters handling
	program
		.version(pkg.version || "no specified")
		.option('-u, --user <required>', 'username')
		.option('-p, --pass <required>', 'password')
		.option('-v, --verbose', 'display details log')
		.option('--apiHost <optional>','API host');

    // Import as Folder
    program
        .command('import <projname> <folder_path>')
        .description('Upload test scripts into a project from a local directory.')
        .option('--overwrite', 'Overwrite test script(s)')
		.action(function(projname, folder_path, options) {
        	ImportExportController.importFolderHelper(projname, folder_path, options);
        });

	// Export Test Folder
	program
		.command('export <projname> <directory>')
		.description('Download test scripts to a local target directory.')
		.action(function (projname, directory, options) {
            ImportExportController.exportFolderHelper(projname, directory);
        });

	// -----------------------------
	// 	Commands for running tests
	// -----------------------------
	program
		.command('run <projname> <scriptpath>')
        .option('-br, --browser <optional>', 'browser [chrome/firefox/edge/safari/ie11]')
        .option('-wi, --width <optional>', 'width of browser')
        .option('-ht, --height <optional>', 'height of browser')
		.option('-s, --save <directory>', 'Set the directory path to save test log and images.')
        .option('--dataObject <optional>', 'JSON data object to be supplied into the test script')
        .option('--dataFile <directory>', 'A file contains JSON data object to be supplied into the test script')
        .option('--ngrokPort <optional>', 'Set your localhost port number for ngrok to access it publicly')
        .option('--ngrokParam <optional>', 'Override url param value for DataObject')
        .description('Run a test from a project.')
		.action(TestRunnerController.main);

	//	
	// Unused - Test Run By Git
	//

	// // Run a a test by git
	// program
	// 	.command('run-by-git <proj_name> <commit_hash> <run_file>')
	// 	.option('-br, --browser <optional>', 'browser [Chrome/Firefox]')
	// 	.option('-wi, --width <optional>', 'width of browser')
	// 	.option('-ht, --height <optional>', 'height of browser')
	// 	.option('--dataObject <optional>', 'JSON data object to be supplied into the test script')
	// 	.option('--dataFile <directory>', 'A file contains JSON data object to be supplied into the test script')
	// 	.option('--ngrokPort <optional>', 'Set your localhost port number for ngrok to access it publicly')
	// 	.option('--ngrokParam <optional>', 'Override url param value for DataObject')
	// 	.description('Run a test by git commit.')
	// 	.action(function (projName, commitHash, runFile, options){
	// 		TestRunnerController.runByGit(projName, commitHash, runFile, options);
	// 	});

	// end with parse to parse through the input.txt
	program.parse(process.argv);

	// If program was called with no arguments or invalid arguments, show help.
	if (!program.args.length) {
		// Show help by default
		program.parse([process.argv[0], process.argv[1], '-h']);
		process.exit(0);
	}

    if(program.user==null || program.pass==null){
        console.error("Error: --user or --pass parameter can not leave empty");
        process.exit(1);
    }
	//  else {
	// 	// Warn about invalid commands
	// 	let validCommands = program.commands.map(function(cmd){
	// 		return cmd.name;
	// 	});
	// 	let invalidCommands = program.args.filter(function(cmd){
	// 		// If command is executed, it will be an object and not a string
	// 		return (typeof cmd === 'string' && validCommands.indexOf(cmd) === -1);
	// 	});
	// 	if (invalidCommands.length) {
	// 		console.log('\n [ERROR] - Invalid command: "%s".\n See "--help" for a list of available commands.\n', invalidCommands.join(', '));
	// 	}
	// }
}

module.exports = CLIApp;
