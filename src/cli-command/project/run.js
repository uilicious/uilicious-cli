//---------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------

const sleep              = require('sleep-promise')
const Hjson              = require('hjson');
const fse                = require("fs-extra")
const path               = require("path")

const OutputHandler      = require("../../OutputHandler")
const FormatShift        = require("../../util/FormatShift")
const SpaceAndProjectApi = require("../../api/SpaceAndProjectApi")
const FileUtil           = require("../../util/FileUtil");

//---------------------------------------------------
//
//  Utility functions
//
//---------------------------------------------------

/**
 * Right pad with spaces, and no js dependencies
 * 
 * @param {String}  message to pad
 * @param {Integer} size to pad until (default 24)
 */
function rightPadSpaces(msg, size=24) {
	while(msg.length < size) {
		msg += " ";
	}
	return msg;
}

// Table width setting (if needed)
let outputTableWidth = [4, 7, 6, -1];

// Output indexing
let cliOutputIndex = 1;

/**
 * Given the step object, format it for output into OutputHandler
 * 
 * @param {Object} step object to format
 * @return {Object} normalized step object, for final JSON output
 */
function formatAndOutputStepObject(step) {

	// Lets process only completed steps (no pending steps)
	let stepIndex = cliOutputIndex;
	cliOutputIndex++;

	let stepStatus = step.status
	let stepDesc = step.description
	let stepTimeTaken = step.time

	// Check for fetch mode
	let stepMode = step.mode;
	let status = (stepMode == "fetch")?"info":stepStatus;
	
	// Lets log the step for standard mode
	if( stepMode == "fetch" ) {
		OutputHandler.standard(rightPadSpaces(`[Step ${stepIndex} - info]: `)+`${stepDesc} - ${stepTimeTaken}s`)
	} else if( stepStatus == "failure" ) {
		OutputHandler.standardRed(rightPadSpaces(`[Step ${stepIndex} - ${stepStatus}]: `)+`${stepDesc} - ${stepTimeTaken}s`)
	} else {
		OutputHandler.standard(rightPadSpaces(`[Step ${stepIndex} - ${stepStatus}]: `)+`${stepDesc} - ${stepTimeTaken}s`)
	}

	// Lets log for table mode
	OutputHandler.tableRow([stepIndex, status, stepTimeTaken, stepDesc], outputTableWidth)

	// Lets cleanup the object for output
	return {
		index: stepIndex,
		status: status,
		description: stepDesc,
		time: stepTimeTaken
	};
}

//---------------------------------------------------
//
//  Run Class Controller
//
//---------------------------------------------------

/**
 * TestRunnerSession class, this was designed to only be executed within
 * the "run" command, and faclitate the overall command maintainance
 * 
 * This class is **NOT** designed for usage outside of this file/use case.
 */
class TestRunnerSession {

	/**
	 * Empty constructor
	 */
	constructor() {
		// The constructor itself does nothing, use the `initialSetup` command instead
	}

	//--------------------------------------------
	// Initial class setup / run steps
	//--------------------------------------------

