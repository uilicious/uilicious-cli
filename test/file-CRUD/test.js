/**
 * Created by tadapatrisonika on 21/6/17.
 */

var projName = "uilicious-cli-test-"+randomString(5);
var testName = "uilicious-cli-test-"+randomString(4);
var testName1 = testName;
var newTestName = "uilicious-cli-test-"+randomString(4);

//CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project" , projName),
	[
		projName,
	],
	"CREATE a new project with expected results"
);

// CREATE a test
assert.containsAllValues(
	runUiliciousCli("create-test" , projName , testName),
	[
		projName,
		testName,
	],
	"CREATE a new test under a project"
);

//return true as the test name already exists in the list of tests
assert.exists(runUiliciousCli("existing-test-name",projName, testName));

// CREATE  a file with the same name as a already existing file, under the same project
assert.containsAllValues(
	runUiliciousCli("create-duplicate-test-under-same-project",projName, testName1),
	[
		projName,
		testName1,
	],
	"CREATE a new test with the same name as the existing test under the same project"
);

// GET the test (list) under the project
assert.containsAllValues(
	runUiliciousCli("get-test", projName, testName),
	[
		projName,
		testName,
	],
	"GET a test that is created under the project"
);

// UPDATE a test
assert.containsAllValues(
	runUiliciousCli("rename-test", projName, testName, newTestName),
	[
		projName,
		testName,
		newTestName,

	],
	"RENAME the existing created test under the project"
);

// DELETE test under the project
assert.containsAllValues(
	runUiliciousCli("delete-test", projName, newTestName),
	[
		projName,
		newTestName,
	],
	"DELETE the test under the project"
);

// DELETE the project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName),
	[
		projName,
	],
	"DELETED the project from the list"
);