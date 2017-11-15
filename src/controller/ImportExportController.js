/**
 * ImportExport class that provides functionality for import/export operations
 * to be performed
 * @author Shahin (shahin@uilicious.com)
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
    // Import and Export Helper Functions
    //----------------------------------------------------------------------------

    /**
     * Import folder and its contents
     * @param projectName
     * @param folderPath
     * @return {Promise.<TResult>}
     */
    static importFolderHelper(projectName, folderPath) {
        let copyFolderPathName;
        return ImportExportService.checkPath(folderPath)
            .then(folder_pathname => {
                copyFolderPathName = folder_pathname;
                return ImportExportService.checkFolderContents(folder_pathname)
            })
            .then(folder_name => {
                return ProjectService.projectID(projectName)
            })
            .then(projID => {
                return ImportExportService.importFolderContents(projID, copyFolderPathName)
            })
            .then(response => {
                console.log(success("Import successful! test(s) created under Project <"+ projectName +">" ));
            })
            .catch(errors =>{
                console.log(error(errors));
            });
    }

    /**
     * Export folder and its test scripts
     * @param projectName
     * @param directory
     * @return {Promise.<TResult>}
     */
    static exportFolderHelper(projectName, directory) {
        return ProjectService.projectID(projectName)
            .then(projID => {
                return ImportExportService.exportTestDirectory(projID, directory)})
            .then(response => {
                console.log(success("Project has successfully exported to <"+directory+">")) })
            .catch(error =>{
                console.log(error(error));
            });
    }
}

module.exports = ImportExportController;