	/**
	 * Initalize the TestRunnerSession with the provided CLI variables 
	 * 
	 * Handles the bulk of the initial processing of args
	 * 
	 * @param {Object} argv 
	 * @param {Object} context 
	 */
	async S01_initialSetup(argv, context) {

		// Lets quickly prepare the zip file concurrently
		//---------------------------------------------------------------

		let testCodeDir = argv.testCodeDir || argv["test-dir"];
		if( testCodeDir ) {
			this.testCodeDir = testCodeDir;

			// This intentionally do not await, until later (to optimize zip times)
			this.testCodeDir_zipPromise = FileUtil.prepareSrcCodeZipFile( testCodeDir );
			this.testCodeDir_zipFile = null
		}

		// Get the basic values
		//---------------------------------------------------------------

		// Get the webstudio / snippet URL
		let assumeOnPremise = false
		if( !(
			argv.apiHost.indexOf("https://api.uilicious.com/v3.0") >= 0 || 
			argv.apiHost.indexOf("https://api.uilicious-dev.com/v3.0") >= 0
		) ) {
			assumeOnPremise = true;
		}

		// The webhost / snipper URL (if not on premise)
		let webstudioURL      = null;
		let privateSnippetURL = null;

		// Fetching, after on premise check
		if( !assumeOnPremise ) {
			webstudioURL      = await SpaceAndProjectApi.getWebstudioURL(argv.apiHost);
			privateSnippetURL = await SpaceAndProjectApi.getPrivateSnippetURLPath(argv.apiHost);
		} else {
			// Best guess the webstudio URL
			webstudioURL = argv.apiHost.split("/api/")[0]+"/webstudio"
		}

		// Normalize ending slash
		if( webstudioURL.endsWith("/") ) {
			webstudioURL = webstudioURL.slice(0, webstudioURL.length - 1)
		}
		if( privateSnippetURL != null && privateSnippetURL.endsWith("/") ) {
			privateSnippetURL = privateSnippetURL.slice(0, privateSnippetURL.length - 1)
		}

		// Get the full project listing (after login)
		let projectObj = await SpaceAndProjectApi.findProject(argv.project);
		let projectID = projectObj._oid;

		// Script path and browser settings
		let scriptPath = argv["script-path"];
		let userAgent  = argv.userAgent || null;
		let browser = argv.browser || "chrome";
		let width   = argv.width   || 1280;
		let height  = argv.height  || 960;
		let region  = argv.region  || "default";
		let dataSet = argv.dataset || argv.dataSet;
		let disableSystemErrorRetry = !!argv.disableSystemErrorRetry;

		// Project start timeout in minutes
		let startTimeout = Math.max(argv.startTimeout || argv["start-timeout"] || 15, 0);

		// Test start timeout handling - in seconds
		let startTimeout_sec = startTimeout * 60; 
		let startTimeout_ms = startTimeout_sec * 1000; 

		// Normalized scriptPath (with .test.js)
		let normalizedScriptPath = scriptPath;
		if(!normalizedScriptPath.endsWith(".test.js")) {
			normalizedScriptPath = scriptPath+".test.js"
		}
		if( normalizedScriptPath.startsWith("/") ) {
			normalizedScriptPath.substring(1)
		}

		// URI encode special characters like "/" to "%2F"
		let uriEncodedScriptPath = encodeURIComponent(normalizedScriptPath)

		// Process the dataSet / dataObject
		//---------------------------------------------------------------

		// Obtain the datasetID if the param is passed
		let dataSetID = null;
		if(dataSet != null) {
			dataSetID = await SpaceAndProjectApi.getEnvironmentIDViaName(projectID, dataSet);
			if( dataSetID == null || dataSetID == "" ) {
				throw `Invalid Data Set Name (does not exist?) : ${dataSet}`
			}
			OutputHandler.debug(`> DataSet ID: ${dataSetID}`)
		}

		// dataObject
		let dataObject = argv["dataObject"];
		let secretObject = argv["secretObject"];

		// Map all the comptued variables
		//---------------------------------------------------------------

		this.assumeOnPremise   = assumeOnPremise;
		this.webstudioURL      = webstudioURL;
		this.privateSnippetURL = privateSnippetURL;
		this.projectObj        = projectObj;
		this.projectID         = projectID;
		this.scriptPath        = scriptPath;
		this.browser           = browser;
		this.width             = width;
		this.height            = height;
		this.region            = region;
		this.dataSet           = dataSet;
		this.userAgent         = userAgent;
		this.startTimeout      = startTimeout;
		this.startTimeout_sec  = startTimeout_sec;
		this.startTimeout_ms   = startTimeout_ms;
		this.dataSetID         = dataSetID;
		this.dataObject        = dataObject;
		this.secretObject      = secretObject;

		this.normalizedScriptPath    = normalizedScriptPath;
		this.uriEncodedScriptPath    = uriEncodedScriptPath;
		this.disableSystemErrorRetry = disableSystemErrorRetry;

		// Initialize the internal startTimeoutLoggedFlag 
		this.startTimeoutLoggedFlag = false;

		// Return itself
		return this;
	}

	/**
	 * Output to stdout the test run parameters if applicable
	 */
	async S02_outputSetupParams() {
		// Log project name + id
		OutputHandler.standardGreen([
			`> Project Name: ${this.projectObj.name}`,
			`> Project ID:   ${this.projectObj._oid}`,
			`> Browser:      ${this.browser}`,
			`> Region:       ${this.region}`,
			`> Resolution:   ${this.width}x${this.height}`,
			`> Script Path:  ${this.normalizedScriptPath}`,
		].join("\n"))

		// Log the data set if its present
		if( this.dataSet != null ) {
			OutputHandler.standardGreen(
				`> Data Set:     ${this.dataSet}`
			)
		}
		// Log the test dir if present
		if( this.testCodeDir != null ) {
			OutputHandler.standardGreen(
				`> Test Dir:     ${this.testCodeDir}`
			)
		}
		// Custom UA
		if( this.userAgent != null ) {
			OutputHandler.standardGreen(
				`> User Agent:   ${this.userAgent}`
			)
		}
		OutputHandler.standardGreen(">")
	}

