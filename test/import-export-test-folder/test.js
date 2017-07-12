/**
 * Created by tadapatrisonika on 11/7/17.
 */


var projectName = "uilicious-cli-test-"+randomString(6);
var filePath = "/Users/tadapatrisonika/Documents/ExpressMelody-login.txt";
var filePath1 = "/Users/tadapatrisonika/Documents/Amazon-login.txt";
var folderName = "uilicious-cli-test-"+randomString(5);
var folderPath = "/Users/tadapatrisonika/Documents/folder-test";
var folderPath1 = "/Users/tadapatrisonika/Documents/folder";
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

//IMPORT a test file under the project which contains a test script
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, filePath),
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

//IMPORT a test with its test script under the folder created under the project
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, filePath1, "--folder", folderName),
	[

	],
	"IMPORT TEST SCRIPT UNDER THE FOLDER"
);

//IMPORT a folder under the project
//which contains test files with test scripts
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderPath),
	[

	],
	"IMPORT FOLDER WITH TEST FILES WITH SCRIPTS"
);

//IMPORT folder under another folder which is created under the project
//which contains test files and test scripts
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderPath1, "--folder", folderName),
	[

	],
	"IMPORT FOLDER UNDER A FOLDER"
);

// EXPORT a test from under the project to a location on the system
assert.containsAllValues(
	runUiliciousCli("export-test", projectName, exportTestName, "--directory", exportPath),
	[

	],
	"EXPORT TEST"
);

//EXPORT folder from under the project to a location on the system
assert.containsAllValues(
	runUiliciousCli("export-folder", projectName, exportFolderName, "--directory", exportPath),
	[

	],
	"EXPORT FOLDER"
);

//EXPORT folder which contains folder and test under it
assert.containsAllValues(
	runUiliciousCli("export-folder", projectName, exportFolderName2, "--directory", exportPath),
	[

	],
	"EXPORT FOLDER"
);

