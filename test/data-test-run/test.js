 /**
  * Created by tadapatrisonika on 6/7/17.
  * Modified by Shahin (shahin@uilicious.com)
  */
const path = require('path');

var projectName = "hello-world";
var file_pathName = path.resolve("./test/data-test-run/components/test123.js");
var testName = "test123";

//Import a test that contains a test script to run
assert.containsAllValues(
	runUiliciousCli("import", projectName, file_pathName),
	[

	],
	"IMPORT a new test script using a file path"
);

//Import a data-test that contains the data object to help run the test script
assert.containsAllValues(
	runUiliciousCli("run", projectName, testName),
	[

	],
	"RUN the test"
);
