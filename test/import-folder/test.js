/**
 * Created by tadapatrisonika on 10/7/17.
 */

var projectName = "uilicious-cli-test-"+randomString(6);
var folderPath = "/Users/tadapatrisonika/Documents/folder";
var folderPath2 = "/Users/tadapatrisonika/Documents/folder2";
var folderPath3 = "/Users/tadapatrisonika/Downloads/folder";


//Importing a folder from a destinated filepath into the webStudio
//first the folder which has to be imported is created
//and then , if it contains any files under it then it is created in under the folder
//so when a folder is imported ... we import the folder along with its contains under it


// CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project"
);

//IMPORT folder
//this folder which we are importing has files under it .
//so first we import the folder by creating a folder with its name
//and then importing the test scripts by creating it under the folder
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderPath),
	[

	],
	"IMPORT folder with test scripts under it"
);

// //IMPORT FOLDER
// //here we import a folder which does not have any files under it
// //it throws as error saying that the folder is empty
// assert.containsAllValues(
// 	runUiliciousCli("import-folder", projectName, folderPath2),
// 	[
//
// 	],
// 	"IMPORT folder"
// );


// //IMPORT FOLDER
// //import a folder having as existing folder name
// //but different folder locations
// //it throws an error cause the folder name already exists
// assert.containsAllValues(
// 	runUiliciousCli("import-folder", projectName, folderPath3),
// 	[
//
// 	],
// 	"IMPORT folder"
// );


