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

class ProjectService {

  //------------------------------------------------------------------------------
  //	Project Core Functions
  //------------------------------------------------------------------------------

  /// Fetch the project ID for a project,
  /// silently terminates, with an error message if it fails
  ///
  /// @param  Project Name to fetch ID
  static projectID(projectName) {
  	return new Promise(function(good, bad) {
  		ProjectService.projectList(function(list) {
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
}

module.exports = ProjectService;
