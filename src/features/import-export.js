/*
* ImportExport class that provides functionality for import/export operations
* to be performed
*/

// npm Dependencies
const fs = require('fs');
const path = require('path');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('./../api-utils');
const ProjectCRUD = require('./project-CRUD');
const folderCRUD = require('./folder-CRUD');
const testCRUD = require('./test-CRUD');

class ImportExport {

  //----------------------------------------------------------------------------
  // Import Helper Functions
  //----------------------------------------------------------------------------

  // Import test script
  // @param		Project Name
  // @param		Test Name
  // @param		File Path Name
  static importTestHelper(projname, file_pathname, options) {
  	ImportExport.readFileContents(file_pathname, function(file_content) {
  		ProjectCRUD.projectID(projname, function(projID) {
  			ImportExport.checkTest(projID, file_pathname, function(testname) {
  				ImportExport.importTest(projID, testname, file_content, function(res) {
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
  static importTestUnderFolderHelper(projname, file_pathname, foldername, options) {
  	ImportExport.readFileContents(file_pathname, function(file_content) {
  		ProjectCRUD.projectID(projname, function(projID) {
  			folderCRUD.nodeID(projID, foldername, function(nodeId) {
  				ImportExport.checkTest(projID, file_pathname, function(testname) {
  					ImportExport.importTestUnderFolder(projID, nodeId, testname, file_content, function(res) {
  						console.log(success("Import successful!\nNew test '"+testname+"' created under Folder '"+foldername+"' under Project '"+projname+"'.\n"));
  					});
  				});
  			});
  		});
  	});
  }

  // Import folder and its contents
  static importFolderHelper(projName, folderPath, options) {
  	ImportExport.checkPath(folderPath, function(folder_pathname) {
  		ImportExport.checkFolderContents(folder_pathname, function(folder_name) {
  			ProjectCRUD.projectID(projName, function(projID) {
  				folderCRUD.checkFolder(projID, folder_name, function(folder_name) {
  					folderCRUD.createFolder(projID, folder_name, function(res) {
  						ImportExport.importFolderContents(projName, folder_name, folder_pathname, function(res) {
  							console.log("");
  						});
  					});
  				});
  			});
  		});
  	});
  }

  //Import folder under another folder that is present in the project along with its contents
  static importFolderUnderFolderHelper(projName, folderPath, folderName, options) {
  	ImportExport.checkPath(folderPath, function(folder_pathname) {
  		ImportExport.checkFolderContents(folder_pathname, function(folder_name) {
  			ProjectCRUD.projectID(projName, function(projID) {
  				folderCRUD.nodeID(projID, folderName, function(nodeId) {
  					folderCRUD.checkFolder(projID, folder_name, function(folder_name) {
  						folderCRUD.createFolderUnderFolder(projID, nodeId, folder_name, function(res) {
  							ImportExport.importFolderContents(projName, folder_name, folder_pathname, function(res) {
  								console.log("");
  							});
  						});
  					});
  				});
  			});
  		});
  	});
  }

  //----------------------------------------------------------------------------
  // Import Core Functions
  //----------------------------------------------------------------------------

  // Read contents from file in local directory
  // @param   File Pathname
  // @return  Promise object that returns the contents from file in local directory
  static readFileContents(file_pathname, callback) {
  	return new Promise(function(good, bad) {
  		let fileLocation = path.resolve(file_pathname);
  		let fileContent = fs.readFileSync(fileLocation, 'utf-8');
      if (fileLocation.indexOf(fileContent) > -1) {
        console.error(error("ERROR: There is nothing in this file!\n"));
  			process.exit(1);
      } else {
        good(fileContent);
      }
  	}).then(callback);
  }

  // Check path and return path location if valid
  // @param   Path Name
  // @return  Promise object that returns the path location
  static checkPath(path_name, callback) {
  	return new Promise(function(good, bad) {
  		let pathLocation = path.resolve(path_name);
  		let folderName = path.basename(path_name);
  		if (!fs.existsSync(pathLocation)) {
  			console.error(error("ERROR: This path does not exist!\n"));
  			process.exit(1);
  		} else {
  			good(pathLocation);
  			return;
  		}
  	}).then(callback);
  }

  /// Check for duplicate Test name
	/// @param	Project ID
	/// @param	Test Name
	static checkTest(projID, filePathname, callback) {
		return new Promise(function(good, bad) {
			let testName = path.parse(filePathname).name;
			APIUtils.webstudioJsonRequest(
				"GET",
				"/api/studio/v1/projects/" + projID + "/workspace/tests",
				{ name: testName },
				function (list) {
					for (let i = 0; i < list.length; i++) {
						let item = list[i];
						if (item.name == testName) {
							console.error(error("ERROR: This test '" + testName + "' exists.\nPlease use another name!\n"));
							process.exit(1);
						}
					}
					good(testName);
				}
			);
		}).then(callback);
	}

  // Check folder contents and return folder name if folder is not empty
  // @param   Folder Path Name
  // @return  Promise object that returns name of folder
  static checkFolderContents(folder_pathname, callback) {
  	return new Promise(function(good, bad) {
  		let folderName = path.basename(folder_pathname);
  		let folderContents = fs.readdir(folder_pathname, function(err, files) {
  			if (err || files.length == 0) {
  				console.error(error("ERROR: This folder is empty!\n"));
  				process.exit(1);
  			} else {
  				good(folderName);
  				return;
  			}
  		})
  	}).then(callback);
  }

  // Import folder contents
  static importFolderContents(projname, foldername, folder_pathname, callback) {
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

  //----------------------------------------------------------------------------
  // Import API Functions
  //----------------------------------------------------------------------------

  /// Create a new test using projectName
  /// @param	Project ID from projectID()
  static importTest(projectID, testName, testContent, callback) {
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
  // @param Project ID from projectID()
  // @param nodeID from nodeID()
  static importTestUnderFolder(projectID, nodeID, testName, testContent, callback) {
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

  //----------------------------------------------------------------------------
  // Export Helper Functions
  //----------------------------------------------------------------------------

  static exportTestHelper(projname, testname, directory) {
  	ProjectCRUD.projectID(projname, function(projID) {
  		testCRUD.testID(projID, testname, function(testID) {
  			ImportExport.getScript(projID, testID, function(fileContent) {
  				ImportExport.exportTestFile(directory, testname, fileContent);
  			});
  		});
  	});
  }

  // Export folder and its test scripts
  static exportFolderHelper(projName, folderName, directory) {
  	ProjectCRUD.projectID(projName, function(projID) {
  		folderCRUD.nodeID(projID, folderName, function(folderID) {
        ImportExport.exportTestDirectory(projID, folderID, directory);
  		});
  	});
  }

  //----------------------------------------------------------------------------
  // Export Core Functions
  //----------------------------------------------------------------------------

  /// Export children(tests) of folder
  /// @param   Project ID
  /// @param   Folder ID
  /// @param   local system file path, to export tests into
  static exportTestDirectory(projID, folderID, directory, callback) {
  	return new Promise(function(good, bad) {
  		ImportExport.getDirectoryMapByID(projID, folderID, function(dirNode) {
  			if (dirNode) {
  				ImportExport.exportDirectoryNodeToDirectoryPath(projID, dirNode, directory);
  				good(true);
  			} else {
  				bad(false);
  			}
  		});
  	}).then(callback);
  }

  /// Recursively scans the directory node, and export the folders / files when needed
  /// @param  The directory node to use
  /// @param  local directory path to export into
  static exportDirectoryNodeToDirectoryPath(projID, dirNode, localDirPath) {
  	if( dirNode == null ) {
  		return;
  	}
  	if (dirNode.typeName == "FOLDER") {
  		// makeSureDirectoryExists(localDirPath);
  		ImportExport.makeFolder(dirNode.name, localDirPath);
  		var nextPath = localDirPath + "/" + dirNode.name;
  		let folder_children = dirNode.children;
  		for (var i = 0; i < folder_children.length; i++) {
  			let folder_child = folder_children[i];
  			ImportExport.exportDirectoryNodeToDirectoryPath(projID, folder_child, nextPath);
  		}
  	} else if (dirNode.typeName == "TEST") {
  		ImportExport.getScript(projID, dirNode.id, function(fileContent) {
  			ImportExport.exportTestFile(localDirPath, dirNode.name, fileContent);
  		});
  	}
  }

  // Export a test
  // @param   directory to export test
  // @param   test_name (name of test)
  static exportTestFile(directory, test_name, file_content) {
  	let filePathName = path.resolve(directory) + "/" + test_name + ".js";
  	let fileName = test_name + ".js";
  	fs.writeFile(filePathName, file_content, function(err) {
  		if (err) {
  			throw err;
  		}
  		console.log(success("File <" + fileName + "> successfully saved in " + directory));
  	});
  }

  // Make folder in local directory for export
  // @param   folderName (name of folder)
  // @param   directory (path of local directory) to export
  static makeFolder(folderName, directory, callback) {
  	return new Promise(function(good, bad) {
  		let newDirectory = directory + "/" + folderName;
  		fs.mkdir(newDirectory, function(err) {
  			if (err === 'EEXIST') {
  				console.error(error("ERROR: This folder <"+ folderName +"> exists.\nPlease use another directory.\n"));
  				process.exit(1);
  			}
  		});
  		good(newDirectory);
  		return;
  	}).then(callback);
  }

  /// Get the directory map, using the projectID and folderID
  /// @param  projectID to export from
  /// @param  folderID to export from
  /// @param  callback to call with result
  /// @return  Promise object that returns the directory map
  static getDirectoryMapByID(projID, folderID, callback) {
  	return new Promise(function(good, bad) {
  		ImportExport.directoryList(projID, function(rootDirMap) {
  			for (var i = 0; i < rootDirMap.length; i++) {
  				let root_folder = rootDirMap[i];
  				if (root_folder.id == folderID) {
  					if (folderID != null) {
  						good(ImportExport.findSubDirectoryByID(root_folder, folderID));
  					} else {
  						good(rootDirMap);
  					}
  				}
  			}
  		});
  	}).then(callback);
  }

  /// Does a recursive search on the parentDir object, and its children
  /// For the target folderID, if not found, returns a null
  /// @param  parentDir object, an example would be the return from "api/studio/v1/projects/:projid/workspace/directory"
  /// @param  folderID to find, not folder path.
  /// @return  The directory node, that matches the ID
  static findSubDirectoryByID(parentDir, folderID) {
  	if( parentDir.typeName == "FOLDER" ) {
  		if( parentDir.id == folderID ) {
  			return parentDir;
  		}
  		// @childrenList (children of directory)
  		var childrenList = parentDir.children;
  		for (var i = 0; i < childrenList.length; i++) {
  			var validatedChildNode = ImportExport.findSubDirectoryByID(childrenList[i], folderID);
  			if (validatedChildNode != null) {
  				// @return folder
  				return validatedChildNode;
  			}
  		}
  	}
  	return null;
  }

  //----------------------------------------------------------------------------
  // Export API Functions
  //----------------------------------------------------------------------------

  // Get content of script from a test
  // @param   Project ID
  // @param   Test ID
  static getScript(projectID, testID, callback) {
  	return new Promise(function(good, bad) {
  		APIUtils.webstudioRawRequest(
  			"GET",
  			"/api/studio/v1/projects/" + projectID + "/workspace/tests/" + testID + "/script",
  			{},
  			function(res) {
  				good(res);
  			}
  		);
  	}).then(callback);
  }

  /// Get the directory of a project
  /// @param  [Optional] Callback to return result, defaults to console.log
  /// @return  Promise object, for result
  static directoryList(projectID, callback) {
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

}

module.exports = ImportExport;
