/**
 * Created by tadapatrisonika on 10/7/17.
 */

var projectName = "uilicious-cli-test-"+randomString(6);
var folderName = "uilicious-cli-test-"+randomString(5);
//var folderPath = "/Users/tadapatrisonika/Documents/anotherfolder";
var folderpath2 = "/Users/tadapatrisonika/Documents/folder";


// CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project"
);


//when we import a folder , first it creates a folder with the name of the imported folder
//and then checks for its contains
//if there are any files or tests present in the folder
//then it will import them with their names

// IMPORT FOLDER onto the created project
// assert.containsAllValues(
// 	runUiliciousCli("import-folder", projectName, folderPath),
// 	[
//
// 	],
// 	"IMPORT folder"
// );

//IMPORT folder
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderpath2),
	[

	],
	"IMPORT folder"
);