	//--------------------------------------------
	// Internal Steps
	//--------------------------------------------

	/**
	 * Validate the current script pathing - throws error on error
	 */
	async validateScriptPath() {
		// Check against the local files
		if( this.testCodeDir != null ) {
			let check = await fse.pathExists( path.resolve(this.testCodeDir, this.normalizedScriptPath) );
			if( !check ) {
				OutputHandler.fatalError(`Invalid Script Path (does not exist?) : ${this.normalizedScriptPath}`, 15);
				process.exit(15);
			}
			return true;
		}

		// Check against the API
		let fileList = await SpaceAndProjectApi.getProjectFileList(this.projectObj._oid);
		if( fileList.indexOf( this.normalizedScriptPath ) < 0 ) {
			OutputHandler.fatalError(`Invalid Script Path (does not exist?) : ${this.normalizedScriptPath}`, 15);
			process.exit(15);
		}
		return true;
	}
	
	/**
	 * Attempts to perform a test run
	 * and returns the test run ID
	 * 
	 * Fails hard, and exits if no concurrency is subscribed in the account
	 */
	async attemptTestRunStart() {

		// Get concurrency first
		// And log it if its currently exceeded
		let concurrency = await SpaceAndProjectApi.getProjectConcurrency( this.projectID );

		// Plan is not allowed to run test : Fail now - HARD !
		if( concurrency.total <= 0 ) {
			OutputHandler.fatalError(`No concurrency avaliable (total=0) - please update your settings / concurrency plan`, null, 16);
			process.exit(16)
		}

		// Safety net, due to the possibility of file renaming race condition: validate script path
		// also terminate quickly tests, with invalid filepaths
		await this.validateScriptPath();

		// Skip, as concurrency is not sufficent (existing test runs)
		if( concurrency.avaliable <= 0 ) {
			OutputHandler.standard(`> Maximum test concurrency exceeded (${concurrency.running}/${concurrency.total}) ... `)
			if( this.startTimeoutLoggedFlag != true ) {
				OutputHandler.standard(`> Start Timeout : ${this.startTimeout} minutes - CLI will automatically retry till timeout`)
				this.startTimeoutLoggedFlag = true;
			}
			return null;
		}

		// Attempt to start the project - and log the error
		try {
			// The starting request param
			let startRequestParams = {  
				browser:    this.browser,
				width:      this.width,
				height:     this.height,
				// We set both region, and serverRegion for backwards compatibility reasons
				region:     this.region,
				serverRegion: this.region,
				// Rest is as per normal
				dataSetID:  this.dataSetID,
				data:       this.dataObject,
				secretData: this.secretObject,
				userAgent:  this.userAgent
			};

			// Start the test
			let result = await SpaceAndProjectApi.startProjectTest( //
				this.projectID, this.normalizedScriptPath, //
				startRequestParams, this.testCodeDir_zipFile //
			); //

			// Lets get the testRunID if valid
			let testRunIDs = result.testRunIDs;
			if( testRunIDs == null || testRunIDs.length <= 0 ) {
				throw `Missing testRunID in response`;
			}

			// Get the test run ID
			let testRunID = testRunIDs[0];

			// Reset and initialize the internal testID, and printed steps output status
			this.testID = testRunID;
			this.processedTestRunSteps = [];
			this.jsonOutputObj = {
				testID: this.testID,
				status: "unknown",
				steps: this.processedTestRunSteps
			}

			// Return the testID
			return testRunIDs[0];
		} catch(err) {
			// Get the error object where applicable
			let errObj = err.ERROR || err.error || err;
			// Unwrap any error message / code
			let errOut = errObj.message || errObj.code || errObj;

			// Get the error code, and check against the known fatal error list
			let fatalErrorCodeList = [
				"ERR_ACCOUNT_SUSPENDED", 
				"SPACE_NOT_FOUND", "PROJECT_NOT_FOUND", "BILLING_ACCOUNT_NOT_FOUND", 
				"PLAN_NOT_FOUND", "FEATURE_DISABLED", "SPACE_DISABLED"
			]
			let errCode = errObj.code || "";
			if( fatalErrorCodeList.indexOf(errCode) >= 0 ) {
				OutputHandler.fatalError(`${errOut}`, null, 16);
				process.exit(16);
			}

			// Output the error
			OutputHandler.standard(`> Error starting test - CLI will retry due to start error : ${errOut}`)
			if( !this.startTimeoutLoggedFlag ) {
				OutputHandler.standard(`> Start Timeout : ${this.startTimeout} minutes - CLI will automatically retry till timeout`)
				this.startTimeoutLoggedFlag = true;
			}
		}

		// Returns nothing (no valid testID)
		return null;
	}

