/**
 * Created by tadapatrisonika on 17/7/17.
 */
// 'use strict';

//------------------------------------------------------------------------------------------
//
// Dependencies
//
//------------------------------------------------------------------------------------------
const fs = require('fs');
const chalk = require('chalk');
const program = require('commander');
const request = require('request');
const http = require('http');
const url = require('url');
const path = require('path');
const util = require('util');

// Module Dependencies (non-npm)
const ProjectCRUD = require('./features/project-CRUD');
const folderCRUD = require('./features/folder-CRUD');
const testCRUD = require('./features/test-CRUD');
const ImportExport = require('./features/import-export');
const getData = require('./features/get-data');

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
		.option('-hg, --height <optional>', 'height of browser');

	//----------------------------
	// Project CRUD Commands
	//----------------------------

	//List the projects
	program
		.command('list-project')
		.alias('list')
		.description('List all projects.')
		.action(ProjectCRUD.getAllProjects);

	//List the folders
	program
		.command('list-folder <projname>')
		.alias('listfolder')
		.description('list all folders')
		.action(folderCRUD.getFolderListHelper);

	// Create Project
	program
		.command('create-project <projname>')
		.alias('cp')
		.description('Create a new project.')
		.action(ProjectCRUD.createProjectHelper);

	// Update Project
	program
		.command('rename-project <projname> <new_projname>')
		.alias('rp')
		.description('Rename a project.')
		.action(ProjectCRUD.updateProjectHelper);

	// Delete Project
	program
		.command('delete-project <projname>')
		.alias('dp')
		.description('Delete a project.')
		.action(ProjectCRUD.deleteProjectHelper);

	//-----------------------------
  // 	Test CRUD Commands
  //-----------------------------

	// Create Test
	program
		.command('create-test <projName> <test_name>')
		.option('-f, --folder <folder>', 'Set the folder name.')
		.alias('ct')
		.description('Create a test.')
		.action(function(projname, test_name, options) {
			let folder_name = options.folder || null;
			if (folder_name == null) {
				testCRUD.createTestHelper(projname, test_name);
			} else {
				testCRUD.createTestUnderFolderHelper(projname, folder_name, test_name);
			}
		});

	// Read Test (Get contents of Test)
	program
		.command('get-test <projname> <test_name>')
		.alias('gt')
		.description('Read a test.')
		.action(testCRUD.readTestHelper);

	// Update Test
	program
		.command('rename-test <projname> <test_name> <new_testname>')
		.alias('rt')
		.description('Rename a test.')
		.action(testCRUD.updateTestHelper);

	// Delete Test
	program
		.command('delete-test <projname> <test_name>')
		.alias('dt')
		.description('Delete a test.')
		.action(testCRUD.deleteTestHelper);

	// Import Test
	program
		.command('import-test <projname> <file_pathname>')
		.option('-f, --folder <folder>', 'Set the folder path.')
		.alias('it')
		.description('Import a test.')
		.action(function(projname, file_pathname, options) {
			let folder_name = options.folder || null;
			if (folder_name == null) {
				ImportExport.importTestHelper(projname, file_pathname);
			} else {
				ImportExport.importTestUnderFolderHelper(projname, folder_name, file_pathname);
			}
		});

	// Export Test
	program
		.command('export-test <projname> <test_name> <directory>')
		.alias('et')
		.description('Export a test.')
		.action(ImportExport.exportTestHelper);


	//----------------------------
	// Folder CRUD Commands
	//----------------------------

	// Create Folder
	program
		.command('create-folder <projname> <folder_name>')
		.option('-f, --folder <folder>', 'Set the folder name')
		.alias('cf')
		.description('Create a folder.')
		.action(function(projname, folder_name, options) {
			let folder  = options.folder || null;
			if(folder == null) {
				folderCRUD.createFolderHelper(projname, folder_name);
			} else {
				folderCRUD.createFolderUnderFolderHelper(projname, folder, folder_name);
			}
		});

	// Update Folder
	program
		.command('rename-folder <projname> <folder_name> <new_folder_name>')
		.alias('rf')
		.description('Rename a folder')
		.action(folderCRUD.updateFolderHelper);

	// Delete Folder
	program
		.command('delete-folder <projname> <folder_name>')
		.alias('df')
		.description('Delete a folder.')
		.action(folderCRUD.deleteFolderHelper);

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
		.option('-d, --data <dataObj>', 'Set the data parameters in an object.')
		.option('-df, --datafile <dataFile>', 'Set the local path for the data file.')
		.description('Run a test from a project.')
		.action(testCRUD.main);

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
