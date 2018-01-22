/**
 * Created by tadapatrisonika on 11/7/17.
 * Modified by Shahin (shahin@uilicious.com)
 */
const path = require('path');

var projectName = "hello-world";
var importFilePath = path.resolve("./test/import-export-test-folder/components");
var importFilePath1 = path.resolve("./test/import-export-test-folder/components");
var exportPath = path.resolve("./test/import-export-test-folder/output");


//IMPORT a test file under the project
assert.containsAllValues(
	runUiliciousCli("import", projectName, importFilePath),
	[

	],
	"IMPORT TEST SCRIPT"
);


//IMPORT a test to the new folder created under the project
assert.containsAllValues(
	runUiliciousCli("import", projectName, importFilePath1),
	[

	],
	"IMPORT TEST SCRIPT TO NEW CREATED FOLDER"
);

// EXPORT a test from under the project to a location on the system
assert.containsAllValues(
	runUiliciousCli("export", projectName, exportPath),
	[

	],
	"EXPORT TEST"
);