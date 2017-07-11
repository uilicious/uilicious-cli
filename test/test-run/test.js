// /**
//  * Created by tadapatrisonika on 6/7/17.
//  */

// var projectname = "uilicious-cli-test-"+randomString(6);
// var file_pathname2 = "/Users/tadapatrisonika/Documents/input5.txt";

var projectName  = "uilicious-cli-test-DFE6k8";
var testName = "input";

// //CREATE  a project
// assert.containsAllValues(
// 	runUiliciousCli("create-project", projectname),
// 	[
// 		projectname
// 	],
// 	"CREATE project"
// );

// //IMPORT a test that contains test script to run
// assert.containsAllValues(
// 	runUiliciousCli("import-test", projectname, file_pathname),
// 	[
//
// 	],
// 	"IMPORT a new test script using the file path"
// );


//RUN the test script
assert.containsAllValues(
	runUiliciousCli("run", projectName, testName),
	[

	],
	"RUN the test"
);


