/*
* projectCRUD class that provides functionality for CRUD operations
* to be performed by the folder
*/

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');

class ProjectCRUD {

  //------------------------------------------------------------------------------
  //	Project Helper Functions
  //------------------------------------------------------------------------------

  // Get list of projects from account
  static getAllProjects(options) {
  	console.log("#------------#");
  	console.log("#  Projects  #");
  	console.log("#------------#");
  	console.log("");

  	ProjectCRUD.projects(function(list) {
  		console.log("");
  	});
  }

  // Create new project
  // @param		Project Name
  static createProjectHelper(projname, options) {
  	ProjectCRUD.checkProject(projname, function(res) {
  		ProjectCRUD.createProject(projname, function(res) {
  			console.log(success("New project '"+projname+"' created.\n"));
  		});
  	});
  }

  // Update project using projname to get projID
  // @param		Project Name
  // @param		New Project Name
  static updateProjectHelper(projname, new_projname, options) {
  	ProjectCRUD.projectID(projname, function(projID) {
  		ProjectCRUD.checkProject(new_projname, function(res) {
  			ProjectCRUD.updateProject(projID, new_projname, function(res) {
  				console.log(success("Project '"+projname+"' renamed to '"+new_projname+"'.\n"));
  			});
  		});
  	});
  }

  // Delete project using project name
  // @param		Project Name
  static deleteProjectHelper(projname, options) {
  	ProjectCRUD.projectID(projname, function(projID) {
  		ProjectCRUD.deleteProject(projID, function(res) {
  			console.log(error("Project '"+projname+"' deleted.\n"));
  		});
  	});
  }

  //------------------------------------------------------------------------------
  //	Project Core Functions
  //------------------------------------------------------------------------------

  /// List all projects,
  /// silently terminates, with an error message if no project present
  static projects(callback) {
  	return new Promise(function(good, bad) {
  		ProjectCRUD.projectList(function(list) {
  			if (list != null) {
  				for (let i = 0; i < list.length; i++) {
  					let item = list[i];
  					console.log(" * " + item.title);
  				}
  				console.log("");
  			} else {
  				console.error("ERROR: No project present.");
  				process.exit(1);
  			}
  		});
  	}).then(callback);
  }

  /// Fetch the project ID for a project,
  /// silently terminates, with an error message if it fails
  ///
  /// @param  Project Name to fetch ID
  /// @param  [Optional] Callback to return result
  /// @return  Promise object, for result
  static projectID(projectName) {
  	return new Promise(function(good, bad) {
  		ProjectCRUD.projectList(function(list) {
  			for (let i=0; i<list.length; ++i) {
  				let project = list[i];
  				if (project.title == projectName) {
  					good(project.id);
  					return;
  				}
  			}
  			console.error(error("ERROR: Project Name not found: " + projectName));
  			process.exit(1);
  		});
  	});
  }

  /// Check for duplicate Project name
  /// @param	Project Name
  static checkProject(projname, callback) {
  	return new Promise(function(good, bad) {
  		ProjectCRUD.projectList(function(list) {
  			for (let i = 0; i < list.length; i++) {
  				let item = list[i];
  				if (item.title == projname) {
  					console.error("ERROR: This project '" + projname + "' exists.\nPlease use another name!\n");
  					process.exit(1);
  				}
  			}
  			good();
  			return;
  		});
  	}).then(callback);
  }

  //------------------------------------------------------------------------------
  //	Project API Functions
  //------------------------------------------------------------------------------

  /// Get a list of projects, in the following format [ { id, title, logoUrl }]
  /// @param  [Optional] Callback to return result, defaults to console.log
  /// @return  Promise object, for result
  static projectList(callback) {
  	return APIUtils.webstudioJsonRequest(
  		"GET",
  		"/api/studio/v1/projects",
  		{},
  		callback
  	);
  }

  /// Create a new project using projectName
  /// @param	Project Name
  static createProject(projectName, callback) {
  	return APIUtils.webstudioRawRequest(
  		"POST",
  		"/api/studio/v1/projects",
  		{ title: projectName },
  		callback
  	);
  }

  /// Update a project
  /// @param  Project ID from projectID()
  /// @param  New project name
  static updateProject(projectID, newProjectName, callback) {
  	return APIUtils.webstudioRawRequest(
  		"POST",
  		"/api/studio/v1/projects/" + projectID,
  		{ title: newProjectName },
  		callback
  	);
  }

  /// Delete a project
  /// @param	Project ID from projectID()
  /// @param  [Optional] Callback to return result
  static deleteProject(projectID, callback) {
  	return APIUtils.webstudioRawRequest(
  		"DELETE",
  		"/api/studio/v1/projects/" + projectID,
  		{},
  		callback
  	);
  }

}

module.exports = ProjectCRUD;
