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
	
	aliases: ["download <project> <localdir>", "export"],
	paramsDesc: ["Unique project ID or Name", "Directory path to download files into"],
	
	desc: "Download (and overwrite) specified project files from uilicious servers",
	
	setup: (cmd) => {
		// Additional sub dir filtering
		cmd.string("--remoteFilePath <remote-file-path>", {
			description: "File path to download from instead of the project root"
		});

		// Single threaded uploading / downloading
		cmd.boolean("--sequential", {
			description: "Peform the download sequentially, this is only useful for debugging purposes"
		});

		// Safe download mode handling
		cmd.boolean("--skipExisting", {
			description: "Skip existing files instead of overwriting them",
			aliases: "--skipExisting, --skip-existing"
		})
		cmd.boolean("--skip-existing", {
			description: "(deprecated command) Skip existing files instead of overwriting them",
			hidden: true
		})
		
	},

	// Execute the run command
	run: async (argv, context) => {
		try {

			// Check for a valid directory
			try {
				await fse.ensureDir(argv.localdir);
			} catch(e) {
				OutputHandler.debug("Unexpected error", e);
				throw `Invalid local directory path : ${argv.localdir}`
			}

			// Show the valid login header
			OutputHandler.standardGreen([
				">",
				"> Login successful",
				"> Starting 'download' command",
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
			
			// Lets get the raw project file list
			let fileList = await SpaceAndProjectApi.getProjectFileList(projectObj._oid);
			fileList.sort();

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
			 * @param {String} projectPath - file path relative to the online project directory 
			 *                               (note, not from the remoteFilePath directory)
			 * 
			 * @return [status,localRelativePath], containing the final download status string, 
			 *         else false if it should be ignored - along with the localRelativePath
			 **/ 
			async function downloadProjectFile(projectPath) {

				// Local relative path refers to the path,
				// relative from the target foldeer tp download into
				let localRelativePath = projectPath;

				// Filter out files, using remoteFilePath
				// and update the localRelativePath if needed
				//-------------------------------------------------
				if( remoteFilePath && remoteFilePath.length > 0 ) {
					if( projectPath == remoteFilePath && !projectPath.endsWith("/") ) {
						// Special handling for exact match - this happens if remoteFilePath
						// is an exact matach against an existing file
						localRelativePath = path.basename(remoteFilePath);
					} else {
						// StartsWith check / fail - with remoteFilePathDir as a folder
						if( !projectPath.startsWith(remoteFilePathDir) ) {
							return [false, localRelativePath];;
						}

						// Lets remap this accordingly, note that behaviour defers 
						// accordingly if the ending "/" is given
						if( remoteFilePath.endsWith("/") ) {
							localRelativePath = projectPath.substring( remoteFilePath.length );
						} else {
							localRelativePath = projectPath.substring( remoteFilePath.length - path.basename(remoteFilePath).length );
						}

						// Lets skip if its blank (aka the folder itself)
						if( localRelativePath == "" || localRelativePath == "/" ) {
							return [false, localRelativePath];;
						}
					}
				}

				// Derive the full localFullPath
				//-------------------------------------------------
				let localFullPath = path.join(argv.localdir, localRelativePath);

				// Check if path is expected to be a folder,
				// if so, set it up, and skip it from the logging steps
				//-------------------------------------------------
				if( projectPath.endsWith("/") ) {
					await fse.ensureDir(localFullPath);
					return [false, localRelativePath];;
				}

				// Perform skip existing check
				let skipExisting = (!!argv["skipExisting"] || !!argv["skip-existing"]);

				// Get the current file exist status
				let existCheck = await fse.exists( localFullPath );

				// Perform skip existing check
				if( skipExisting && existCheck ) {
					return ["skipped", localRelativePath];
				}

				// Download the raw file data
				let fileData = await SpaceAndProjectApi.downloadProjectFile(projectObj._oid, projectPath)

				// and write it
				await FileUtil.writeAxiosFileStream(localFullPath, fileData);

				// Return the file outcome
				if( existCheck ) {
					return ["updated", localRelativePath];
				} else {
					return ["created", localRelativePath];
				}
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
			for( let i=0; i<fileList.length; ++i ) {
				// And trigger the respective downloads
				let fileItem = fileList[i];
				fileListResult[i] = queue.add(async function() { return await downloadProjectFile(fileItem) });
			}

			// Iterate the remote file list, and await its result sequentially
			for( let i=0; i<fileList.length; ++i ) {
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
				"> Finished 'download' command",
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
			OutputHandler.fatalError(err, 46);
		}
	}
}
