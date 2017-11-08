/**
 * FolderService class that provides functionality for Folder related operations
 * to be performed by the folder
 * @author Shahin (shahin@uilicious.com)
 */


// Chalk messages
const chalk = require('chalk');
const error_warning = chalk.bold.red;
const error = chalk.red;
const success = chalk.green;

const APIUtils = require('../utils/ApiUtils');

class FolderService {

	/**
     * Check for duplicate Folder name
     * @param projectId
     * @param folderName
     * @return {Promise}
     */
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

    /**
     * It will return node id (if found)
     * @param projectId
     * @param folderName
     * @return {Promise}
     */
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

    /**
     * Get a list of folders
     * @param projectID
     * @return {*}
     */
	static folderList(projectID) {
		return APIUtils.webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders",
			{}
			)
            .then(data => {
				return data;
            }

		);
	}

    /**
	 * Create a new folder using projectName
     * @param projectID
     * @param folderName
     * @return {*}
     */
	static createFolder(projectID, folderName) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/folders/addAction",
			{
				name: folderName
			})
            .then(data=> {
			    return data;
			});
	}
}

module.exports = FolderService;
