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
	
	aliases: ["list"],
	desc: "List of projects you have access to",
	
	setup: (cmd) => {
		// No additional argument required
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectList = await SpaceAndProjectApi.getProjectList();
			
			// Lets do some format shifting
			let retList = FormatShift.collectionPropertyFilterAndRemap( projectList, ["spaceID", "spaceName"], { "_oid":"projectID", "name":"projectName", "userRole":"userRole" });
			
			// Lets output the standard table (if configured)
			OutputHandler.standardTable(retList, ["projectID", "spaceID", "spaceName", "userRole", "projectName"]);

			// Lets output the JSON formatting
			OutputHandler.json(retList);
		} catch(err) {
			OutputHandler.fatalError(err);
		}
	}
}