	/**
	 * Fetches and process the current test run status
	 * 
	 * Returns if a valid status if its returned, null if no valid status is reached.
	 * Logs the test steps output as it happens
	 */
	async fetchAndOutputTestRunStatus() {
		
		// Get the persistent data
		//----------------------------

		// Variable initialization safety
		if(
			this.testID == null || 
			this.processedTestRunSteps == null ||
			this.jsonOutputObj == null
		) {
			throw "Unable to fetch and output test run status : testID is not set"
		}

		// The persistent data objects
		let processedTestRunSteps = this.processedTestRunSteps;
		let jsonOutputObj = this.jsonOutputObj;

		// Get the test response
		//----------------------------

		// Get the test response
		let testResponse = await SpaceAndProjectApi.getTestRunResult(this.testID);

		// Unwrap the data - where possible
		let testRunResult = testResponse.result
		// Check and skip result object, return null
		if( testRunResult == null ) {
			return null
		}

		// Get the test steps
		let testRunSteps = testRunResult.steps

		// Remember where to print out the steps after each loop
		let startFromIndex = 0;
		if (processedTestRunSteps.length === 0) {
			startFromIndex = 0
		} else {
			startFromIndex = processedTestRunSteps.length
		}
	
		// Printing out all the result from the startFromIndex
		for (let index = startFromIndex; index < testRunSteps.length; index++) {
			// Get the test run step
			let step = testRunSteps[index]
			if (
				step.status === "success" || 
				step.status === "error" || 
				step.status === "failure" || 
				step.status === "terminated" || 
				step.status === "system_error" 
			) {
				// Lets log the first step timing
				if(index >= 0 && this._firstStepTimeMS == null) {
					this._firstStepTimeMS = Date.now();
					this._firstStepTimeTakenMS = this._firstStepTimeMS - this._startTimeMS;
				}

				// Lets log the output, and pushed it into the processed step list
				processedTestRunSteps.push(formatAndOutputStepObject(step));
			} else {
				// Minor additional delay for "pending" steps
				if( index <= 5 ) {
					// For first 5 steps, lets, reduce the the "wait" between steps
					// await sleep(100+Math.random()*50)
					await sleep(10)
				} else {
					// 1s awaits min
					await sleep(1000+Math.random()*150)
				}
			}

			// Minimum 10 ms delay between step - makes outputs more readable
			// bottle neck would have been in the test steps anyway
			await sleep(10);
		}

		// Lets see if test is fully completed
		// if so return and break the loop
		let testRunStatus = testRunResult.status
		if (
			testRunStatus === "success" || 
			testRunStatus === "error" || 
			testRunStatus === "failure" || 
			testRunStatus === "terminated" || 
			testRunStatus === "system_error" 
		) {
			// Update the JSON object
			jsonOutputObj.status = testRunStatus;
			jsonOutputObj.steps = processedTestRunSteps;

			// Return test status
			return testRunStatus
		}

		// Pending status
		if(
			testRunStatus === "init" ||
			testRunStatus === "created" ||
			testRunStatus === "pending"
		) {
			// No final status, return nothing
			return null
		}

		// Unknown / Invalid status
		OutputHandler.standardRed(`> Unexpected test status (will treat it as system_error) : ${testRunStatus}`)
		return "system_error"
	}

	//--------------------------------------------
	// Core Test Running Loop
	//--------------------------------------------

