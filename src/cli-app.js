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

// Chalk messages
const error_warning = chalk.bold.red;
const success_warning = chalk.bold.green;
const error = chalk.red;
const success = chalk.green;

const CLIUtils = require("./cli-utils");
const APIUtils = require("./api-utils");
const ProjectCRUD = require('./features/project-CRUD');
const folderCRUD = require('./features/folder-CRUD');
const testCRUD = require('./features/test-CRUD');
//const ImportExport = require('./features/ImportExport');


//------------------------------------------------------------------------------------------
//
// API request handling
//
//------------------------------------------------------------------------------------------

/// Get the directory of a project
///
/// @param  [Optional] Callback to return result, defaults to console.log
///
/// @return  Promise object, for result
function directoryList(projectID, callback) {
	return new Promise(function(good, bad) {
		APIUtils.webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/directory",
			{},
			function(project) {
				good(project.children);
				return;
			}
		);
	}).then(callback);
}

// Export a test
// @param directory to export test
// @param test_name (name of test)
function exportTestFile(directory, test_name, file_content) {
	let filePathName = path.resolve(directory) + "/" + test_name + ".js";
	let fileName = test_name + ".js";
	fs.writeFile(filePathName, file_content, function(err) {
		if (err) {
			throw err;
		}
		console.log("File <" + fileName + "> successfully saved in " + directory);
	});
}

/// Export children(tests) of folder
///
/// @param   Project ID
/// @param   Folder ID
/// @param   local system file path, to export tests into
///
function exportTestDirectory(projID, folderID, directory, callback) {
	return new Promise(function(good, bad) {
		getDirectoryMapByID(projID, folderID, function(dirNode) {
			if( dirNode ) {
				exportDirectoryNodeToDirectoryPath(projID, dirNode, directory);
				good(true);
			} else {
				bad(false);
			}
		});
	}).then(callback);
}

/// Recursively scans the directory node, and export the folders / files when needed
///
/// @param  The directory node to use
/// @param  local directory path to export into
function exportDirectoryNodeToDirectoryPath(projID, dirNode, localDirPath) {
	if( dirNode == null ) {
		return;
	}
	if (dirNode.typeName == "FOLDER") {
		// makeSureDirectoryExists(localDirPath);
		makeFolder(dirNode.name, localDirPath);
		var nextPath = localDirPath+"/"+dirNode.name;
		let folder_children = dirNode.children;
		for (var i = 0; i < folder_children.length; i++) {
			let folder_child = folder_children[i];
			exportDirectoryNodeToDirectoryPath(projID, folder_child, nextPath);
		}
	} else if (dirNode.typeName == "TEST") {
		testCRUD.getScript(projID, dirNode.id, function(fileContent) {
			exportTestFile(localDirPath, dirNode.name, fileContent);
		});
	}
}

/// Does a recursive search on the parentDir object, and its children
/// For the target folderID, if not found, returns a null
///
/// @param  parentDir object, an example would be the return from "api/studio/v1/projects/:projid/workspace/directory"
/// @param  folderID to find, not folder path.
///
/// @return  The directory node, that matches the ID
function findSubDirectoryByID(parentDir, folderID) {
	if( parentDir.typeName == "FOLDER" ) {
		if( parentDir.id == folderID ) {
			// console.log(parentDir);
			return parentDir;
		}
		// childrenList (children of directory)
		var childrenList = parentDir.children;
		for (var i = 0; i < childrenList.length; i++) {
			var validatedChildNode = findSubDirectoryByID(childrenList[i], folderID);
			if (validatedChildNode != null) {
				// return folder
				return validatedChildNode;
			}
		}
	}
	return null;
}

