/**
 * ImportExport class that provides functionality for import/export operations
 * to be performed
 * @Author: Shahin (shahin@uilicious.com)
 */

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const ProjectService = require('../service/ProjectService');
const FolderService = require('../service/FolderService');
const ImportExportService = require('../service/ImportExportService');

class ImportExportController {

    //----------------------------------------------------------------------------
    // Import Helper Functions
    //----------------------------------------------------------------------------

    // Import folder and its contents
    // @param		Project Name
    // @param		Folder Path
    static importFolderHelper(projectName, folderPath) {
        let copyFolderPathName;
        let copyFolderName;
        let copyProjectId;
        return ImportExportService.checkPath(folderPath)
            .then(folder_pathname => {
                copyFolderPathName = folder_pathname;
                return ImportExportService.checkFolderContents(folder_pathname) })
            .then(folder_name => {
                copyFolderName = folder_name;
                return ProjectService.projectID(projectName)})
            .then(projID => {
                copyProjectId=projID;
                return FolderService.checkFolder(projID, copyFolderName)})
            .then(folder_name => {
                copyFolderName=folder_name;
                return FolderService.createFolder(copyProjectId, folder_name)})
            .then(response => {
                return ImportExportService.importFolderContents(projectName, copyFolderName, copyFolderPathName)})
            .then(response=> {
                console.log(success("Import successful! Test created under Folder <" + copyFolderName
                    + "> under Project <" + projectName+">" ));})
            .catch(error =>{
                console.error("Error: error occurred while importing folder : "+error+"'\n");
            });
    }

    // Export folder and its test scripts
    // @param		Project Name
    // @param		Folder Name
    // @param       Directory
    static exportFolderHelper(projectName, folderName, directory) {
        let copyProjectId;
        return ProjectService.projectID(projectName)
            .then(projID => {
                copyProjectId = projID;
                return FolderService.nodeID(projID, folderName)})
            .then(folderID => ImportExportService.exportTestDirectory(copyProjectId, folderID, directory))
            .then(t => console.log(success("Folder has been exported successfully to <"+directory+">")))
            .catch(error =>{
                console.log("Error: "+error+"'\n");
            });
    }

}

module.exports = ImportExportController;
