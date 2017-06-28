/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(7);
var projectName = "uilicious-cli-test-"+randomString(7);
var folderName = "uilicious-cli-test-"+randomString(5);
var folderName2 = "uilicious-cli-test-"+randomString(5);
var newFolderName = "uilicious-cli-test-"+randomString(5);
var folderName1 = folderName;

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project" , projName),
	[
		projName
	],
	"CREATE a new project with expected results"
);

// CREATE folder under the first project
assert.containsAllValues(
	runUiliciousCli("create-folder" , projName , folderName),
	[
		projName,
		folderName
	],
	"CREATE a new folder under the project"
);

//CREATE another folder under the first project
assert.containsAllValues(
	runUiliciousCli("create-folder", projName, folderName2),
	[
		projName,
		folderName2
	],
	"CREATE a new folder under the project"
);

// CREATE a folder with the same name as a already existing folder, under the first project
//it throws an error as the folder name already exists.
assert.containsAllValues(
	runUiliciousCli("create-folder", projName, folderName1),
	[
		projName,
		folderName1
	],
	"CREATE a new folder with the same name as the existing folder under the same project"
);

//CREATE an other project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project with expected results"
);

//CREATE a folder with the same name as a already existing folder , under the second project
assert.containsAllValues(
	runUiliciousCli("create-folder", projectName, folderName1),
	[
		projectName,
		folderName1
	],
	"CREATE a new folder with the same name as a existing folder under a different project"
);

// UPDATE a folder
assert.containsAllValues(
	runUiliciousCli("rename-folder", projName, folderName, newFolderName),
	[
		projName,
		folderName,
		newFolderName
	],
	"RENAME the existing created folder under the project"
);

// DELETE folder under the project
assert.containsAllValues(
	runUiliciousCli("delete-folder", projName, newFolderName),
	[
		projName,
		newFolderName
	],
	"DELETE the folder under the project"
);

// DELETE the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName),
	[
		projName
	],
	"DELETED the project from the list"
);