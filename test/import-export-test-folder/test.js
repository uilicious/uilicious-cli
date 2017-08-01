/**
 * Created by tadapatrisonika on 11/7/17.
 */
const path = require('path');

var projectName = "uilicious-cli-test-"+randomString(6);
var importFilePath = path.resolve("./test/import-export-test-folder/components/demo1.js");
var importFilePath1 = path.resolve("./test/import-export-test-folder/components/demo2.js");
var folderName = "uilicious-cli-test-"+randomString(5);
var importFolderPath = path.resolve("./test/import-export-test-folder/components/importFolder");
var importFolderPath1 = path.resolve("./test/import-export-test-folder/components/importFolder1");
var exportTestName = "ExpressMelody-login";
var exportPath = "/Users/tadapatrisonika/Downloads";
var exportFolderName = "folder-test";
var exportFolderName2 = folderName;

// CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE PROJECT"
);

//IMPORT a test file under the project
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, importFilePath),
	[

	],
	"IMPORT TEST SCRIPT"
);

//CREATE a folder under the project
assert.containsAllValues(
	runUiliciousCli("create-folder", projectName, folderName),
	[
		projectName,
		folderName
	],
	"CREATE A FOLDER"
);

//IMPORT a test to the new folder created under the project
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, importFilePath1, "--folder", folderName),
	[

	],
	"IMPORT TEST SCRIPT UNDER THE FOLDER"
);

//IMPORT a folder under the project
//which contains test files
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, importFolderPath),
	[

	],
	"IMPORT FOLDER WITH TEST FILES"
);

//IMPORT folder under another folder which is created under the project
//which contains test files and test scripts
// assert.containsAllValues(
// 	runUiliciousCli("import-folder", projectName, importFolderPath1, "--folder", folderName),
// 	[
//
// 	],
// 	"IMPORT FOLDER UNDER A FOLDER"
// );

// EXPORT a test from under the project to a location on the system
// assert.containsAllValues(
// 	runUiliciousCli("export-test", projectName, exportTestName, exportPath),
// 	[
//
// 	],
// 	"EXPORT TEST"
// );

//EXPORT folder from under the project to a location on the system
// assert.containsAllValues(
// 	runUiliciousCli("export-folder", projectName, exportFolderName, exportPath),
// 	[
//
// 	],
// 	"EXPORT FOLDER"
// );

//EXPORT folder which contains folder and test under it
// assert.containsAllValues(
// 	runUiliciousCli("export-folder", projectName, exportFolderName2, exportPath),
// 	[
//
// 	],
// 	"EXPORT FOLDER"
// );