/// Does a recursive search on the parentDir object, and its children
/// For the target folderID, if not found, returns a null
///
/// @param  parentDir object, an example would be the return from "api/studio/v1/projects/:projid/workspace/directory"
/// @param  folderID to find, not folder path.
///
/// @return  The directory node, that matches the ID
// function findSubDirectoryByPath(parentDir, fullPath) {
// 	if( parentDir.typeName == "FOLDER" ) {
// 		if( parentDir.path == fullPath ) {
// 			return parentDir;
// 		}
//
// 		var childrenList = parentDir.children;
// 		for( var i = 0; i < childrenList.length; ++i ) {
// 			var validatedChildNode = findSubDirectoryByPath( childrenList[i], fullPath );
// 			if( validatedChildNode != null ) {
// 				return validatedChildNode;
// 			}
// 		}
// 	}
// 	return null;
// }

/// Get the directory map, using the projectID and folderID
///
/// @param  projectID to export from
/// @param  folderID to export from
/// @param  callback to call with result
///
/// @return  Promise object that returns the directory map
function getDirectoryMapByID(projID, folderID, callback) {
	return new Promise(function(good, bad) {
		directoryList(projID, function(rootDirMap) {
			for (var i = 0; i < rootDirMap.length; i++) {
				let root_folder = rootDirMap[i];
				if (root_folder.id == folderID) {
					if( folderID != null ) {
						good(findSubDirectoryByID(root_folder, folderID));
					}
				}
			}
			// if( folderID != null ) {
			// 	good(findSubDirectoryByID(rootDirMap, folderID));
			// } else {
			// 	good( rootDirMap );
			// }
		});
	}).then(callback);
}

/// Get the directory map, using the projectID and folderID
///
/// @param  projectID to export from
/// @param  folderPath to export from
/// @param  callback to call with result
///
/// @return  Promise object that returns the directory map
// function getDirectoryMapByPath(projID, folderPath, callback) {
// 	return new Promise(function(good,bad) {
// 		directoryList(projID, function(rootDirMap) {
// 			if( folderPath != null ) {
// 				good(findSubDirectoryByPath(rootDirMap, folderPath));
// 			} else {
// 				good( rootDirMap );
// 			}
// 		});
// 	}).then(callback);
// }

// Get children of folder
// function getChildren(projID, folderID, directory, callback) {
// 	return new Promise(function(good, bad) {
// 		// Get children of project
// 		directoryList(projID, function(project_children) {
// 			for (var i = 0; i < project_children.length; i++) {
// 				let project_child = project_children[i];
// 				if (project_child.id == folderID) {
// 					let main_folder = project_child.children;
// 					for (var i = 0; i < main_folder.length; i++) {
// 						let child = main_folder[i];
// 						// Export test
// 						if (child.typeName == 'TEST') {
// 							// console.log(child.name);
// 							getScript(projID, child.id, function(fileContent) {
// 								exportTestFile(directory, child.name, fileContent);
// 							});
// 						}
//
// 						// Export folder
// 						if (child.typeName == 'FOLDER') {
// 							makeFolder(child.name, directory, function(new_directory) {
// 								exportTestDirectory(projID, child.id, new_directory);
// 							});
// 						}
// 					}
// 				}
// 			}
// 		});
// 	}).then(callback);
// }

// Find children if type is folder
// function findChildren(parent) {
// 	return new Promise(function(good, bad) {
// 		if (parent.children != null) {
// 			let children = parent.children;
// 			for (var i = 0; i < children.length; i++) {
// 				let child = children[i];
// 			}
// 		}
// 		return;
// 	}).then(callback);
// }

//------------------------------------------------------------------------------
//	Folder & Test Functions
//------------------------------------------------------------------------------



/// Create a new test using projectName
/// @param	Project ID from projectID()
function importTest(projectID, testName, testContent, callback) {
	return APIUtils.webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/" + projectID + "/workspace/tests/addAction",
		{
			name: testName,
			script: testContent
		},
		callback
	);
}

// Create a new test by importing it under a folder in a project
//@param Project ID from projectID()
//@param nodeID from nodeID()
function importTestUnderFolder(projectID, nodeID, testName, testContent, callback) {
	return APIUtils.webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/" + projectID + "/workspace/tests/addAction",
		{
			name: testName,
			parentId: nodeID,
			script: testContent
		},
		callback
	);
}

