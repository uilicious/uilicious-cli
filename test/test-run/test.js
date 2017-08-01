// /**
//  * Created by tadapatrisonika on 6/7/17.
//  */
const path = require('path');

var projectname = "uilicious-cli-test-"+randomString(6);
var file_pathname = path.resolve("./test/test-run/components/test-run.js");
var testName = "test-run";



//CREATE  a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectname),
	[
		projectname
	],
	"CREATE project"
);

//IMPORT a test that contains test script to run
assert.containsAllValues(
	runUiliciousCli("import-test", projectname, file_pathname),
	[

	],
	"IMPORT a new test script using the file path"
);

//RUN the test script
assert.containsAllValues(
	runUiliciousCli("run", projectname, testName),
	[

	],
	"RUN the test"
);