	/**
	 * Kicks off the really long core test run loop
	 * Which will start, and retry the various test runs when needed
	 * While fetching the various result status
	 * 
	 * Returns when test is finish
	 */
	async S50_coreTestRunLoop() {

		// Get the initial start time / timeout time
		// Note this is resetted in event of system errors
		let startTimeMS = Date.now();
		let startTimeoutTimeMS = startTimeMS + this.startTimeout*this.startTimeout_ms;

		// save the start time
		this._startTimeMS = startTimeMS;

		// The final test result status
		let finalTestStatus = null;

		// The actual testID
		let testID = null;

		// Max startRetries - this is acrossed ALL test starts
		// including system_error resets.
		//
		// This is approximately 2 hours  
		// excluding any test run time
		let maxTestStarts = 130;

		// Successful test start
		let successfulTestStarts = 0;

		// Prepare testScript ZIP (if being used)
		if( this.testCodeDir ) {
			OutputHandler.standardGreen(`> Preparing test script files for upload ... `);
			await this.validateScriptPath();
			this.testCodeDir_zipFile = await this.testCodeDir_zipPromise;
			OutputHandler.standardGreen(`> Preparing test script files for upload ... Ready `);
			OutputHandler.standardGreen(`> `);
		}

		// ------------------------------
		// Lets start the core loop !!!
		// ------------------------------
		for(let t=0; t<maxTestStarts; ++t) {
			
			// Check for test start timeout
			// if reached - performs a hard exit
			if( t > 0 && Date.now() >= startTimeoutTimeMS ) {
				OutputHandler.fatalError(`Failed to start test - Exceeded Start Timeout : ${startTimeout} minutes`, null, 18);
				process.exit(18);
			}

			// Check for too many test starts
			// abort accordingly
			if( successfulTestStarts > 5 ) {
				OutputHandler.fatalError(`Aborting - ${successfulTestStarts} tests were executed with system errors, please contact uilicious support`, null, 18);
				process.exit(18);
			}

			// Lets try to start, and get the test ID
			testID = await this.attemptTestRunStart();

			// Great test started? - lets process it
			//---------------------------------------------------------------
			if( testID != null ) {
				// Increment the valid starts
				++successfulTestStarts;

				// Assume the test start time, and handle its loop timeout
				let testRunStartTimeMS = Date.now()
				let testRunTimeoutMS   = testRunStartTimeMS + (60+5) * 60 * 1000;

				// Ouput the testRunID header (if needed)
				OutputHandler.standardGreen([
					`> Test Run ID:  ${testID}`,
				].join("\n"))
				OutputHandler.standardGreen("----------------------------------------")

				// lets poll for its result
				while( Date.now() < testRunTimeoutMS ) {
					// Get the status (if possible)
					finalTestStatus = await this.fetchAndOutputTestRunStatus();
	
					// If status is system error - break and retry
					if( finalTestStatus == "system_error" ) {

						// Check if SYSTEM_ERROR retries are disabled
						// if so performs a hard abort
						if( this.disableSystemErrorRetry ) {
							OutputHandler.fatalError(`Aborting - ${successfulTestStarts} tests were executed with system errors, with --disableSystemErrorRetry`, null, 18);
							process.exit(18);
						}

						// Handle the SYSTEM_ERROR, and restarts
						OutputHandler.standard("> ----------------------------------------------------------------")
						OutputHandler.standard(`> !!! Test faced a SYSTEM_ERROR`)
						OutputHandler.standard(`>     CLI will restart and retry the test automatically`)
						OutputHandler.standard("> ----------------------------------------------------------------")
						this.startTimeoutLoggedFlag = false;

						// Break the result fetch polling
						break;
					}

					// If status is anything else - lets end the test accordingly
					// Break on valid status
					if( finalTestStatus != null ) {
						break;
					}
				}
			}

			// Was there a finalTestStatus - lets return it
			//---------------------------------------------------------------
			if( finalTestStatus != null ) {
				this.finalTestStatus = finalTestStatus;
				return finalTestStatus;
			}

			// Aww snap - either test failed to start, or a system error occured
			// we need to loop with a slight delay
			//---------------------------------------------------------------

			// Does a minimum of 10 seconds wait
			// To a maximum of 60 seconds + 100 ms jitter wait
			await sleep(
				(Math.min(t, 6))*10*1000 + Math.random()*100
			)
		}
	}

	//--------------------------------------------
	// Final Test Result Handling
	//--------------------------------------------