//------------------------------------------------------------------------------
//	Main Functions
//------------------------------------------------------------------------------

// Read file contents
// @param   File Pathname
function readFileContents(file_pathname, callback) {
	return new Promise(function(good, bad) {
		let fileLocation = path.resolve(file_pathname);
		let fileContent = fs.readFileSync(fileLocation, 'utf-8');
		if (fileContent != null) {
			good(fileContent);
		} else {
			console.error("ERROR: There is nothing in this file!\n");
			process.exit(1);
		}
	}).then(callback);
}

// Import folder contents
function importFolderContents(projname, foldername, folder_pathname, callback) {
	return new Promise(function(good, bad) {
		let folderLocation = path.resolve(folder_pathname);
		let folderContents = fs.readdir(folder_pathname, function(err, files) {
			for (var i = 0; i < files.length; i++) {
				let file = files[i];
				let fileName = path.parse(file).name;
				let fileLocation = folderLocation + "/" + file;
				importTestUnderFolderHelper(projname, foldername, fileLocation);
			}
		})
	}).then(callback);
}

// Check path and return path location if valid
function checkPath(path_name, callback) {
	return new Promise(function(good, bad) {
		let pathLocation = path.resolve(path_name);
		let folderName = path.basename(path_name);
		if (!fs.existsSync(pathLocation)) {
			console.error("This path does not exist!\n");
			process.exit(1);
		} else {
			good(pathLocation);
			return;
		}
	}).then(callback);
}

// Check folder contents and return folder name if folder is not empty
function checkFolderContents(folder_pathname, callback) {
	return new Promise(function(good, bad) {
		let folderName = path.basename(folder_pathname);
		let folderContents = fs.readdir(folder_pathname, function(err, files) {
			if (err || files.length == 0) {
				console.error("This folder is empty!\n");
				process.exit(1);
			} else {
				good(folderName);
				return;
			}
		})
	}).then(callback);
}



// Make folder for export
function makeFolder(folderName, directory, callback) {
	return new Promise(function(good, bad) {
		let newDirectory = directory + "/" + folderName;
		fs.mkdir(newDirectory, function(err) {
			if (err === 'EEXIST') {
				console.error("ERROR: This folder <"+ folderName +"> exists.\nPlease use another directory.\n");
				process.exit(1);
			}
		});
		good(newDirectory);
		return;
	}).then(callback);
}

//------------------------------------------------------------------------------
//	Test Helper Functions
//------------------------------------------------------------------------------

// Import test script
// @param		Project Name
// @param		Test Name
// @param		File Path Name
function importTestHelper(projname, file_pathname, options) {
	readFileContents(file_pathname, function(file_content) {
		ProjectCRUD.projectID(projname, function(projID) {
			testCRUD.checkTest(projID, file_pathname, function(testname) {
				importTest(projID, testname, file_content, function(res) {
					console.log(success("Import successful!\nNew test '"+testname+"' created in Project '"+projname+"'\n"));
				});
			});
		});
	});
}

// Import test script under a folder
// @param Project Name
// @param folder Name
// @param File Path Name
function importTestUnderFolderHelper(projname, foldername, file_pathname, options) {
	readFileContents(file_pathname, function(file_content) {
		ProjectCRUD.projectID(projname, function(projID) {
			folderCRUD.nodeID(projID, foldername, function(nodeId) {
				testCRUD.checkTest(projID, file_pathname, function(testname) {
					importTestUnderFolder(projID, nodeId, testname, file_content, function(res) {
						console.log(success("Import successful!\nNew test '"+testname+"' created under Folder '"+foldername+"' under Project '"+projname+"'.\n"));
					});
				});
			});
		});
	});
}

function exportTestHelper(projname, testname, options) {
	ProjectCRUD.projectID(projname, function(projID) {
		testCRUD.testID(projID, testname, function(testID) {
			testCRUD.getScript(projID, testID, function(fileContent) {
				exportTestFile(options.directory, testname, fileContent);
			});
		});
	});
}

