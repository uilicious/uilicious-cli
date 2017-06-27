
var projName = "uilicious-cli-test-"+randomString(5);
var newprojName = "uilicious-cli-test-"+randomString(5);

var projectName = projName;

// CREATE project
assert.containsAllValues(
	runUiliciousCli("create-project", projName),
	[
		projName,
	],
	"CREATE a new project with expected success"
);

// return true as the project already exists in the list
assert.exists(runUiliciousCli("existing-project-name" , projName));

// CREATE  a project with the same name as a already existing project
assert.containsAllValues(
	runUiliciousCli("create-duplicate-project", projectName),
	[
		projectName,
	],
	"CREATE a new project with the same name as the existing project"
);

// READ (list) projects
assert.containsAllValues(
	runUiliciousCli("list-project"),
	[
		projName
	],
	"READ that the created project is in list"
);

// UPDATE project
assert.containsAllValues(
	runUiliciousCli("rename-project", projName, newprojName),
	[
		projName,
		newprojName,
	],
	"RENAME the existing created project"
);

//console.log(runUiliciousCli("delete-project", projName));

// DELETE project
assert.containsAllValues(
	runUiliciousCli("delete-project", newprojName),
	[
		newprojName,
	],
	"DELETE the project from the list"
);

// get the list of projects
//console.log(runUiliciousCli("list-project"));


