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
const ImportExportService = require('../service/ImportExportService');
const APIUtils = require('../utils/ApiUtils');

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
        return APIUtils.getFullHostURL()
            .then(t => ImportExportService.checkPath(folderPath))
            .then(folder_pathname => {
                if (program.verbose) {
                    console.log("INFO : checked target folder path");
                }
                copyFolderPathName = folder_pathname;
                return ImportExportService.checkFolderContents(folder_pathname)
            })
            .then(folder_name => {
                if (program.verbose) {
                    console.log("INFO : checked folder contents");
                }
                return ProjectService.projectID(projectName)
            })
            .then(projID => {
                if (program.verbose) {
                    console.log("INFO : retrieved project id");
                    console.log("INFO : trying to import from local folder to project root directory");
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
        //create folder does not exist
        return APIUtils.getFullHostURL()
            .then(response => ImportExportService.makeFolderIfNotExist(directory))
            .then(response => ProjectService.projectID(projectName))
            .then(projID => {
                if (program.verbose) {
                    console.log("INFO : checked project ID");
                }
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
