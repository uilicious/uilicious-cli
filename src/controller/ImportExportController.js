/**
 * ImportExport class that provides functionality for import/export operations
 * to be performed
 * @author Shahin (shahin@uilicious.com)
 */

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

const program = require('commander');

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
    static importFolderHelper(projectName, folderPath, options) {
        let copyFolderPathName;
        return ImportExportService.checkPath(folderPath)
            .then(folder_pathname => {
                if (program.verbose) {
                    console.log("Status : checked target folder path");
                }
                copyFolderPathName = folder_pathname;
                return ImportExportService.checkFolderContents(folder_pathname)
            })
            .then(folder_name => {
                if (program.verbose) {
                    console.log("Status : checked folder contents");
                }
                return ProjectService.projectID(projectName)
            })
            .then(projID => {
                if (program.verbose) {
                    console.log("Status : retrieved project id");
                    console.log("Status : trying to import to local folder contents to project root directory");
                }
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
                return ImportExportService.exportTestDirectory(projID, directory);
            })
            .then(response => {
                console.log(success("Project has successfully exported to <"+directory+">"));
            })
            .catch(errors =>{
                console.log(error(errors));
            });
    }
}

module.exports = ImportExportController;
