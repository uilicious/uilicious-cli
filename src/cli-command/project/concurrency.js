//---------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------

const OutputHandler      = require("../../OutputHandler")
const FormatShift        = require("../../util/FormatShift")
const SpaceAndProjectApi = require("../../api/SpaceAndProjectApi")

//---------------------------------------------------
//
//  Command Definition
//
//---------------------------------------------------

module.exports = {
	
	aliases: ["concurrency <project>"],
	// ignore: ['<args>'],
	desc: "Get the number of active test running / total test capacity",
	paramsDesc: ["Unique project ID or Name"],
	
	setup: (cmd) => {
		
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);
			
			// Lets get the running test list
            let concurrencyObj = await SpaceAndProjectApi.getProjectConcurrency(projectObj._oid);
            
            // Prepare the resulting json
            let resJson = {
                "running" : concurrencyObj.running,
                "avaliable" : concurrencyObj.avaliable,
                "total" : concurrencyObj.total
            }

			// Lets output the standard table (if configured)
			OutputHandler.standardTable([resJson], ["running", "avaliable", "total"]);

			// Lets output the JSON formatting
			OutputHandler.json({ 
				// Forwarding useful project info
				"projectInfo": {
					"spaceID": projectObj.spaceID, 
					"spaceName": projectObj.spaceName, 
					"projectID":projectObj._oid, 
					"projectName":projectObj.name+"", 
					"userRole": projectObj.userRole, 
				},

				// The result
				"result": resJson 
			});
		} catch(err) {
			OutputHandler.fatalError(err);
		}
	}
}
