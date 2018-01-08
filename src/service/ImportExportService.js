/**
* ImportExportService class that provides functionality for import/export operations
* to be performed
* @author Shahin (shahin@uilicious.com)
*/

// npm Dependencies
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const program = require('commander');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
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
                good("//an empty file");
                return;
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
     * Check folder contents and return folder name if folder is not empty
     * @param folder_pathname
     * @return {Promise}
     */
    static checkFolderContents(folder_pathname) {
        return new Promise(function(good, bad) {
            let folderName = path.basename(folder_pathname);
            return fs.readdir(folder_pathname, function(err, files) {
                if (files.length == 0) {
                    good(folderName);
                    return;
                }
                else if (err){
                    bad("ERROR: An error encountered while reading from folder<"+folderName+">");
                    return;
                }
                else {
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
    static importFolderContents(projID, folder_pathname, options) {
        return new Promise(function(good, bad) {
            let folderLocation = path.resolve(folder_pathname);
            return fs.readdir(folder_pathname, function(err, files) {
                let promiseArr = [];
                for (var i = 0; i < files.length; i++) {
                    let file = files[i];
                    let nodeName = path.parse(file).name;
                    let nodeLocation = folderLocation + "/" + file;
                    if(fs.lstatSync(nodeLocation).isFile()){
                        nodeName = nodeName.concat(".js");
                        if (!(/(^|\/)\.[^\/\.]/g).test(nodeName)) {
                            promiseArr.push(ImportExportService.importTestContentsHelper(projID, nodeLocation, nodeName, options));
                        }
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
                            let filePathName = node.replace(folderLocation,"");
                            if (!(/(^|\/)\.[^\/\.]/g).test(filePathName)) {
                                promiseArr.push(ImportExportService.importTestContentsHelper(projID, node, filePathName, options));
                            }
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
    static importTestContentsHelper(projID, file_pathname, fileName, options){
        return new Promise(function (good,bad) {
            return ImportExportService.readFileContents(file_pathname)
                .then(file_content => {
                    var override;
                    if(options.overwrite){
                        if(options.overwrite == "y"){
                            override = "True";
                        }
                        else if(options.overwrite == "n"){
                            override = "false";
                        }
                        else{
                            override = "false";
                        }
                    }
                    else{
                        override = "false";
                    }
                    return api.project.file.put({projectID:projID, filePath:fileName,
                        content: file_content, overwrite:override });
                })
                .then(response => {
                    if (program.verbose &&  options.overwrite) {
                        console.log("INFO : Uploading test script ("+fileName+") with overwrite mode enabled");
                    }
                    else if (program.verbose) {
                        console.log("INFO : uploading test script ("+fileName+") ");
                    }
                    good();
                    return;
                })
                .catch(errors => {
                    errors = JSON.parse(errors.error);
                    if(errors.ERROR.code === 'FILE_ALREADY_EXISTS'){
                        console.log(error("INFO : existing File Found -> Skipping"));
                        good();
                        return;
                    }
                    bad("ERROR: An error occurred while uploading the test script");
                    return;
                });
        });
    }

    //----------------------------------------------------------------------------
    // Export Core Functions
    //----------------------------------------------------------------------------

    /**
     * Export children(tests) of folder
     * @param projID
     * @param directory
     * @return {Promise}
     */
    static exportTestDirectory(projID, directory) {
        return new Promise(function(good, bad) {
            return api.project.file.query({projectID:projID, type:"list"})
                .then(rootDirMap => {
                    rootDirMap = JSON.parse(rootDirMap);
                    rootDirMap = rootDirMap.result;

                    let promiseArr = [];
                    for (var i = 0; i < rootDirMap.length; i++) {
                        let root_folder = rootDirMap[i];
                        if(root_folder.type == "file")
                        {
                            promiseArr.push(ImportExportService.exportHelper(projID, root_folder, directory) );
                        }
                    }
                    return Promise.all(promiseArr)
                        .then(response => {
                            if (program.verbose) {
                                console.log("INFO : saved tests scripts to your local directory");
                            }
                            good();
                        })
                        .catch(error => bad(error));
                   console.log(rootDirMap);
                   good();
                   return;
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
            if (program.verbose) {
                console.log("INFO : downloading test script ("+root_folder.path+")");
            }
            return api.project.file.get({projectID:projID, filePath:root_folder.path})
                .then(fileContent => {
                    fileContent = JSON.parse(fileContent);
                    fileContent = fileContent.result;
                    return ImportExportService.exportTestFile(directory, root_folder.path, fileContent);
                })
                .then(response => good(response))
                .catch(errors => bad(errors));
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
        if (dirNode.type == "folder") {
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
        else if (dirNode.type == "file") {
            return api.project.file.get({projectID:projID, filePath:root_folder.path})
                .then(fileContent => {
                    fileContent = JSON.parse(fileContent);
                    fileContent = fileContent.result;
                    return ImportExportService.exportTestFile(localDirPath, dirNode.path, fileContent);
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
        return new Promise(function (good, bad) {
            var lastChar = directory.substr(-1);
            if (lastChar == '/') {
                directory = directory.substr(0, directory.length-1);
            }
            if(test_name.indexOf("/") !=-1){
                var lastSlashIndex = test_name.lastIndexOf("/");
                directory = directory+test_name.substr(0,lastSlashIndex);
                test_name = test_name.substr(lastSlashIndex+1);
            }
            return ImportExportService.mkDirByPathSync(directory)
                .then(response => {
                    let filePathName = path.resolve(directory) + "/" + test_name;
                    return fs.writeFile(filePathName, file_content, function(err) {
                        if (err) {
                            console.error(error("ERROR: Unable to create directory/test-file"));
                            process.exit(1);
                        }
                        good("File <" + test_name + "> successfully saved in " + directory);
                        return;
                    });
                })
                .catch(errors => bad("ERROR: An error occurred while saving the file to local directory"));
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
     * create a directory with full path
     * @param targetDir
     * @returns {Promise}
     */
    static mkDirByPathSync(targetDir) {
        return new Promise(function (good, bad) {
            return mkdirp(targetDir, function (err) {
                if (err){
                    bad(err);
                    return;
                }
                good();
                return;
            });

        });
    }
}

module.exports = ImportExportService;
