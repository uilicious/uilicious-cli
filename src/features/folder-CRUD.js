/*
* folderCRUD class that provides functionality for CRUD operations
* to be performed by the folder
*/


// Chalk messages
const chalk = require('chalk');
const error_warning = chalk.bold.red;
const error = chalk.red;
const success = chalk.green;

const APIUtils = require('./../api-utils');
const ProjectCRUD = require('./project-CRUD');

class folderCRUD {

	//------------------------------------------------------------------------------
	//	Folder Helper Functions
	//------------------------------------------------------------------------------

	// Create folder
	// @param		Project Name
	// @param		Folder Name
	static createFolderHelper(projName, folderName, options) {
		ProjectCRUD.projectID(projName, function(projID) {
			folderCRUD.checkFolder(projID, folderName, function(res) {
				folderCRUD.createFolder(projID, folderName, function(res) {
					console.log(success("New folder '" + folderName + "' created in Project '" + projName + "'.\n"));
				});
			});
		});
	}

	// Create folder under a folder
	// @param Project Name
	// @param FolderName
	// @param creating Folder Name
	static createFolderUnderFolderHelper(projname, foldername, creatingfoldername) {
		ProjectCRUD.projectID(projname, function(projID) {
			folderCRUD.nodeID(projID, foldername, function(nodeId) {
				folderCRUD.checkFolder(projID, creatingfoldername, function(res) {
					folderCRUD.createFolderUnderFolder(projID, nodeId, creatingfoldername, function(res) {
						console.log(success("New folder '" + creatingfoldername + "' created under Folder '" + foldername + "' under Project '" + projname + "'.\n"));
					});
				});
			});
		});
	}

	// Get folder List under the project
	// @param Project Name
	static getFolderListHelper(projectName, options) {
		ProjectCRUD.projectID(projectName, function(projectId) {
			folderCRUD.folders(projectId, function(list) {
				console.log(list);
			});
		});
	}

	// Update test script
	// @param		Project Name
	// @param		Test Name
	// @param		New Test Name
	static updateFolderHelper(projName, folderName, new_folderName, options) {
		ProjectCRUD.projectID(projName, function(projID) {
			folderCRUD.folderID(projID, folderName, function(nodeID) {
				folderCRUD.checkFolder(projID, new_folderName, function(res) {
					folderCRUD.updateTestFolder(projID, nodeID, new_folderName, function(res) {
						console.log(success("Folder '" + folderName + "' from Project '" + projName + "' renamed to '" + new_folderName + "'.\n"));
					});
				});
			});
		});
	}

	// Delete folder
	// @param		Project Name
	// @param		Folder Name
	static deleteFolderHelper(projName, folderName, options) {
		ProjectCRUD.projectID(projName, function(projID) {
			folderCRUD.folderID(projID, folderName, function(nodeID) {
				folderCRUD.deleteTestFolder(projID, nodeID, function(res) {
					console.log(error_warning("Folder '" + folderName + "' deleted from Project '" + projName + "'.\n"));
				});
			});
		});
	}

	//------------------------------------------------------------------------------
	//	Folder Core Functions
	//------------------------------------------------------------------------------

	// List all the folders
	// silently terminates , with an error message if no project is present
	static folders(projectId, callback) {
		return new Promise(function(good,bad) {
			folderCRUD.folderList(projectId, function(list) {
				if(list != null) {
					for(let i = 0; i < list.length; i++) {
						let item = list[i];
						console.log(" * " + item.name);
					}
					console.log("");
				} else {
					console.error(error("ERROR: No folder is present.\n"));
					process.exit(1);
				}
			});
		}).then(callback);
	}

	/// Check for duplicate Folder name
	/// @param	Project ID
	/// @param	Folder Name
	static checkFolder(projID, folderName, callback) {
		return new Promise(function(good, bad) {
			folderCRUD.folderList(projID, function(list) {
				for (let i = 0; i < list.length; i++) {
					let folder = list[i];
					if (folder.name == folderName) {
						console.error(error("ERROR: This folder '" + folderName + "' exists.\nPlease use another name!\n"));
						process.exit(1);
					}
				}
				good(folderName);
				return;
			});
		}).then(callback);
	}

	/// Returns the node ID (if found) , given the project ID and folderName
	/// @param projectID
	/// @param folderName
	/// @param [optional] callback to return the result
	/// @return promise object , for result
	static nodeID(projectId, folderName, callback) {
		return new Promise(function(good, bad) {
			folderCRUD.folderList(projectId, function(list) {
				for(let i = 0; i<list.length; ++i) {
					let item = list[i];
					if(item.name == folderName) {
						good(parseInt(item.id));
						return;
					}
				}
				console.error(error("ERROR: This folder <" + folderName + "> does not exist!\n"));
				process.exit(1);
			});
		}).then(callback);
	}

	//------------------------------------------------------------------------------
	//	Folder API Functions
	//------------------------------------------------------------------------------

	/// Get a list of folders
	/// @param  [Optional] Callback to return result, defaults to console.log
	/// @return  Promise object, for result
		static folderList(projectID, callback) {
		return APIUtils.webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders",
			{},
			callback
		);
	}

	/// Create a new folder using projectName
	/// @param	Project ID from projectID()
	static createFolder(projectID, folderName, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders/addAction",
			{
				name: folderName
			},
			callback
		);
	}

	/// Create a new folder under another folder under the project using the nodeID and the projectName
	/// @param projectID
	/// @param nodeID
	static createFolderUnderFolder(projectID, nodeID, creatingfoldername, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders/addAction",
			{
				name: creatingfoldername,
				parentId: nodeID
			},
			callback
		);
	}

	/// Update a test/folder
	/// @param	Project ID from projectID()
	/// @param	Node ID from testID() or folderID()
	/// @param  [Optional] Callback to return result
	static updateTestFolder(projectID, nodeID, new_Name, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/nodes/" + nodeID + "/renameAction",
			{
				name: new_Name
			},
			callback
		);
	}

	/// Delete a test/folder
	/// @param	Project ID from projectID()
	/// @param	Node ID from testID() of folderID()
	/// @param  [Optional] Callback to return result
	static deleteTestFolder(projectID, nodeID, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/nodes/" + nodeID + "/deleteAction",
			{},
			callback
		);
	}

	/// Returns the folder ID (if found), given the project ID AND folder name
	/// Also can be used to return node ID for folder
	/// @param  Project ID
	/// @param  Folder Name
	/// @param  [Optional] Callback to return result
	/// @return  Promise object, for result
	static folderID(projID, folderName, callback) {
		return new Promise(function(good, bad) {
			APIUtils.webstudioJsonRequest(
				"GET",
				"/api/studio/v1/projects/" + projID + "/workspace/folders",
				{ name : folderName },
				function(folders) {
					for (var i = 0; i < folders.length; i++) {
						let folder = folders[i];
						if (folder.name == folderName) {
							good(parseInt(folder.id));
							return;
						}
					}
					console.error(error("ERROR: Unable to find folder: '" + folderName + "'\n"));
					process.exit(1);
				}
			);
		}).then(callback);
	}

}

module.exports = folderCRUD;