	/**
	 * Output the final result in various formats
	 * And TERMINATES the cli
	 */
	async S91_finalTestResultOutput() {
		
		// Prepare the final result msg
		let resultMsg = [
			"----------------------------------------",
			">",
			`> Test result: ${this.finalTestStatus}`,
			">"
		];

		// Get the test time taken (from CLI point of view)
		let startTimeMS = this._startTimeMS;
		let timeTakenMS = Date.now() - this._startTimeMS;

		// Inject the various URL links
		if( !this.assumeOnPremise ) {
			// Into the result message
			if( this.testCodeDir == null ) {
				resultMsg.push(`> See full results at   : ${this.webstudioURL}/project/${this.projectID}/editor/${this.uriEncodedScriptPath}?testRunId=${this.testID}`)
			}
			resultMsg.push(`> See result snippet at : ${this.privateSnippetURL}/${this.testID}`)
			resultMsg.push(">")

			// Or json
			this.jsonOutputObj.webstudioURL = `${this.webstudioURL}/project/${this.projectID}/editor/${this.uriEncodedScriptPath}?testRunId=${this.testID}`;
			this.jsonOutputObj.snippetURL = `${this.privateSnippetURL}/${this.testID}`;
		} else {
			
			// This is the on-premise version !!!

			// Into the result message
			if( this.testCodeDir == null ) {
				resultMsg.push(`> See full results at   : ${this.webstudioURL}/project/${this.projectID}/editor/${this.uriEncodedScriptPath}?testRunId=${this.testID}`)
			}
			resultMsg.push(">")

			// Or json
			this.jsonOutputObj.webstudioURL = `${this.webstudioURL}/project/${this.projectID}/editor/${this.uriEncodedScriptPath}?testRunId=${this.testID}`;
		}

		// Lets add in the CLI debugging information
		this.jsonOutputObj._cli = this.jsonOutputObj._cli || {};
		this.jsonOutputObj._cli.testTimeTaken_ms = timeTakenMS;
		this.jsonOutputObj._cli.firstStepTimeTaken_ms = this._firstStepTimeTakenMS;

		// Handle JSON output
		OutputHandler.json( this.jsonOutputObj )

		// Output final command status, and exit
		if( this.finalTestStatus == "success" ) {
			OutputHandler.standardGreen( resultMsg.join("\n") )
			process.exit(0)
		} else {
			OutputHandler.standardRed( resultMsg.join("\n") )
			process.exit(14)
		}
	}

	//--------------------------------------------
	// interruption Handling
	//--------------------------------------------

	/**
	 * Custom handler for SIGINT - note that this is not guranteed
	 */
	async handle_interrupt() {
		// Handle repeat interrupt
		if( this._interrupted ) {
			OutputHandler.standardRed(' [HALT] Repeated Interrupt detected, exiting now (test termination is not guranteed)');
			process.exit(2);
		}

		// Flag the interrupt
		this._interrupted = true;

		// First time interrupt
		OutputHandler.standardRed(' [HALT] Interrupt detected, performing process cleanup');
		OutputHandler.standardRed(`Current Test ID : ${this.testID} - Current Test Status : ${this.finalTestStatus}`);
		if( this.finalTestStatus == null && this.testID != null ) {
			OutputHandler.standardRed(`Terminating test ...`);
			await SpaceAndProjectApi.stopRunningTest(this.testID);
		} else {
			OutputHandler.standardRed(`Skipping test termination sequence - missing a valid test ID (test termination is not guranteed)`);
		}
		process.exit(2);
	}
}



//---------------------------------------------------
//
//  Command Definition
//
//---------------------------------------------------

