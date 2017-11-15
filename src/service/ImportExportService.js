/**
* ImportExportService class that provides functionality for import/export operations
* to be performed
* @author Shahin (shahin@uilicious.com)
*/

// npm Dependencies
const fs = require('fs');
const path = require('path');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');

class ImportExportService {

    //----------------------------------------------------------------------------
    // Import Core Functions
    //----------------------------------------------------------------------------

    /**
     * Read contents from file in local directory
     * @param file_pathname
     * @return {Promise}
     */
    static readFileContents(file_pathname) {
        return new Promise(function(good, bad) {
            let fileLocation = path.resolve(file_pathname);
            let fileContent = fs.readFileSync(fileLocation, 'utf-8');
            if (fileLocation.indexOf(fileContent) > -1) {
                console.error(error("ERROR: There is nothing in this file!\n"));
                process.exit(1);
            } else {
                good(fileContent);
                return;
            }
        });
    }

    /**
     * Check path and return path location if valid
     * @param path_name
     * @return {Promise}
     */
    static checkPath(path_name) {
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
        });
    }

    /**
     * Check for duplicate Test name
     * @param projID
     * @param filePathname
     * @return {Promise}
     */
    static checkTest(projID, filePathname) {
        return new Promise(function(good, bad) {
            let testName = path.parse(filePathname).name;
            return APIUtils.webstudioJsonRequest(
                "GET",
                "/api/studio/v1/projects/" + projID + "/workspace/tests",
                { name: testName })
                .then(list => {
                    list = JSON.parse(list);
                    for (let i = 0; i < list.length; i++) {
                        let item = list[i];
                        if (item.name == testName) {
                            bad("ERROR: This test '" + testName + "' exists. Please use another name!\n");
                            return;
                        }
                    }
                    good(testName);
                    return;
                }
            );
        });
    }

    /**
     * Check folder contents and return folder name if folder is not empty
     * @param folder_pathname
     * @return {Promise}
     */
    static checkFolderContents(folder_pathname) {
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
        });
    }

    /**
     * Import folder contents
     * @param projID
     * @param folder_pathname
     * @return {Promise}
     */
    static importFolderContents(projID, folder_pathname) {
        return new Promise(function(good, bad) {
            let folderLocation = path.resolve(folder_pathname);
            return fs.readdir(folder_pathname, function(err, files) {
                let promiseArr = [];
                for (var i = 0; i < files.length; i++) {
                    let file = files[i];
                    let fileName = path.parse(file).name;
                    let file_pathname = folderLocation + "/" + file;
                    promiseArr.push(ImportExportService.importTestContentsHelper(projID,file_pathname,fileName) );
                }
                return Promise.all(promiseArr)
                    .then(response => good())
                    .catch(error => bad(error));
            });
        });
    }

    /**
     * This will create a single promise which will be pushed to promise Array
     * @param projID
     * @param file_pathname
     * @param fileName
     * @return {Promise}
     */
    static importTestContentsHelper(projID, file_pathname, fileName){
        return new Promise(function (good,bad) {
            let copyFileContent;
            let copyTestName;
            return ImportExportService.readFileContents(file_pathname)
                .then(file_content => {
                    copyFileContent = file_content;
                    return ImportExportService.checkTest(projID, fileName)})
                .then(testName => {
                    copyTestName= testName;
                    return ImportExportService.importTestUnderFolder(projID, testName, copyFileContent)})
                .then(response => good())
                .catch(error => bad(error));
        });
    }

    //----------------------------------------------------------------------------
    // Import API Functions
    //----------------------------------------------------------------------------

    /**
     * Create a new test by importing it under a folder in a project
     * @param projectID
     * @param testName
     * @param testContent
     * @return {Promise.<TResult>}
     */
    static importTestUnderFolder(projectID, testName, testContent) {

        return APIUtils.webstudioRawRequest(
            "POST",
            "/api/studio/v1/projects/" + projectID + "/workspace/tests/addAction",
            {
                name: testName,
                script: testContent
            })
            .then(data=> {
                return data;
            });
    }

    //----------------------------------------------------------------------------
    // Export Core Functions
    //----------------------------------------------------------------------------

    /**
     * Export children(tests) of folder
     * @param projID
     * @param folderID
     * @param directory
     * @return {Promise}
     */
    static exportTestDirectory(projID, directory) {
        return new Promise(function(good, bad) {
             return ImportExportService.directoryList(projID)
                .then(rootDirMap => {
                    for (var i = 0; i < rootDirMap.length; i++) {
                        let root_folder = rootDirMap[i];
                        if (root_folder.typeName == "FOLDER") {
                            let dirNode;
                            if (root_folder.id != null) {
                                dirNode = ImportExportService.findSubDirectoryByID(root_folder, root_folder.id);
                            }
                            if (dirNode) {
                                ImportExportService.exportDirectoryNodeToDirectoryPath(projID, dirNode, directory);
                            }
                        }
                        else if(root_folder.typeName == "TEST"){
                            ImportExportService.exportDirectoryNodeToDirectoryPath(projID, root_folder, directory);
                        }
                    }
                    good(true);
                    return;
                });
        });
    }

    /**
     * Recursively scans the directory node, and export the folders / files when needed
     * @param projID
     * @param dirNode
     * @param localDirPath
     */
    static exportDirectoryNodeToDirectoryPath(projID, dirNode, localDirPath) {
        if( dirNode == null ) {
            return;
        }
        if (dirNode.typeName == "FOLDER") {

            // makeSureDirectoryExists(localDirPath);
            return ImportExportService.makeFolder(dirNode.name, localDirPath)
                .then(t => {
                    var nextPath = localDirPath + "/" + dirNode.name;
                    let folder_children = dirNode.children;
                    for (var i = 0; i < folder_children.length; i++) {
                        let folder_child = folder_children[i];
                        ImportExportService.exportDirectoryNodeToDirectoryPath(projID, folder_child, nextPath);
                    }
                });
        }
        else if (dirNode.typeName == "TEST") {
            return ImportExportService.getScript(projID, dirNode.id)
                .then(fileContent => {
                    return ImportExportService.exportTestFile(localDirPath, dirNode.name, fileContent);
                });
        }
    }

    /**
     * Export a test
     * @param directory
     * @param test_name
     * @param file_content
     * @return {Promise}
     */
    static exportTestFile(directory, test_name, file_content) {
        return new Promise(function (good,bad) {
            let filePathName = path.resolve(directory) + "/" + test_name + ".js";
            let fileName = test_name + ".js";
            fs.writeFile(filePathName, file_content, function(err) {
                if (err) {
                    console.error(error(err));
                    process.exit(1);
                }
                good("File <" + fileName + "> successfully saved in " + directory);
                return;
                //console.log(success("File <" + fileName + "> successfully saved in " + directory));
            });
        })

    }

    /**
     * Make folder in local directory for export
     * @param folderName
     * @param directory
     * @return {Promise}
     */
    static makeFolder(folderName, directory) {
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
        });
    }

    /**
     * Does a recursive search on the parentDir object, and its children
     * @param parentDir
     * @param folderID
     * @return {*}
     */
    static findSubDirectoryByID(parentDir, folderID) {
        if( parentDir.typeName == "FOLDER" ) {
            if( parentDir.id == folderID ) {
                return parentDir;
            }
            // @childrenList (children of directory)
            var childrenList = parentDir.children;
            for (var i = 0; i < childrenList.length; i++) {
                var validatedChildNode = ImportExportService.findSubDirectoryByID(childrenList[i], folderID);
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

    /**
     * Get content of script from a test
     * @param projectID
     * @param testID
     * @return {Promise}
     */
    static getScript(projectID, testID) {
        return new Promise(function(good, bad) {
            return APIUtils.webstudioRawRequest(
                "GET",
                "/api/studio/v1/projects/" + projectID + "/workspace/tests/" + testID + "/script",
                {})
                .then(data => {
                    good(data);
                    return;
                }).catch(p1 => {
                    console.log(p1);
                    process.exit(1);
                });
        });
    }

    /**
     * Get the directory of a project
     * @param projectID
     * @return {Promise}
     */
    static directoryList(projectID) {
        return new Promise(function(good, bad) {
            return APIUtils.webstudioJsonRequest(
                "GET",
                "/api/studio/v1/projects/" + projectID + "/workspace/directory",
                {}
                )
                .then(project => {
                    project = JSON.parse(project);
                    good(project.children);
                    return;
                });
        });
    }

}

module.exports = ImportExportService;
