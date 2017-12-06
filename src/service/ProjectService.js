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
                    console.error(error("ERROR: Project Name not found: " + projectName));
                    process.exit(1);
                })
                .catch(errors => bad(errors));
        });
    }

    //------------------------------------------------------------------------------
    //	Project API Functions
    //------------------------------------------------------------------------------

    /**
     * Get a list of projects, in the following format [ { id, title, logoUrl }]
     * @returns {Promise.<TResult>}
     */
    static projectList() {
        return APIUtils.webstudioJsonRequest(
            "GET",
            "/api/studio/v1/projects",
            {});
    }
}

module.exports = ProjectService;
