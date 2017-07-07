// /**
//  * Created by tadapatrisonika on 6/7/17.
//  */
const path = require('path');

var projectname = "uilicious-cli-test-"+randomString(6);
var importTestName = "uiliiocus-cli-test-"+randomString(5);
var importTestName1 = "uiliiocus-cli-test-"+randomString(5);
var importTestName2 = "uiliiocus-cli-test-"+randomString(5);
var file_pathname = "./input.txt";
var file_pathname1 = "./input2.rtf";
var file_pathname2 = path.resolve("/Users/tadapatrisonika/Downloads/input.rtf");

//CREATE  a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectname),
	[
		projectname
	],
	"CREATE project"
);

// //IMPORT a test that contains test script to run
// assert.containsAllValues(
// 	runUiliciousCli("import-test", projectname, importTestName, file_pathname),
// 	[
// 		projectname,
// 		importTestName
// 	],
// 	"IMPORT a new test script using the file path"
// );
//
// //IMPORT a test that contains test script to run
// assert.containsAllValues(
// 	runUiliciousCli("import-test", projectname, importTestName1, file_pathname1),
// 	[
// 		projectname,
// 		importTestName1
// 	],
// 	"IMPORT a new test script using the file path"
// );

//IMPORT a test that contains test script to run
assert.containsAllValues(
	runUiliciousCli("import-test", projectname, importTestName2, file_pathname2),
	[
		projectname,
		importTestName2
	],
	"IMPORT a new test script using the file path"
);


// //RUN the test script
// assert.containsAllValues(
// 	runUiliciousCli("run", projectname, importTestName),
// 	[
//
// 	],
// 	"RUN the test"
// );
//
// //RUN the test script
// assert.containsAllValues(
// 	runUiliciousCli("run", projectname, importTestName1),
// 	[
//
// 	],
// 	"RUN the test"
// );

