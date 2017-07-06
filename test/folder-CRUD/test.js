/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(7);
var folderName = "uilicious-cli-test-"+randomString(5);
var folderName2 = "uilicious-cli-test-"+randomString(5);
var folderName3 = "uilicious-cli-test-"+randomString(5);
var folderName4 = null;
var folderName5 = "uilicious-cli-test-"+randomString(5);
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

//
// CREATE a folder under already created folder
//
assert.containsAllValues(
	runUiliciousCli("create-folder", "--folder",folderName2, projName,folderName3),
	[
		projName,
		folderName2,
		folderName3
	],
	"CREATE folder under a existing folder"
);

//List the folders under the first project
console.log(runUiliciousCli("list-folder", projName));

// // CREATE a folder with the same name as a already existing folder, under the first project
// //it throws an error as the folder name already exists.
// assert.containsAllValues(
// 	runUiliciousCli("create-folder", projName, folderName1),
// 	[
// 		projName,
// 		folderName1
// 	],
// 	"CREATE a new folder with the same name as the existing folder under the same project"
// );
//

// // CREATE  a folder under a folder that does not exist
// // it will throw an error as the folder under which a folder has to be created is not found
// assert.containsAllValues(
// 	runUiliciousCli("create-folder", "--folder", folderName4, projName, folderName5),
// 	[
// 		projName,
// 		folderName4,
// 		folderName5
// 	],
// 	"CREATE folder under a folder that does not exist"
// );
//

// Delete a folder that contains a folder under it
// so when we delete the parent folder the contains under it should also get deleted
assert.containsAllValues(
	runUiliciousCli("delete-folder", projName, folderName2),
	[
		projName,
		folderName2
	],
	"DELETE a folder that contains other folders under it"
);

//List the list of folders
// now we should not get the folder that was deleted along with the folder which was created under it too being deleted
console.log(runUiliciousCli("list-folder", projName));

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
