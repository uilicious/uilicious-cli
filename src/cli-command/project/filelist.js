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
	
	aliases: ["filelist <project>"],
	// ignore: ['<args>'],
	desc: "List all the files found in uilicious servers for this project",
	paramsDesc: ["Unique project ID or Name"],
	
	setup: (cmd) => {
		
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Get the full project listing
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);
			
			// Lets get the file list
			let fileList = await SpaceAndProjectApi.getProjectFileList(projectObj._oid);

			// Lets output the list (if stdout is configured)
			await OutputHandler.ifStandard(()=> {
				OutputHandler.standard("filepath")
				OutputHandler.standard("----------")
				for(let i=0; i<fileList.length; ++i) {
					OutputHandler.standard(fileList[i]);
				}
			});
	
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
				"result": fileList 
			});
		} catch(err) {
			OutputHandler.fatalError(err);
		}
	}
}
