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
const ProjectCRUD = require('../service/ProjectService');
const folderCRUD = require('../service/FolderService');
const testCRUD = require('../service/TestService');
const ImportExportService = require('../service/ImportExportService');

class ImportExport {

    //----------------------------------------------------------------------------
    // Import Helper Functions
    //----------------------------------------------------------------------------

    // Import folder and its contents
    // @param		Project Name
    // @param		Folder Path
    static importFolderHelper(projName, folderPath) {
        let copyFolderPathName;
        let copyFolderName;
        let copyProjectId;
        return ImportExportService.checkPath(folderPath)
            .then(folder_pathname => {
                copyFolderPathName = folder_pathname;
                return ImportExportService.checkFolderContents(folder_pathname) })
            .then(folder_name => {
                copyFolderName = folder_name;
                return ProjectCRUD.projectID(projName)})
            .then(projID => {
                copyProjectId=projID;
                return folderCRUD.checkFolder(projID, copyFolderName)})
            .then(folder_name => {
                copyFolderName=folder_name;
                return folderCRUD.createFolder(copyProjectId, folder_name)})
            .then(response => {
                return ImportExportService.importFolderContents(projName, copyFolderName, copyFolderPathName)})
            .then(response=> {
                console.log(success("Import successful!" + "'Test created under Folder '" + copyFolderName + "' under Project '" + projName+"'" ));})
            .catch(error =>{
                console.error("Error: error occurred while importing folder : "+error+"'\n");
            });
    }

    // Export folder and its test scripts
    static exportFolderHelper(projName, folderName, directory) {
        let copyProjectId;
        return ProjectCRUD.projectID(projName)
            .then(projID => {
                copyProjectId = projID;
                return folderCRUD.nodeID(projID, folderName)})
            .then(folderID => ImportExportService.exportTestDirectory(copyProjectId, folderID, directory))
            .then(t => console.log(success("Folder has been exported successfully to "+directory+"'\n")))
            .catch(error =>{
                console.log("Error: "+error+"'\n");
            });
    }

}

module.exports = ImportExport;