module.exports = {
	
	flags: "run <project> <script-path>",
	desc: "Run a test file in a given project",
	
	paramsDesc: ["Unique project ID or Name", "Script path, relative to project folder"],
	
	setup: (cmd) => {
		cmd.string("--browser <browser>", {
			description: "[default: 'chrome']  chrome, firefox, edge, safari, ie11"
		});
		cmd.number("--width   <width>", {
			description: "[default: 1280]      Browser width to use (in px)"
		});
		cmd.number("--height  <height>", {
			description: "[default: 960]       Browser height to use (in px)"
		});
		cmd.string("--region  <region-name>", {
			description: "[default: 'default'] Browser region to use (chrome, firefox, edgechromium only)"
		});
		cmd.string("--dataset <set-name>", {
			hidden: true,
			description: "Dataset to use, belonging to your account and project"
		});
		cmd.string("--dataSet <set-name>", {
			description: "Dataset to use, belonging to your account and project"
		});

		cmd.string("--dataObject <json-string>", {
			description: "Dataset to use, passed as a JSON object string"
		});
		cmd.file("--dataFile <file-path>", {
			description: "Dataset to use, passed as a JSON file"
		});

		cmd.string("--secretObject <json-string>", {
			description: "Dataset to use, passed as a JSON object string"
		});
		cmd.file("--secretFile <file-path>", {
			description: "Dataset to use, passed as a JSON file"
		});

		cmd.file("--testCodeDir <test-dir>", {
			description: "Directory to upload and use for code files, this is used instead of the existing files on uilicious platform"
		});
		
		cmd.number("--startTimeout <start-timeout>", {
			description: "[default: 15]  Max number of minutes to wait, if concurrency is fully used"
		});
		cmd.boolean("--disableSystemErrorRetry", {
			description: "Disable CLI automated retries when uilicious SYSTEM_ERROR occurs"
		});
		cmd.string("--userAgent <userAgent>", {
			description: "Custom user agent if set, works only with chrome (ignored by other browsers)"
		});

		cmd.check((argv,context) => {

			//------------------------------------------------------------------
			//   Browser Checking
			//------------------------------------------------------------------

			// Get and normalize the browser
			let browser = argv.browser || "chrome";

			// Normalize the browser string
			browser = (browser || "chrome").toLowerCase().trim();
			browser = browser.replace(/\s/g,"");
			browser = browser.replace(/\-/g,"");

			// Validate the browser string
			let validBrowserList = [
				"chrome", 
				"firefox", 
				"edge", 
				"edgechromium",
				"edgelegacy",
				"edge2019",
				"safari", 
				"ie11"
			];
			if( validBrowserList.indexOf(browser) < 0 ) {
				OutputHandler.cliArgumentError( `Unknown Browser Selected : ${browser}\nPlease use one of the following browsers: `+validBrowserList.join(", ") )
			}

			// Browser remapping
			if( browser.startsWith("edge") ) {
				if( browser == "edge" || browser == "edgechromium" ) {
					browser = "edgechromium";
				} else {
					browser = "edge";
				}
			}

			argv.browser = browser;
			
			//------------------------------------------------------------------
			//   Region Checking
			//------------------------------------------------------------------

			// Get the current region selected
			let region = argv.region || argv["region-name"] || "default";

			// Normalize to lower case
			region = region.toLowerCase();

			// The full region list to check against
			let regionList = [
				"default",
				"unitedkingdom",
				"hongkong",
				"singapore",
				"usa-newyork",
				"usa-sanfranc",
				"canada-toronto",
				"india-bangalore",
				"netherlands-amsterdam",
				"germany-frankfurt",
				"indonesia-jarkata",
			]

			// Common aliases
			let regionAlias = {
				"netherlands": "netherlands-amsterdam",
				"amsterdam": "netherlands-amsterdam",
				"india" : "india-bangalore",
				"bangalore" : "india-bangalore",
				"canada" : "canada-toronto",
				"toronto" : "canada-toronto",
				"germany": "germany-frankfurt",
				"frankfurt": "germany-frankfurt",
				"indonesia": "indonesia-jarkata",
				"jarkata": "indonesia-jarkata",
				"usa": "usa-newyork",
				"newyork": "usa-newyork",
				"sanfranc": "usa-sanfranc"
			}

			// If region is an alias, remap it
			if( regionAlias[region] ) {
				region = regionAlias[region];
			}

			// Check if the region is in the list
			if( regionList.indexOf(region) < 0 ) {
				OutputHandler.cliArgumentError( `Unknown region selected : ${region}\nPlease use one of the following regions: `+regionList.join(", ") )
			}

			// Save back the region settings
			argv.region = region;
			
			//------------------------------------------------------------------
			//   DataSet / Object / File Checking
			//------------------------------------------------------------------

			//
			// Get the data arguments
			//
			let dataSet = argv.dataset || argv.dataSet;
			argv.dataSet = dataSet;
			let dataObject = argv.dataObject;
			let dataFile = argv.dataFile;
			let secretObject = argv.secretObject;
			let secretFile = argv.secretFile;

			//
			// Lets check for duplicate data sets
			//
			if( dataSet ) {
				if( secretObject || secretFile || dataObject || dataFile ) {
					throw `Multiple DATA sources detected 'dataSet' cannot be used with 'dataObject/dataFile/secretObject/secretFile'`
				}
			}
			if( dataFile && dataObject ) {
				throw `Multiple DATA sources detected 'dataFile' cannot be used with 'dataObject'`
			}
			if( secretFile && secretObject ) {
				throw `Multiple DATA sources detected 'secretFile' cannot be used with 'secretObject'`
			}

			//
			// Lets validate and normalize dataFile -> dataObject
			//
			let dataJsonObj = null;
			if( dataObject ) {
				try {
					// Fixing the dataObject / dataJsonObject formatting
					dataJsonObj = Hjson.parse( dataObject );
					if( dataJsonObj == null ) {
						OutputHandler.cliArgumentError( `Invalid format for dataObject (is it a valid JSON?) : ${dataObject}` )
					}

					// Looks ok, lets normalized it to dataObject
					argv.dataObject = JSON.stringify( dataJsonObj );
				} catch(e) {
					OutputHandler.errorMessage(e);
					OutputHandler.cliArgumentError( `Invalid format for dataObject` )
				}
			}
			if( dataFile ) {
				if( !fse.existsSync(dataFile) ) {
					OutputHandler.cliArgumentError( `Missing dataFile : ${dataFile}` )
				}

				try {
					let fileStr = fse.readFileSync(dataFile).toString()
					if( fileStr == null || fileStr.trim().length <= 0 ) {
						OutputHandler.cliArgumentError( `Empty dataFile : ${dataFile}` )
					}

					dataJsonObj = Hjson.parse( fileStr );
					if( dataJsonObj == null ) {
						OutputHandler.cliArgumentError( `Invalid dataFile format (not a proper json object) : ${dataFile}` )
					}

					// Looks ok, lets normalized it to dataObject
					argv.dataObject = JSON.stringify( dataJsonObj );
				} catch(e) {
					console.error(e)
					OutputHandler.cliArgumentError( `Invalid format for dataFile : ${dataFile}` )
				}
			}

			//
			// Lets validate and normalize secretFile -> secretObject
			//
			let secretJsonObj = null;
			if( secretObject ) {
				try {
					// Fixing the dataObject / dataJsonObject formatting
					secretJsonObj = Hjson.parse( secretObject );
					if( secretJsonObj == null ) {
						OutputHandler.cliArgumentError( `Invalid format for secretObject (is it a valid JSON?) : [redated]` )
					}

					// Looks ok, lets normalized it to dataObject
					argv.secretObject = JSON.stringify( secretJsonObj );
				} catch(e) {
					console.error(e)
					OutputHandler.cliArgumentError( `Invalid format for secretObject` )
				}
			}
			if( secretFile ) {
				if( !fse.existsSync(secretFile) ) {
					OutputHandler.cliArgumentError( `Missing secretFile : ${secretFile}` )
				}

				try {
					let fileStr = fse.readFileSync(secretFile).toString()
					if( fileStr == null || fileStr.trim().length <= 0 ) {
						OutputHandler.cliArgumentError( `Empty secretFile : ${secretFile}` )
					}

					secretJsonObj = Hjson.parse( fileStr );
					if( secretJsonObj == null ) {
						OutputHandler.cliArgumentError( `Invalid secretFile format (not a proper json object) : ${secretFile}` )
					}

					// Looks ok, lets normalized it to secretObject
					argv.secretObject = JSON.stringify( secretJsonObj );
				} catch(e) {
					OutputHandler.errorMessage(e)
					OutputHandler.cliArgumentError( `Invalid format for secretFile : ${secretFile}` )
				}
			}

			// Normalize dataObject, if secretObject is enabled
			if( argv.secretObject && argv.secretObject.length > 2 ) {
				if( argv.dataObject == null || argv.dataObject.length <= 2 ) {
					argv.dataObject = {};
				}
			}

			//
			// Validate the script path
			//
			let scriptPath = argv["script-path"]
			if( scriptPath == null || scriptPath == "" ) {
				OutputHandler.cliArgumentError( `Test runs require a valid script-path: ${scriptPath}` )
			}
		});
	},

	// Execute the run command
	run: async (argv, context) => {
		try {
			
			// Log initial command
			//---------------------------------------------------------------

			OutputHandler.standardGreen([
				">",
				"> Login successful",
				"> Starting 'run' command",
				">"
			].join("\n"))

			// Output the table header formatting (if needed)
			OutputHandler.tableHeader(["step", "status", "time", "description"], outputTableWidth)
			
			// Lets setup the test runner class
			let testRunner = new TestRunnerSession();

			// Handle system interrupts
			// catch ctrl+c event and exit normally
			process.on('SIGINT', function () { testRunner.handle_interrupt(); });
			process.on('SIGTERM', function () { testRunner.handle_interrupt(); });

			// Perform initial setup
			await testRunner.S01_initialSetup(argv, context);

			// Run the various test run steps and output
			await testRunner.S02_outputSetupParams();
			await testRunner.S50_coreTestRunLoop();

			// Final output and termination
			await testRunner.S91_finalTestResultOutput();

		} catch(err) {
			OutputHandler.fatalError(err, 49);
		}
	}
}
