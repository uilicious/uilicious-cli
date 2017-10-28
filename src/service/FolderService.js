/**
* FolderService class that provides functionality for Folder related operations
* to be performed by the folder
* @Author:Shahin (shahin@uilicious.com)
*/


// Chalk messages
const chalk = require('chalk');
const error_warning = chalk.bold.red;
const error = chalk.red;
const success = chalk.green;

const APIUtils = require('../utils/ApiUtils');

class FolderService {

	/// Check for duplicate Folder name
	/// @param	Project ID
	/// @param	Folder Name
	static checkFolder(projectId, folderName) {
		return new Promise(function(good, bad) {
			return FolderService.folderList(projectId)
				.then(list =>{
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
		});
	}

	/// Returns the node ID (if found) , given the project ID and folderName
	/// @param projectID
	/// @param folderName
	static nodeID(projectId, folderName) {
		return new Promise(function(good, bad) {
			return FolderService.folderList(projectId)
                .then(list => {
                    for(let i = 0; i<list.length; ++i) {
                        let item = list[i];
                        if(item.name == folderName) {
                            good(item.id);
                            return;
                        }
                    }
				    console.error(error("ERROR: This folder <" + folderName + "> does not exist!\n"));
				    process.exit(1);
                });
		});
	}

	//------------------------------------------------------------------------------
	//	Folder API Functions
	//------------------------------------------------------------------------------

	/// Get a list of folders
	/// @param  [Optional] Callback to return result, defaults to console.log
	/// @return  Promise object, for result
		static folderList(projectID) {
		return APIUtils.webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders",
			{},
            function (callback) {
				return callback;
            }

		);
	}

	/// Create a new folder using projectName
	/// @param	Project ID from projectID()
	/// @param	Folder Name
	static createFolder(projectID, folderName) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders/addAction",
			{
				name: folderName
			},
			function (data) {
				return data;
            }
		);
	}
}

module.exports = FolderService;
