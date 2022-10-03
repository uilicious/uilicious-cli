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
	
	aliases: ["history <project> <job>"],
	// ignore: ['<args>'],
	desc: "History of scheduled job runs found in uilicious servers for the given project and job",
	paramsDesc: ["Unique project ID or Name", "Unique job ID or Name"],
	
	setup: (cmd) => {
		cmd.number("--offset  <offset>", {
			description: "[default: 0]      Offset the result list by the given number"
		});
		cmd.number("--count   <count>", {
			description: "[default: 100]    The number of result to return"
		});
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);
			
			// Lets get the file list
			let jobObj = await SpaceAndProjectApi.findJobID(projectObj._oid, argv.job);

			// Get the offset and count
			let offset = argv.offset || 0;
			let count  = argv.count  || 100;

			// Get the job history
			let jobHistory = await SpaceAndProjectApi.getJobHistory(projectObj._oid, jobObj._oid, offset, count);

			// Lets do some format shifting
			let retList = FormatShift.collectionPropertyFilterAndRemap( jobHistory, null, { "_oid":"jobID", "name":"jobName" });
			retList = FormatShift.remapUnixTime( retList, ["createdAt","requestTime","runTime","updatedAt"]);
			
			// Lets output the standard table (if configured)
			OutputHandler.standardTable(retList, ["status", "requestTime", "runTime", "testRunIDs"]);

			// Lets output the JSON formatting
			OutputHandler.json(retList);
		} catch(err) {
			OutputHandler.fatalError(err, 47);
		}
	}
}
