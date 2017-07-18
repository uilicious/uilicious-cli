const APIUtils = require('./../api-utils');

class ProjectCRUD {
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
  static projectID(projectName, callback) {
  	return new Promise(function(good, bad) {
  		ProjectCRUD.projectList(function(list) {
  			for (let i=0; i<list.length; ++i) {
  				let item = list[i];
  				if (item.title == projectName) {
  					good(parseInt(item.id));
  					return;
  				}
  			}
  			console.error("ERROR: Project Name not found: " + projectName);
  			process.exit(1);
  		});
  	}).then(callback);
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

  /// Read a project and display its directory
  // function getProj(projectID, callback) {
  // 	return
  // }

  /// Update a project
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
