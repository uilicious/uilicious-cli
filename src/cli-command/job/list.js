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
	
	aliases: ["list <project>"],
	// ignore: ['<args>'],
	desc: "List all the scheduled jobs found in uilicious servers for this project",
	paramsDesc: ["Unique project ID or Name"],
	
	setup: (cmd) => {
		
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);
			
			// Lets get the file list
			let jobList = await SpaceAndProjectApi.getJobList(projectObj._oid);

			// Lets do some format shifting
			let retList = FormatShift.collectionPropertyFilterAndRemap( jobList, null, { "_oid":"jobID", "name":"jobName" });
			retList = FormatShift.remapUnixTime( retList, ["lastRunTime","nextRunTime"]);
			
			// Lets output the standard table (if configured)
			OutputHandler.standardTable(retList, ["jobID", "jobName", "status", "lastRunTime", "nextRunTime"]);

			// Lets output the JSON formatting
			OutputHandler.json(retList);
		} catch(err) {
			OutputHandler.fatalError(err, 47);
		}
	}
}
