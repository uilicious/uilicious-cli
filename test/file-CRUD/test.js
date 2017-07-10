/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(6);
var testName = "uilicious-cli-test-"+randomString(5);
var testName1 = testName;
var testName2 = "uilicious-cli-test-"+randomString(5);
var newTestName = "uilicious-cli-test-"+randomString(5);
var importTestName = "uilicious-cli-test-"+randomString(5);
var importTestName2 = "uilicous-cli-test-"+randomString(5);
var folderName1 = "uilicious-cli-test-"+randomString(4);
var testName4 = "uilicious-cli-test-"+randomString(5);


var file_pathname = "/Users/tadapatrisonika/Documents/input.txt";
var file_pathname2 = "/Users/tadapatrisonika/Documents/input5.txt";

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project", projName),
	[
		projName
	],
	"CREATE a new project with expected results"
);

// CREATE a test under the first project
assert.containsAllValues(
	runUiliciousCli("create-test", projName, testName),
	[
		projName,
		testName
	],
	"CREATE a new test under a project"
);

// CREATE a test2 under the first project
assert.containsAllValues(
	runUiliciousCli("create-test", projName, testName2),
	[
		projName,
		testName2
	],
	"CREATE a new test under a project"
);

// //CREATE  a file with the same name as a already existing file, under the first project
// //it will throw an error as the file name already exists
// assert.containsAllValues(
// 	runUiliciousCli("create-test",projName, testName1),
// 	[
// 		projName,
// 		testName1
// 	],
// 	"CREATE a new test with the same name as the existing test under the same project"
// );

// UPDATE test1 under the first project
assert.containsAllValues(
	runUiliciousCli("rename-test", projName, testName, newTestName),
	[
		projName,
		testName,
		newTestName

	],
	"RENAME the existing created test under the project"
);

// // UPDATE the updated test1 with a already existing test name under the first project
// // this is throw an error as the test name already exists under the first project
// assert.containsAllValues(
// 	runUiliciousCli("rename-test", projName, newTestName, testName2),
// 	[
// 		projName,
// 		newTestName,
// 		testName2
//
// 	],
// 	"RENAME the existing created test with the same name as already existing test under the project"
// );

//IMPORT a test script by giving in the file-path, under the first project
assert.containsAllValues(
	runUiliciousCli("import-test", projName, file_pathname),
	[

	],
	"IMPORT a new test script using the file path"
);

// //IMPORT a test script having the same name as a already existing test name by giving in the file-path, under the first project
// assert.containsAllValues(
// 	runUiliciousCli("import-test", projName, importTestName, file_pathname),
// 	[
// 		projName,
// 		importTestName
// 	],
// 	"IMPORT a new test script using the file path"
// );

//CREATE a folder under the first project
assert.containsAllValues(
	runUiliciousCli("create-folder", projName, folderName1),
	[
		projName,
		folderName1
	],
	"CREATE a folder"
);

//CREATE a test under the folder created in the first project
assert.containsAllValues(
	runUiliciousCli("create-test", "--folder", folderName1, projName, testName4),
	[
		projName,
		testName4,
		folderName1
	],
	"CREATE a test under a folder"
);

// //CREATE a test with a already existing name under a folder in the first project
// // this throws error as you cant have two tests with the same name under the same project
// assert.containsAllValues(
// 	runUiliciousCli("create-test","--folder",folderName1, projName, testName4),
// 	[
// 		projName,
// 		folderName1,
// 		testName4
// 	],
// 	"CREATE  a test with a name that already exists"
// );

//IMPORT  a test script under the folder that we created in the first project
assert.containsAllValues(
	runUiliciousCli("import-test" , "--folder", folderName1, projName, file_pathname2),
	[

	],
	"IMPORT a test script under a folder in a project"
);

// // DELETE test under the project
// assert.containsAllValues(
// 	runUiliciousCli("delete-test", projName, newTestName),
// 	[
// 		projName,
// 		newTestName
// 	],
// 	"DELETE the test under the project"
// );
//
// // DELETE the project
// assert.containsAllValues(
// 	runUiliciousCli("delete-project", projName),
// 	[
// 		projName
// 	],
// 	"DELETED the project from the list"
// );
