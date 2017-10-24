/**
 * Created by tadapatrisonika on 17/7/17.
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
const ImportExport = require('../controller/ImportExportController');

//------------------------------------------------------------------------------
//	Main Function
//------------------------------------------------------------------------------

function CLIApp() {

	// Basic CLI parameters handling
	program
		.version('1.3.12')
		.option('-u, --user <required>', 'username')
		.option('-p, --pass <required>', 'password')
		// .option('-d, --directory <optional>', 'Output directory path to use')
		.option('-b, --browser <optional>', 'browser [Chrome/Firefox]')
		.option('-w, --width <optional>', 'width of browser')
		.option('-h, --height <optional>', 'height of browser');

	// Import Test
	program
		.command('import-test <projname> <file_pathname>')
		.option('-f, --folder <folder>', 'Set the folder path to save to.')
		.alias('it')
		.description('Import a test.')
		.action(function(projname, file_pathname, options) {
			let folder_name = options.folder || null;
			if (folder_name == null) {
				ImportExport.importTestHelper(projname, file_pathname);
			} else {
				ImportExport.importTestUnderFolderHelper(projname, file_pathname, folder_name);
			}
		});

	// Export Test
	program
		.command('export-test <projname> <test_name> <directory>')
		.alias('et')
		.description('Export a test.')
		.action(ImportExport.exportTestHelper);

	// Import Folder
	program
		.command('import-folder <projname> <folder_path>')
		.option('-f, --folder <folder>', 'Set the folder.')
		.alias('if')
		.description('Import a folder.')
		.action(function(projname, folder_path, options) {
			let foldername = options.folder || null;
			if(foldername == null) {
				ImportExport.importFolderHelper(projname, folder_path);
			} else {
				ImportExport.importFolderUnderFolderHelper(projname, folder_path, foldername);
			}
		});

	// Export Folder
	program
		.command('export-folder <projname> <folder_name> <directory>')
		.alias('ef')
		.description('Export a folder.')
		.action(ImportExport.exportFolderHelper);

	// -----------------------------
	// 	Commands for running tests
	// -----------------------------
	program
		.command('run <projname> <scriptpath>')
		.option('-s, --save <directory>', 'Set the directory path to save test log.')
		.option('--data <dataObj>', 'Set the data parameters in an object.')
		.option('--datafile <dataFile>', 'Set the local path for the data file.')
		.description('Run a test from a project.')
		.action(TestRunnerController.main);

	// end with parse to parse through the input.txt
	program.parse(process.argv);

	// If program was called with no arguments or invalid arguments, show help.
	if (!program.args.length) {
		// Show help by default
		program.parse([process.argv[0], process.argv[1], '-h']);
		process.exit(0);
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
