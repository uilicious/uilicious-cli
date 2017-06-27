/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(5);
var folderName = "uilicious-cli-test-"+randomString(4);
var newFolderName = "uilicious-cli-test-"+randomString(4);
var folderName1 = folderName;

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project" , projName),
	[
		projName,
	],
	"CREATE a new project with expected results"
);

// CREATE folder
assert.containsAllValues(
	runUiliciousCli("create-folder" , projName , folderName),
	[
		projName,
		folderName,
	],
	"CREATE a new folder under a project"
);

//return true a the folder name already exists in the list od folders
assert.exists(runUiliciousCli("existing-folder-name", projName, folderName));

// CREATE a folder with the same name as a already existing folder, under the same project
assert.containsAllValues(
	runUiliciousCli("create-duplicate-folder-under-same-project", projName, folderName1),
	[
		projName,
		folderName1
	],
	"CREATE a new folder with the same name as the existing folder under the same project"
);

// READ the folder (list) under the project

// UPDATE a folder
assert.containsAllValues(
	runUiliciousCli("rename-folder", projName, folderName, newFolderName),
	[
		projName,
		folderName,
		newFolderName,
	],
	"RENAME the existing created folder under the project"
);

// DELETE folder under the project
assert.containsAllValues(
	runUiliciousCli("delete-folder", projName, newFolderName),
	[
		projName,
		newFolderName,
	],
	"DELETE the folder under the project"
);

// DELETE the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName),
	[
		projName,
	],
	"DELETED the project from the list"
);