//------------------------------------------------------------------------------
//	Folder Helper Functions
//------------------------------------------------------------------------------

// Import folder and its contents
function importFolderHelper(projName, folderPath, options) {
	checkPath(folderPath, function(folder_pathname) {
		checkFolderContents(folder_pathname, function(folder_name) {
			ProjectCRUD.projectID(projName, function(projID) {
				folderCRUD.checkFolder(projID, folder_name, function(folder_name) {
					folderCRUD.createFolder(projID, folder_name, function(res) {
						importFolderContents(projName, folder_name, folder_pathname, function(res) {
							console.log("");
						});
					});
				});
			});
		});
	});
}

//Import folder under another folder that is present in the project along with its contents
function importFolderUnderFolderHelper(projName, folderPath, folderName, options) {
	checkPath(folderPath, function(folder_pathname) {
		checkFolderContents(folder_pathname, function(folder_name) {
			ProjectCRUD.projectID(projName, function(projID) {
				folderCRUD.nodeID(projID, folderName, function(nodeId) {
					folderCRUD.checkFolder(projID, folder_name, function(folder_name) {
						folderCRUD.createFolderUnderFolder(projID, nodeId, folder_name, function(res) {
							importFolderContents(projName, folder_name, folder_pathname, function(res) {
								console.log("");
							});
						});
					});
				});
			});
		});
	});
}

// Export folder and its test scripts
// @todo Call api /directory to find parent's folders and tests
// function exportFolderHelper(projName, folderName, options) {
// 	projectID(projName, function(projID) {
// 		nodeID(projID, folderName, function(folderID) {
// 			makeFolder(folderName, options, function(new_directory) {
// 				exportTestDirectory(projID, folderID, new_directory);
// 			});
// 		});
// 	});
// }
function exportFolderHelper(projName, folderName, options) {
	ProjectCRUD.projectID(projName, function(projID) {
		folderCRUD.nodeID(projID, folderName, function(folderID) {
			getDirectoryMapByID(projID, folderID, function(rootDirMap) {
				exportDirectoryNodeToDirectoryPath(projID, rootDirMap, options.directory);
			});
		});
	});
}



function CLIApp() {

	// const importExportSetup = require("./features/import-export-commands");
	// importExportSetup(program);


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
	// Project Commands
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

	// -----------------------------
    // 	Commands for Test CRUD
    // -----------------------------

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
				importTestHelper(projname, file_pathname);
			} else {
				importTestUnderFolderHelper(projname, folder_name, file_pathname);
			}
		});

// Export Test
	program
		.command('export-test <projname> <test_name>')
		.option('-d, --directory <directory>', 'Set the directory path.')
		.alias('et')
		.description('Export a test.')
		.action(function(projname, test_name, options) {
			let directory = options.directory || null;
			if (directory == null) {
				console.error(error_warning("The directory option is required!\nPlease use -d <directory> to set the directory path!\n"));
				process.exit(1);
			} else {
				exportTestHelper(projname, test_name, options);
			}
		});


		//----------------------------
		// Folder Commands
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
				importFolderHelper(projname, folder_path);
			} else {
				importFolderUnderFolderHelper(projname, folder_path, foldername);
			}
		});

	// Export Folder
	program
		.command('export-folder <projname> <folder_name>')
		.option('-d, --directory <directory>', 'Set the directory path.')
		.alias('ef')
		.description('Export a folder.')
		.action(function(projname, folder_name, options) {
			let directory = options.directory || null;
			if (directory == null) {
				console.error("The directory option is required!\nPlease use -d <directory> to set the directory path!\n");
				process.exit(1);
			} else {
				exportFolderHelper(projname, folder_name, options);
			}
		});

	// -----------------------------
	// 	Commands for running tests
	// -----------------------------
	program
		.command('run <projname> <scriptpath>')
		.option('-d, --directory <directory>', 'Set the directory path.')
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
