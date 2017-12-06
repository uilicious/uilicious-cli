/**
* ImportExportService class that provides functionality for import/export operations
* to be performed
* @author Shahin (shahin@uilicious.com)
*/

// npm Dependencies
const fs = require('fs');
const path = require('path');

const program = require('commander');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');
const api = require('../utils/api');
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
            testName="/"+testName;
            return api.project.file.query({projectID:projID})
                .then(response => {
                    response = JSON.parse(response);
                    response = response.result.children;
                    for (let i = 0; i < response.length; i++) {
                        let item = response[i];
                        if (item.name == testName) {
                            bad("ERROR: This test '" + path.parse(filePathname).name + "' exists. Please use another name!\n");
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
            return fs.readdir(folder_pathname, function(err, files) {
                if (err || files.length == 0) {
                    bad("ERROR: This folder is empty!\n");
                    return;
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
                    let nodeName = path.parse(file).name;
                    let nodeLocation = folderLocation + "/" + file;
                    if(fs.lstatSync(nodeLocation).isFile()){
                        promiseArr.push(ImportExportService.importTestContentsHelper(projID, nodeLocation, nodeName));
                    }
                    else if(fs.lstatSync(nodeLocation).isDirectory()){
                        const read = (dir) =>
                            fs.readdirSync(dir)
                                .reduce((files, file) =>
                                        fs.statSync(path.join(dir, file)).isDirectory() ?
                                            files.concat(read(path.join(dir, file))) :
                                            files.concat(path.join(dir, file)),
                                    []);
                        read(nodeLocation).forEach(function (node) {
                            var nodeName = node.substr(node.lastIndexOf("/")+1).replace(".js","");
                            promiseArr.push(ImportExportService.importTestContentsHelper(projID, node, nodeName));
                        });
                    }
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
            return ImportExportService.readFileContents(file_pathname)
                .then(file_content => {
                    var override = true+"";
                    return api.project.file.put({projectID:projID, filePath:path.parse(file_pathname).name,
                        content: file_content, override:override });
                })
                .then(response => {
                    if (program.verbose) {
                        console.log("INFO : Uploading test script ("+fileName+") ");
                    }
                    good();
                    return;
                })
                .catch(errors => bad(errors));
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
                    console.log(rootDirMap);
                    let promiseArr = [];
                    for (var i = 0; i < rootDirMap.length; i++) {
                        let root_folder = rootDirMap[i];
                        promiseArr.push(ImportExportService.exportHelper(projID,root_folder,directory) );
                    }
                    return Promise.all(promiseArr)
                        .then(response => {
                            if (program.verbose) {
                                console.log("INFO : saved tests scripts to your local directory");
                            }
                            good();
                        })
                        .catch(error => bad(error));
                })
                .catch(errors => bad(errors));
        });
    }

    /**
     * Export helper function
     * @param projID
     * @param root_folder
     * @param directory
     * @returns {Promise}
     */
    static exportHelper(projID, root_folder, directory){
        return new Promise(function (good, bad) {
            if (root_folder.typeName == "FOLDER") {
                let dirNode;
                if (root_folder.id != null) {
                    dirNode = ImportExportService.findSubDirectoryByID(root_folder, root_folder.id);
                }
                if (dirNode) {
                    ImportExportService.exportDirectoryNodeToDirectoryPath(projID, dirNode, directory);
                    good();
                    return;
                }
            }
            else if(root_folder.typeName == "TEST"){
                if (program.verbose) {
                    console.log("INFO : downloading test script ("+root_folder.name+")");
                }
                return ImportExportService.getScript(projID, root_folder.id)
                    .then(fileContent => {
                        return ImportExportService.exportTestFile(directory, root_folder.name, fileContent);
                    })
                    .then(response => good(response))
                    .catch(errors => bad(errors))
            }
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
            return fs.writeFile(filePathName, file_content, function(err) {
                if (err) {
                    console.error(error("ERROR: No such file/directory found"));
                    process.exit(1);
                }
                good("File <" + fileName + "> successfully saved in " + directory);
                return;
            });
        });
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
            return fs.mkdir(newDirectory, function(err) {
                if (err === 'EEXIST') {
                    console.error(error("ERROR: This folder <"+ folderName +"> exists.\nPlease use another directory.\n"));
                    process.exit(1);
                }
                good(newDirectory);
                return;
            });
        });
    }

    /**
     * create a folder if does not exist
     * @param folderName
     * @param directory
     * @return {Promise}
     */
    static makeFolderIfNotExist(directory) {
        return new Promise(function(good, bad) {
            return fs.mkdir(directory, function(err) {
                if (err === 'EEXIST') {
                }
                if (program.verbose) {
                    console.log("INFO : creating folder if does not exist at <"+directory+">");
                }
                good(directory);
                return;
            });
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
                    if(project.children){
                        good(project.children);
                        return;
                    }
                    bad("Error: Unable to get the directory list in the project");
                    return;
                })
                .catch(error => bad("Error: Unable to get the directory list in the project"));
        });
    }

    /**
     * Create a folder under the project in remote
     * @param projectID
     * @param folderName
     * @returns {Promise}
     */
    static createFolderInsideProject(projectID, folderName) {
        return new Promise(function (good, bad) {
            return ImportExportService.checkRemoteFolderPath(projectID, folderName)
                .then(response => {
                    if(response == false){
                        return APIUtils.webstudioRawRequest(
                            "POST",
                            "/api/studio/v1/projects/" + projectID + "/workspace/folders/addAction",
                            {
                                name: folderName
                            });
                    }
                    else {
                        good(response)
                        return;
                    }
                })
                .then(response => good(response))
                .catch(error => bad("Error : Unable to create folder inside project"));
        });
    }

    /**
     * Check if the remote path exists or not
     * @param projectID
     * @param folderName
     * @returns {Promise}
     */
    static checkRemoteFolderPath(projectID, folderName) {
        return new Promise(function (good, bad) {
            return APIUtils.webstudioJsonRequest(
                "GET",
                "/api/studio/v1/projects/" + projectID + "/workspace/folders",
                {})
                .then(list => {
                    list = JSON.parse(list);
                    for (let i = 0; i < list.length; i++) {
                        let folder = list[i];
                        if (folder.name == folderName) {
                            good(folder);
                            return;
                        }
                    }
                    good(false);
                    return;
                })
                .catch(errors => bad(errors));
        });
    }
}

module.exports = ImportExportService;
