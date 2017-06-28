/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(6);
var testName = "uilicious-cli-test-"+randomString(5);
var testName1 = testName;
var testName2 = "uilicious-cli-test-"+randomString(5);
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

// CREATE a test
assert.containsAllValues(
	runUiliciousCli("create-test" , projName , testName),
	[
		projName,
		testName
	],
	"CREATE a new test under a project"
);

// CREATE a test2
assert.containsAllValues(
	runUiliciousCli("create-test" , projName , testName2),
	[
		projName,
		testName2
	],
	"CREATE a new test under a project"
);

//CREATE  a file with the same name as a already existing file, under the same project
// assert.containsAllValues(
// 	runUiliciousCli("create-test",projName, testName1),
// 	[
// 		projName,
// 		testName1
// 	],
// 	"CREATE a new test with the same name as the existing test under the same project"
// );


// UPDATE a test
assert.containsAllValues(
	runUiliciousCli("rename-test", projName, testName, newTestName),
	[
		projName,
		testName,
		newTestName

	],
	"RENAME the existing created test under the project"
);

// UPDATE a test, with a already existing test name
assert.containsAllValues(
	runUiliciousCli("rename-test", projName, newTestName, testName2),
	[
		projName,
		newTestName,
		testName2

	],
	"RENAME the existing created test with the same name as already existing test under the project"
);

//IMPORT a test script by giving in the file-path
assert.containsAllValues(
	runUiliciousCli("import-test", projName, importTestName, file_pathname),
	[
		projName,
		importTestName
	],
	"IMPORT a new test script using the file path"
);

//IMPORT a test script having the same name as a already existing test name by giving in the file-path
assert.containsAllValues(
	runUiliciousCli("import-test", projName, importTestName, file_pathname),
	[
		projName,
		importTestName
	],
	"IMPORT a new test script using the file path"
);

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