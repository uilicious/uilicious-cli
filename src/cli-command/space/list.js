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
	desc: "List of spaces you have access to",
	
	setup: (cmd) => {
		// No additional argument required
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let spaceList = await SpaceAndProjectApi.getSpaceList();
			
			// Lets do some format shifting
			let retList = FormatShift.collectionPropertyFilterAndRemap( spaceList, [], { "_oid":"spaceID", "userRole":"userRole", "name":"spaceName" });
			
			// Lets output the standard table (if configured)
			OutputHandler.standardTable(retList, ["spaceID", "userRole", "spaceName"]);

			// Lets output the JSON formatting
			OutputHandler.json(retList);
		} catch(err) {
			OutputHandler.fatalError(err);
		}
	}
}
