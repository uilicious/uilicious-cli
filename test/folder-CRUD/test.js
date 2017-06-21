/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(5);
var folderName = "uilicious-cli-test-"+randomString(4);
var newFolderName = "uilicious-cli-test-"+randomString(4);

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project" , projName),
	[
		projName,
		"created"
	],
	"CREATE a new project with expected results"
);

// CREATE folder
assert.containsAllValues(
	runUiliciousCli("create-folder" , projName , folderName),
	[
		projName,
		folderName,
		"created"
	],
	"CREATE a new folder under a project"
);

// READ the folder (list) under the project

// UPDATE a folder
assert.containsAllValues(
	runUiliciousCli("rename-folder", projName, folderName, newFolderName),
	[
		projName,
		folderName,
		newFolderName,
		"renamed"
	],
	"RENAME the existing created folder under the project"
);

// DELETE folder under the project
assert.containsAllValues(
	runUiliciousCli("delete-folder", projName, newFolderName),
	[
		projName,
		newFolderName,
		"deleted"
	],
	"DELETE the folder under the project"
);

// DELETE the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName),
	[
		projName,
		"deleted"
	],
	"DELETED the project from the list"
);