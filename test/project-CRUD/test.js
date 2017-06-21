
var projName = "uilicious-cli-test-"+randomString(5);
var newprojName = "uilicious-cli-test-"+randomString(5);

var projectName = projName;

// CREATE project
assert.containsAllValues(
	runUiliciousCli("create-project", projName),
	[
		projName,
		"created"
	],
	"CREATE a new project with expected success"
);

// return true as the project already exists in the list
assert.exists(runUiliciousCli("list-project" , projName))

// CREATE  a project with the same name as a already existing project
assert.containsAllValues(
	runUiliciousCli("create-project", projectName),
	[
		projectName,
		"created"
	],
	"CREATE a new project wih expected success"
);

// get the list of projects
console.log(runUiliciousCli("list-project"));


// // READ (list) projects
// assert.containsAllValues(
// 	runUiliciousCli("list-project"),
// 	[
// 		projName
// 	],
// 	"READ that the created project is in list"
// );
//
// // UPDATE project
// assert.containsAllValues(
// 	runUiliciousCli("rename-project", projName, newprojName),
// 	[
// 		projName,
// 		newprojName,
// 		"renamed"
// 	],
// 	"RENAME the existing created project"
// );
//
// //console.log(runUiliciousCli("delete-project", projName));
//
// // DELETE project
// assert.containsAllValues(
// 	runUiliciousCli("delete-project", newprojName),
// 	[
// 		newprojName,
// 		"deleted"
// 	],
// 	"DELETE the project from the list"
// );



