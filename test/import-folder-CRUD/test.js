/**
 * Created by tadapatrisonika on 10/7/17.
 */

var projectName = "uilicious-cli-test-"+randomString(6);
var folderPath = "/Users/tadapatrisonika/Documents/folder";


// CREATE a project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project"
);

//IMPORT folder
assert.containsAllValues(
	runUiliciousCli("import-folder", projectName, folderPath),
	[

	],
	"IMPORT folder"
);

