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

  // Import test script
  // @param		Project Name
  // @param		Test Name
  // @param		File Path Name
  static importTestHelper(projname, file_pathname, options) {
      let copyFileContent;
      let copyProjectId;
      let copyTestName;

      return ImportExportService.readFileContents(file_pathname)
        .then(file_content=> {
            copyFileContent=file_content;
            return ProjectCRUD.projectID(projname);
        })
        .then(projID=> {
            copyProjectId = projID;
  			return ImportExportService.checkTest(projID, file_pathname)})
        .then(testName=> {
        	copyTestName = testName;
            return ImportExportService.importTest(copyProjectId, testName, copyFileContent)})
		.then(t =>  {
			console.log(success("Import successful!\nNew test '"+copyTestName+"' created in Project '"+projname+"'\n"));
		}).catch(error => {
			console.error("Error: error occurred while importing the test file : "+error+"'\n");
		});
  }

  // Import test script under a folder
  // @param Project Name
  // @param folder Name
  // @param File Path Name
  static importTestUnderFolderHelper(projname, file_pathname, foldername, options) {
      let copyFileContent;
      let copyProjectId;
      let copyNodeId;
      let copyTestName;
  	return ImportExportService.readFileContents(file_pathname)
        .then(file_content => {
            copyFileContent = file_content;
            return ProjectCRUD.projectID(projname)})
        .then(projID => {
            copyProjectId=projID;
  			return folderCRUD.nodeID(projID, foldername)})
        .then(nodeId => {
            copyNodeId = nodeId;
            return ImportExportService.checkTest(copyProjectId, file_pathname)})
        .then(testName => {
            copyTestName= testName;
            return ImportExportService.importTestUnderFolder(copyProjectId, copyNodeId, testName, copyFileContent)})
        .then(response=> {
            console.log(success("Import successful!\nNew test '"+copyTestName+"' created under Folder '"+foldername+"' under Project '"+projname+"'.\n"));
        }).catch(error => {
            console.error("Error: error occurred while importing the test file : "+error+"'\n");
        });
  }

  // Import folder and its contents
  static importFolderHelper(projName, folderPath, options) {
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
        .then(folder_name=> {
            copyFolderName=folder_name;
            return folderCRUD.createFolder(copyProjectId, folder_name)})
        .then(response => {
            return ImportExportService.importFolderContents(projName, copyFolderName, copyFolderPathName)})
        .then(res=> {
            console.log(success("Import successful!" + "' created under Folder '" + copyFolderName + "' under Project '" + projName + "'.\n"));})
        .catch(error =>{
            console.error("Error: error occurred while importing folder : "+error+"'\n");
        });
  }


  //----------------------------------------------------------------------------
  // Export Helper Functions
  //----------------------------------------------------------------------------

  static exportTestHelper(projname, testname, directory) {
  	let copyProjectId;
  	return ProjectCRUD.projectID(projname)
		.then(projID => {
			copyProjectId = projID;
			return testCRUD.testID(projID, testname)
		})
		.then(testID => ImportExportService.getScript(copyProjectId, testID))
		.then(fileContent=> ImportExportService.exportTestFile(directory, testname, fileContent))
        .then(successMessage => console.log(success(successMessage)+"'\n"))
        .catch(error =>{
            console.log("Error"+error+"'\n");
        });
  }

  // Export folder and its test scripts
  static exportFolderHelper(projName, folderName, directory) {
  	ProjectCRUD.projectID(projName, function(projID) {
  		folderCRUD.nodeID(projID, folderName, function(folderID) {
        ImportExport.exportTestDirectory(projID, folderID, directory);
  		});
  	});
  }

}

module.exports = ImportExport;
