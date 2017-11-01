/**
* Project Service class that provides functionality for CRUD operations
* to be performed by the project
* @Author:Shahin (shahin@uilicious.com)
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

    /**
     * Fetch the project ID for a project,
     * silently terminates, with an error message if it fails
     * @param projectName
     * @return {Promise}
     */
  static projectID(projectName) {
  	return new Promise(function(good, bad) {
  		return ProjectService.projectList()
			.then(list => {
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

    /**
     * Get a list of projects, in the following format [ { id, title, logoUrl }]
     * @return {*}
     */
  static projectList() {
  	return APIUtils.webstudioJsonRequest(
  		"GET",
  		"/api/studio/v1/projects",
  		{},									// To:Do : accept projectName and username and return project id
  		function (callback) {
			return callback;
        }
  	);
  }
}

module.exports = ProjectService;
