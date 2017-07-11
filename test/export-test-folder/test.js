/**
 * Created by tadapatrisonika on 11/7/17.
 */


var projectName = "uilicious-test-cli-"+randomString(6);
var filePath = "/Users/tadapatrisonika/Documents/input5.txt";
var filePath2 = "/Users/tadapatrisonika/Downloads";
var testName = "input5";

var folderPath = "/Users/tadapatrisonika/Documents/folder2";
var folderPath2 = "/Users/tadapatrisonika/Downloads";
var folderName = "folder2";

// create project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE project"
);

// Import test with a test script
assert.containsAllValues(
	runUiliciousCli("import-test", projectName, filePath),
	[

	],
	"IMPORT test with test script"
);


//Export the imported test file
assert.containsAllValues(
	runUiliciousCli("export-test", projectName, testName, "--directory", filePath2),
	[

	],
	"EXPORT test with the test script"
);

//Export the same file for the second time
//it over writes the file which has already been exported before with the same name
assert.containsAllValues(
	runUiliciousCli("export-test", projectName, testName, "--directory", filePath2),
	[

	],
	"EXPORT test with the test script"
);

//Import folder with the test files and scripts
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderPath),
	[

	],
	"IMPORT folder with the test scripts"
);

//Export the folder that was imported to another location
assert.containsAllValues(
	runUiliciousCli("export-folder", projectName, folderName, "--directory", folderPath2),
	[

	],
	"EXPORT folder with the files under it"
);

//Export the same folder for the second time
//it over writes the folder, with its contains which has already been exported before with the same name
assert.containsAllValues(
	runUiliciousCli("export-folder", projectName, folderName, "--directory", folderPath2),
	[

	],
	"EXPORT folder with the files under it"
);



