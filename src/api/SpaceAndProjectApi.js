/**
 * # SpaceAndProjectApi
 * 
 * Common reusable space / project api calls
 */

 //---------------------------------------------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------------------------------------------

const fs  = require("fs")
const api = require("./ApiServerConnector");
const retryForResult = require("./retryForResult");
const OutputHandler  = require("../OutputHandler")

//---------------------------------------------------------------------------------------
//
//  Implementation
//
//---------------------------------------------------------------------------------------

class SpaceAndProjectApi {

	/////////////////////////////////////////////////////////////////////
	//
	// Space listing API
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the list of spaces found 
	 * @return {Promise<List<Object>>} list of space objects, containing "_oid", "name", "userRole"
	 */
	async getSpaceList() {
		return await retryForResult( () => api.GET("/space/list") );
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Project listing / search
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the list of projects found for the user
	 * 
	 * @return {Promise<List<Object>>} list of project objects, containing '_oid', 'name', 'spaceID', 'spaceName', 'userRole'
	 */
	async getProjectList() {
		// Project listing
		let resList = [];

		// Get the space listing
		let spaceList = await this.getSpaceList();

		// For each of the spaces, call the space project list api 
		// as well and append it to the result listing
		for(let i = 0; i < spaceList.length; i++ ) {
			
			// Get the space object and ID
			let spaceObj = spaceList[i];
			let spaceID  = spaceObj["_oid"];

			// Get the result list
			let spaceRes = await retryForResult( () => api.POST(`/space/${spaceID}/project/list`, { fieldList: ['name', '_oid'] }) );
			
			// Iterate and normalize the listing
			for(let n=0; n<spaceRes.length; ++n) {
				spaceRes[n].spaceID = spaceID;
				spaceRes[n].spaceName = ""+spaceObj.name;
				spaceRes[n].userRole = spaceObj.userRole;
			}

			// Merge the result
			resList = resList.concat(spaceRes);
		}
		
		// Return the final result list
		return resList;
	}

	/**
	 * Given the project name, or the project ID in its partial form
	 * Find and return the full project ID
	 * 
	 * @param {String} searchHint search string to use for projectID and/or name
	 * @return {Promise<Object>} project object if found
	 */
	async findProject(searchHint) {
		// First lets trim the search hint
		searchHint = searchHint.trim();
		let searchHintLC = searchHint.toLowerCase();

		// Throw on short search hint
		if( searchHintLC.length <= 3 ) {
			throw "Project search string is too short, consider using a longer projectID instead";
		}

		// Get the project list
		let projectList = await this.getProjectList();
		let candidateList = [];

		// Scan through the project list
		for(let i=0; i<projectList.length; ++i) {
			let projectObj = projectList[i];

			// Exact match - lets go with it
			// no furhter searchign is requried
			if( projectObj._oid == searchHint) {
				return projectObj;
			}

			// Partial ID prefix matching
			if( projectObj._oid.toLowerCase().startsWith( searchHintLC ) ) {
				candidateList.push( projectObj );
				continue;
			}

			// Partial Name Prefix matching
			if( projectObj.name != null && projectObj.name.toString().toLowerCase().trim().startsWith( searchHintLC ) ) {
				candidateList.push( projectObj );
				continue;
			}
		}

		// Failure condition - no match found
		if( candidateList.length <= 0 ) {
			throw "No valid project found matching : "+searchHint;
		}
		
		// Lets check the candidate list for a single valid response
		if( candidateList.length == 1 ) {
			return candidateList[0];
		}

		// Final failure condition, too many matches found
		throw "Multiple projects found, use a more unique identifier instead (like projectID)";
	}

	/**
	 * Varient of findProject, where the projectID is returned instead
	 * 
	 * @param {String} searchHint search string to use for projectID and/or name
	 * @return {Promise<String>} project ID if found
	 */
	async findProjectID(searchHint) {
		return this.findProject(searchHint)._oid;
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Concurrency Checks
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the current test concurrency
	 * 
	 * @param {String} projectID to check against
	 * @return {Promise<Object>} Object containing, running, avaliable, & total count (along with other data)
	 */
	async getProjectConcurrency(projectID) {
		let res = await retryForResult( () => api.POST("/project/testrun/list/running", { projectID: projectID }), 3, null, retryForResult.rawResultAfterFilter );
		res.testruns = res.result;
		res.running = res.result.length;
		res.total = res.concurrency;
		res.avaliable = res.total - res.running;
		return res
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Project file listing / upload / download
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the list of files, within a project
	 * 
	 * @param {String} projectID to check against
	 * @return {Promise<List<String>>} list of existing files
	 */
	async getProjectFileList(projectID, type = "list") {
		return await retryForResult( () => api.POST("/project/file/query", { projectID: projectID, type: type }) );
	}

	/**
	 * Get and return the binary file inside a project
	 * 
	 * @param {String} projectID to download from
	 * @param {String} filePath to download
	 * 
	 * @return {Promise<ByteStream>} raw file binary data
	 */
	async downloadProjectFile(projectID, filePath){
		let data = {
			projectID: projectID,
			filePath: filePath,
			rawContent: "true"
		}
		return await retryForResult( () => api.POST_stream("/project/file/get", data), 3, null, (raw,num) => { return raw; } );
	}

	/**
	 * Upload the binary file inside a project
	 * 
	 * @param {String} projectID to upload from
	 * @param {String} filePath to upload
	 * @param {ByteStream} content to upload
	 * @param {Boolean} overwrite file if exist flag
	 * 
	 * @return {Promise<RawByteArray>} raw file binary data
	 */
	async uploadProjectFile(projectID, filePath, content, overwrite=true){
		let data = {
			projectID: projectID,
			filePath: filePath,
			content: content,
			overwrite: overwrite
		}
		return await retryForResult( () => api.POST("/project/file/put", data, true) );
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Test enviornment handling
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get list of enviroment
	 * 
	 * @return {Promise<List<Object>>} 
	 */
	async getEnvironmentList(projectID) {
		return await retryForResult( () => { return api.GET(`/project/environment/list`, { projectID:projectID }); } );
	}

	/**
	 * Get environment ID via the name of the dataset passed by the user
	 * 
	 * @param {String} projectID 
	 * @param {String} environmentName 
	 */
	async getEnvironmentIDViaName(projectID, environmentName) {
		// Get the environment list
		let environmentList = await this.getEnvironmentList(projectID);

		// Lets scan for an exact match
		environmentName = (""+environmentName).trim();
		let environmentID = null;
		if ( environmentList != null && environmentList.length > 0 ) {
			for ( let index=0; index< environmentList.length; index++ ) {
				if ( (""+environmentList[index].name).trim() === environmentName || environmentList[index]._oid == environmentName ) {
					environmentID = environmentList[index]._oid;
					break;
				}
			}
		}

		// Return the enviornmentID
		return environmentID
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Run a test 
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Start a test, additional testParams can be provided with the following (optional)
	 * 
	 * - browser
	 * - width
	 * - height
	 * - dataSetID
	 * - dataObject
	 * 
	 * @param {String} projectID to run test from
	 * @param {Object} testParams containing the parameters listed above 
	 * @param {String} srcCodeZip_filePath to append as byte stream, if provided
	 */
	async startProjectTest(projectID, scriptPath, testParams = {}, srcCodeZip_filePath = null) {
		// Normalize the args
		let browser    = testParams.browser || "chrome";
		let width      = testParams.width   || 1280;
		let height     = testParams.height  || 960;
		let dataSetID  = testParams.dataSetID || testParams.environmentId;
		let dataObject = testParams.data || testParams.dataObject;
		let secretData = testParams.secretData;

		// Lets prepare the request object
		let reqObj = {
			projectID: projectID,
			runFile: scriptPath,
			browser: browser,
			width: width,
			height: height,
			cli: 1
		};
		if( testParams.userAgent != null && testParams.userAgent.length >= 1 ) {
			reqObj.userAgent = testParams.userAgent;
		}
		if( dataSetID != null ) {
			reqObj["environmentId"] = dataSetID;
		} else {
			reqObj["data"] = dataObject;
			reqObj["secretData"] = secretData;
		}

		// Log the test start
		OutputHandler.debug(`> Performing test start with the following settings`);
		OutputHandler.debug(JSON.stringify(reqObj));

		// Lets start the test !
		return await retryForResult( () => { 
			if( srcCodeZip_filePath ) {
				return api.POST(`/project/testrun/start`, Object.assign({ "srcCodeZip" : fs.createReadStream(srcCodeZip_filePath) }, reqObj), true );
			}
			return api.POST(`/project/testrun/start`, reqObj);
		} );
	}
	
	/**
	 * Stop a test that was in operations
	 * 
	 * @param {Object} testID of the test
	 */
	async stopRunningTest(testID) {
		// Log the test start
		OutputHandler.debug(`> Performing test stop for ${testID}`);

		// Lets start the test !
		return await retryForResult( () => { 
			return api.POST(`/project/testrun/${testID}/stop`, {})
		} );
	}

	/////////////////////////////////////////////////////////////////////
	//
	// Processing of test results
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the test run result
	 * 
	 * @param {String} testRunID
	 */
	async getTestRunResult(testRunID) {
		return await retryForResult( () => { return api.GET(`/project/testrun/get`, { id:testRunID } ); } );
	}

	
	/////////////////////////////////////////////////////////////////////
	//
	// Project pathing handling
	//
	/////////////////////////////////////////////////////////////////////

	/**
	 * Get and return the current webstudio URL from the account
	 */
	async getWebstudioURL(apiHost) {
		// Lets get the current account hostURL
		if( apiHost.indexOf("https://api.uilicious.com/") >= 0 ) {
			return "https://client.uilicious.com/"; 
		} else if( apiHost.indexOf("https://api.uilicious-dev.com/") >= 0 ) {
			return "https://client.uilicious-dev.com/"; 
		}

		// Got the result - lets get the hostURL
		// + "/studio"; Remove base path as this will be different for on-premise installations
		let result = await retryForResult( () => api.GET("/account/info/get") ) || {};
		return result.hostURL || "https://client.uilicious.com/"; 
	}

	/**
	 * Get and return the snippet URL for the deployment
	 */
	async getPrivateSnippetURLPath(apiHost) {
		// Lets get the current account hostURL
		if( apiHost.indexOf("https://api.uilicious.com/") >= 0 ) {
			return "https://snippet.uilicious.com/embed/test/private/"; 
		} else if( apiHost.indexOf("https://api.uilicious-dev.com/") >= 0 ) {
			return "https://snippet.uilicious-dev.com/embed/test/private/"; 
		}

		// @TODO detect and provide the on premise equivalent
		// return "https://snippet.uilicious.com/embed/test/private/";
		return null;
	}

}

// Singleton export
const SpaceAndProjectApiSingleton = new SpaceAndProjectApi();
module.exports = SpaceAndProjectApiSingleton;