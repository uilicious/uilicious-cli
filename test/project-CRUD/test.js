
var projName = "uilicious-cli-test-"+randomString(7);
var projName2 = "uilicious-cli-test-"+randomString(7);
var newprojName = "uilicious-cli-test-"+randomString(5);

var projectName = projName;

// CREATE project
//create a project with a unique name that doesnt exist, it doesnt throw an error as any other project is not named the same
assert.containsAllValues(
	runUiliciousCli("create-project", projName),
	[
		projName
	],
	"CREATE a new project with expected success"
);

// CREATE a second project
//create a project with a unique name that doesnt exist, it doesnt throw an error as any other project is not named the same
assert.containsAllValues(
	runUiliciousCli("create-project", projName2),
	[
		projName2
	],
	"CREATE a new project with expected success"
);

//CREATE  a project with the same name as a already existing project
// it throws an error as the name already exists.
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName
	],
	"CREATE a new project with the same name as the existing project"
);

// READ (list) projects
//this will list out all the projects that are created under that account
assert.containsAllValues(
	runUiliciousCli("list-project"),
	[
		projName
	],
	"READ that the created project is in list"
);

// UPDATE project
// rename a existing project name with a new project name
assert.containsAllValues(
	runUiliciousCli("rename-project", projName, newprojName),
	[
		projName,
		newprojName
	],
	"RENAME the existing created project"
);

// UPDATE project name with a existing project name
//this will throw an error if u rename a existing project name with another existing project name
assert.containsAllValues(
	runUiliciousCli("rename-project", newprojName,projName2),
	[
		newprojName,
		projName2
	],
	"RENAME the existing project with a name of another existing project "
);

// DELETE project
//delete a existing project
assert.containsAllValues(
	runUiliciousCli("delete-project", projName2),
	[
		projName2
	],
	"DELETE the project from the list"
);

// get the list of projects
//console.log(runUiliciousCli("list-project"));


