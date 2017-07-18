const fs = require('fs');
const path = require('path');

const APIUtils = require('./../api-utils');
const ProjectCRUD = require('./project-CRUD');
const folderCRUD = require('./folder-CRUD');

class ImportExport {

  //----------------------------------------------------------------------------
  // Import Utilities
  //----------------------------------------------------------------------------

  //----------------------------------------------------------------------------
  // Export Helper Functions
  //----------------------------------------------------------------------------

  // Export folder and its test scripts
  static exportFolderHelper(projName, folderName, options) {
  	ProjectCRUD.projectID(projName, function(projID) {
  		folderCRUD.nodeID(projID, folderName, function(folderID) {
        ImportExport.exportTestDirectory(projID, folderID, options.directory);
  		});
  	});
  }

  //----------------------------------------------------------------------------
  // Export Core Functions
  //----------------------------------------------------------------------------

  /// Export children(tests) of folder
  ///
  /// @param   Project ID
  /// @param   Folder ID
  /// @param   local system file path, to export tests into
  ///
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
  		console.log("File <" + fileName + "> successfully saved in " + directory);
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
  				console.error("ERROR: This folder <"+ folderName +"> exists.\nPlease use another directory.\n");
  				process.exit(1);
  			}
  		});
  		good(newDirectory);
  		return;
  	}).then(callback);
  }

  /// Get the directory map, using the projectID and folderID
  ///
  /// @param  projectID to export from
  /// @param  folderID to export from
  /// @param  callback to call with result
  ///
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
  			// if( folderID != null ) {
  			// 	good(findSubDirectoryByID(rootDirMap, folderID));
  			// } else {
  			// 	good( rootDirMap );
  			// }
  		});
  	}).then(callback);
  }

  /// Does a recursive search on the parentDir object, and its children
  /// For the target folderID, if not found, returns a null
  ///
  /// @param  parentDir object, an example would be the return from "api/studio/v1/projects/:projid/workspace/directory"
  /// @param  folderID to find, not folder path.
  ///
  /// @return  The directory node, that matches the ID
  static findSubDirectoryByID(parentDir, folderID) {
  	if( parentDir.typeName == "FOLDER" ) {
  		if( parentDir.id == folderID ) {
  			// console.log(parentDir);
  			return parentDir;
  		}
  		// childrenList (children of directory)
  		var childrenList = parentDir.children;
  		for (var i = 0; i < childrenList.length; i++) {
  			var validatedChildNode = ImportExport.findSubDirectoryByID(childrenList[i], folderID);
  			if (validatedChildNode != null) {
  				// return folder
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
