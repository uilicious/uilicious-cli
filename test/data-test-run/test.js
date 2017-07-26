// /**
//  * Created by tadapatrisonika on 6/7/17.
//  */


var projectName = "uilicious-cli-test-"+randomString(6);
var file_pathName = "";
var data_pathName = "";
var testLogPath = "";


//Create a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project"
);

//Import a test that contains a test script to run
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, file_pathName),
	[

	],
	"IMPORT a new test script using a file path"
);

//Import a data-test that contains the data object to help run the test script
assert.containsAllValues(
	runUiliciousCli("")
);