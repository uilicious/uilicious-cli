// /**
//  * Created by tadapatrisonika on 6/7/17.
//  */


var projectName = "uilicious-cli-test-"+randomString(6);
var file_pathName = "/Users/tadapatrisonika/Documents/test1.js";
var data_pathName = "/Users/tadapatrisonika/Documents/data.json";
var testName = "test1.js";
//var testLogPath = "/Users/tadapatrisonika/Documents";


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
// assert.containsAllValues(
// 	runUiliciousCli("run", projectName, testName, "--data", data_pathName),
// 	[
//
// 	],
// 	"RUN the test"
// );
