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
	
	aliases: ["start <project> <job>"],
	// ignore: ['<args>'],
	desc: "Trigger scheduled job runs found in uilicious servers for the given project and job, does not wait for job to complete",
	paramsDesc: ["Unique project ID or Name", "Unique job ID or Name"],
	
	setup: (cmd) => {
		// cmd.boolean("--background", {
		// 	description: "[default: 0]      Offset the result list by the given number"
		// });
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);
			
			// Lets get the file list
			let jobObj = await SpaceAndProjectApi.findJobID(projectObj._oid, argv.job);

            // Trigger the test run
            let runObj = await SpaceAndProjectApi.triggerJobRun(projectObj._oid, jobObj._oid);

            // Prepare the run list
            let runList = [ runObj ];

			// Lets do some format shifting
			let retList = FormatShift.collectionPropertyFilterAndRemap( runList, null, { "_oid":"billID" });
			retList = FormatShift.remapUnixTime( retList, ["createdAt","requestTime","runTime","updatedAt"]);
			
			// Lets output the standard table (if configured)
			OutputHandler.standardTable(retList, ["billID", "status", "requestTime"]);

			// Lets output the JSON formatting
			OutputHandler.json(runObj);
		} catch(err) {
			OutputHandler.fatalError(err, 47);
		}
	}
}
