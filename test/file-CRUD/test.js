/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(6);
var projectName = "uilicious-cli-test-"+randomString(6);
var testName = "uilicious-cli-test-"+randomString(5);
var testName1 = testName;
var testName2 = "uilicious-cli-test-"+randomString(5);
var testName3 = testName;
var newTestName = "uilicious-cli-test-"+randomString(5);
var importTestName = "uilicious-cli-test-"+randomString(5);

var file_pathname = "/Users/tadapatrisonika/Documents/input.txt";

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project" , projName),
	[
		projName
	],
	"CREATE a new project with expected results"
);

// CREATE a test under the first project
assert.containsAllValues(
	runUiliciousCli("create-test" , projName , testName),
	[
		projName,
		testName
	],
	"CREATE a new test under a project"
);

// CREATE a test2 under the first project
assert.containsAllValues(
	runUiliciousCli("create-test" , projName , testName2),
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

//CREATE a second project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project with expected results"
);

//CREATE a new test with a existing name under the second project
//this doesnt throw error as it is under a different project
assert.containsAllValues(
	runUiliciousCli("create-test", projectName, testName3),
	[
		projectName,
		testName3
	],
	"CREATE a new test under the second project with a already existing test name"
);

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
	runUiliciousCli("import-test", projName, importTestName, file_pathname),
	[
		projName,
		importTestName
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

// DELETE test under the project
assert.containsAllValues(
	runUiliciousCli("delete-test", projName, newTestName),
	[
		projName,
		newTestName
	],
	"DELETE the test under the project"
);

// DELETE the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName),
	[
		projName
	],
	"DELETED the project from the list"
);

//DELETE the second project
//here we had created a test under the project
//without deleting the test we deleted the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projectName),
	[
		projectName
	],
	"DELETE the project from the list"
);

//check if the test created under the second project , which just was deleted , still exists
console.log(assert.exists(runUiliciousCli("get-test", testName3)));