//---------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------

const path = require("path")
const fse  = require("fs-extra")

// Promise Q flow
const PromiseQueue       = require("promise-queue")

// Project dependnecies
const OutputHandler      = require("../../OutputHandler")
const FileUtil           = require("../../util/FileUtil")
const FormatShift        = require("../../util/FormatShift")
const SpaceAndProjectApi = require("../../api/SpaceAndProjectApi")

//---------------------------------------------------
//
//  Command Definition
//
//---------------------------------------------------

module.exports = {
	
	aliases: ["upload <project> <localdir>", "import <project> <localdir>"],
	paramsDesc: ["Unique project ID or Name", "local directory to upload data from", "remote directory to upload into"],
	// ignore: ['<args>'],
	desc: "Upload (and overwrite) specified project files into uilicious servers",
	
	setup: (cmd) => {
		// Additional sub dir filtering
		cmd.string("--remoteFilePath <remote-file-path>", {
			description: "File path to upload into instead of the project root"
		});

		// Single threaded uploading / downloading
		cmd.boolean("--sequential", {
			description: "Peform the upload sequentially, this is only useful for debugging purposes"
		});

		// Safe download mode handling
		cmd.boolean("--skipExisting", {
			description: "Skip existing files instead of overwriting them",
			aliases: "--skipExisting, --skip-existing"
		})
		
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			// Check for a valid directory
			try {
				await fse.pathExists(argv.localdir);
			} catch(e) {
				OutputHandler.debug("Unexpected error", e);
				throw `Invalid local directory path : ${argv.localdir}`
			}

			// Scan the directory
			let dirScanList = await FileUtil.generateFileList( argv.localdir );
			
			// Quick terminate if the dir scan is empty
			if( dirScanList.length <= 0 ) {
				OutputHandler.standardGreen([
					">",
					"> Empty Directory : No files to upload",
					">"
				].join("\n"))
				return;
			}

			// Show the valid login header
			OutputHandler.standardGreen([
				">",
				"> Login successful",
				"> Starting 'uploading' command",
				">"
			].join("\n"))
			
			// Get the full project listing (after login)
			let projectObj = await SpaceAndProjectApi.findProject(argv.project);

			// Log the project name/oid header
			OutputHandler.standardGreen([
				`> Project Name: ${projectObj.name}`,
				`> Project ID:   ${projectObj._oid}`,
				">"
			].join("\n"))
			
			// Lets get the existing file list
			let projectFileList = await SpaceAndProjectApi.getProjectFileList(projectObj._oid);
			projectFileList.sort();

			// Table output size (if needed)
			let tableWidth = [7, -1];

			// Get remote file path after normalizing it
			let [remoteFilePath, remoteFilePathDir] = FileUtil.normalizeRemoteFilePath(argv.remoteFilePath);
			
			// Output remoteFilePath if present
			if( remoteFilePath && remoteFilePath.length > 0 ) {
				OutputHandler.standardGreen([
					`> Remote File Path (normalized): ${remoteFilePath}`,
				].join("\n"))
			}
			OutputHandler.standardGreen([
				`> Local Directory: ${argv.localdir}`,
				">"
			].join("\n"))
			
			//------------------------------------------------------------------------------------------------------------------------

			/**
			 * Function used to process a project file, this is called by the queue system
			 * 
			 * PS: All valid status response string is intentionally up to or equal 7 characters
			 * 
			 * @param {String} localRelativePath - file path relative to the local project directory 
			 *                                     (note, not the remoteFilePath directory)
			 * 
			 * @return [status,localRelativePath], containing the final upload status string, 
			 *         else false if it should be ignored - along with the localRelativePath
			 **/ 
			async function uploadFile(localRelativePath) {
				// path relative to the project root folder
				let projectPath = localRelativePath;

				// Check if path is expected to be a folder,
				// if so, and skip it from the logging steps
				//-------------------------------------------------
				if( localRelativePath.endsWith("/") ) {
					return [false, localRelativePath];
				}

				// Handle the remoteFilePathDir (if provided)
				// to compute the projectPath
				if( remoteFilePathDir ) {
					projectPath = path.join( remoteFilePathDir, projectPath );
				}
				if( projectPath.startsWith("/") ) {
					projectPath = projectPath.substring(1);
				}

				// Derive the full localFullPath
				//-------------------------------------------------
				let localFullPath = path.join(argv.localdir, localRelativePath);

				// Check if the file exists in the project
				let currentlyExists = projectFileList.indexOf(projectPath) >= 0;

				// Perform skip existing check
				let skipExisting = (!!argv["skipExisting"] || !!argv["skip-existing"]);
				if( skipExisting && currentlyExists ) {
					return ["skipped", localRelativePath];
				}

				// Lets read the file content
				// and upload to the project, and overwrite
				let data = fse.createReadStream(localFullPath); 

				// Download the raw file data
				let enableOverwrite = !skipExisting;
				let uploadRes = await SpaceAndProjectApi.uploadProjectFile(projectObj._oid, projectPath, data, enableOverwrite)

				// Return the file outcome
				if( !uploadRes ) {
					return [false, localRelativePath];
				}
				if( currentlyExists ) {
					return ["updated", localRelativePath];
				} else {
					return ["created", localRelativePath];
				}

				// Fallback failure condition - skip it
				// return [false, localRelativePath]
			}

			//------------------------------------------------------------------------------------------------------------------------

			// Final JSON result map (if needed)
			let jsonResultMap = {};

			// Prepare the request Queue
			// (which handles throttling the number of request to 4 request at a time)
			// See: https://www.npmjs.com/package/promise-queue
			let queue = new PromiseQueue( argv.sequential? 1 : 4, Infinity)
			let fileListResult = [];
			
			// Output the table header (if configured)
			OutputHandler.tableHeader(["status", "filepath"], tableWidth)
			
			// Iterate the remote file list, and perform the respective download
			// without awaiting on the promise (async)
			for( let i=0; i<dirScanList.length; ++i ) {
				// And trigger the respective downloads
				let fileItem = dirScanList[i];
				fileListResult[i] = queue.add(async function() { return await uploadFile(dirScanList[i]) });
			}

			// Iterate the remote file list, and await its result sequentially
			for( let i=0; i<fileListResult.length; ++i ) {
				// Get the respective outcome
				let [fileOutcome, localRelativePath] = await fileListResult[i];

				// Skip irrelevant outcomes
				if( fileOutcome == false ) {
					continue;
				}

				// Lets prepare the result output (according to the respective settings)
				OutputHandler.standard(`[${fileOutcome}] ${localRelativePath}`)
				OutputHandler.tableRow([fileOutcome, localRelativePath], tableWidth);
				jsonResultMap[localRelativePath] = fileOutcome;
			}

			// Complete Handler
			OutputHandler.standardGreen([
				">",
				"> Finished 'upload' command",
				">"
			].join("\n"))
			
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
				"result": jsonResultMap 
			});
		} catch(err) {
			OutputHandler.fatalError(err);
		}
	}
}
