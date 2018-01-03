/**
 * Project Service class that provides functionality for CRUD operations
 * to be performed by the project
 * @author Shahin (shahin@uilicious.com)
 */

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');
const api = require('../utils/api');
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
            return api.project.list({fieldList:["_oid", "name"]})
                .then(response => {
                    response = JSON.parse(response);
                    let list = response.result;
                    for (let i=0; i<list.length; ++i) {
                        let project = list[i];
                        if (project.name == projectName) {
                            good(project._oid);
                            return;
                        }
                    }
                    good();
                    return;
                })
                .catch(errors => bad("ERROR: An error occurred while retrieving project ID "));
        });
    }

    /**
     * Create a new Project and return project id
     * @param projectName
     * @return {Promise}
     */
    static createProject(projectName) {
        return new Promise(function(good, bad) {
            return api.project.new({name:projectName})
                .then(response => {
                    response = JSON.parse(response);
                    good(response.result);
                    return;
                })
                .catch(errors => bad("ERROR: An error occurred while creating a new project "));
        });
    }
}

module.exports = ProjectService;
