/**
 * TestService class that provides functionality for test running operations
 * @author Shahin (shahin@uilicious.com)
 */

// npm Dependencies
const fs = require('fs');
const path = require('path');
const rjson = require("relaxed-json");
const ngrok = require('ngrok');
// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const api = require('../utils/api');
/// Output test caching, this is to prevent duplicates
/// in test steps from appearing on screen
///
/// Test steps found in this array cache is not shown on the screen on Calls
/// to ouputStep repeatingly
var outputStepCache = [];

class TestService {

	//------------------------------------------------------------------------------
	// Test Core Functions
	//------------------------------------------------------------------------------

	/**
	 * Get result from API and return results
	 * @param runTestID
	 * @return {Promise}
	 */
	static pollForResult(runTestID) {
		// Call API every 2000ms
		let pollInterval = 2000;
		return new Promise(function (good, bad) {
			function actualPoll() {
				setTimeout(function () {
					return api.project.testrun.get({id: runTestID})
						.then(res => {
							res = JSON.parse(res);
							// Everytime the result is received,
							// Update the screen for the latest status updates
							TestService.processResultSteps(res.result.result.steps);
							// Wait for test status (success/failure) and
							// then return the full results
							if (res.result.result.status == 'success' || res.result.result.status == 'failure') {
								good(res.result.result);
								return;
							}
							else {
								actualPoll();
							}
						}).catch(errors => bad("ERROR: Error occurred while getting the test result"))
				}, pollInterval);
			}

			actualPoll();
		});
	}

	/**
	 * Output log for test status and errors after completion
	 * @param remoteOutputPath
	 * @param stepArr
	 */
	static outputStatus(stepArr) {
		let errorCount = 0;
		if (stepArr == null) {
			return;
		}
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			if (step.status == 'failure') {
				errorCount++;
			}
		}
		// Display this log if no errors
		if (errorCount == 0) {
			return "Test successful with no errors.";
		}
		// Display this log if there are errors
		if (errorCount == 1) {
			return "Test failed with " + errorCount + " error.";
		} else if (errorCount > 1) {
			return "Test failed with " + errorCount + " errors.";
		}
	}

	/**
	 * Output log for test status and errors after completion
	 * @param stepArr
	 */
	static outputTotalTestRunningTime(stepArr) {
		if (stepArr == null) {
			return;
		}
		let totalTime = 0;
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			totalTime += step.time;
		}
		return "Total time to execute the test : " + totalTime.toFixed(2) + "s";

	}

	/**
	 * Cycle through every step and output those steps with 'success/failure'
	 * @param remoteOutputPath
	 * @param stepArr
	 */
	static processResultSteps(stepArr) {
		if (stepArr == null) {
			return;
		}
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			if (step.status == 'success' || step.status == 'failure') {
				// Output each step, if its in cache, ignore duplicates
				if (outputStepCache[idx] == null) {
					outputStepCache[idx] = step;
					let stepMsg = "[Step " + (step.idx + 1) + " - " + step.status + "]: " + step.description + " - " + step.time.toFixed(2) + "s";
					if (step.status == 'success') {
						console.log(stepMsg);
					} else if (step.status == 'failure') {
						console.error(stepMsg);
					}
				}
			}
		}
	}

	/**
	 * Cycle through every step and output errors
	 * @param remoteOutputPath
	 * @param stepArr
	 */
	static processErrors(stepArr) {
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			if (step.status == 'failure') {
				var outputErrorCache = [];

				if (outputErrorCache[idx] == null) {
					outputErrorCache[idx] = step;
					let stepError = "[Step " + (step.idx + 1) + " - " + step.status + "]: " + step.error.message;
					if (step.status == 'failure') {
						console.log(stepError);
					}
				}
			}
		}
	}

	/**
	 * Make local directory to save the test report and screenshots if not exists
	 * @param directory
	 * @return {Promise}
	 */
	static makeDirIfNotExists(directory) {
		return new Promise(function (good, bad) {
			if (!directory.endsWith("/")) {
				directory = directory + "/";
			}
			if (!fs.existsSync(directory)) {
				return fs.mkdir(directory, function (err) {
					if (err) {
						console.log(error("Error: An error occurred while creating the directory, Please specify a valid path"));
						process.exit(1);
					}
					good(directory);
					return;
				});
			}
			good(directory);
			return;
		});
	}

	/**
	 * Connect localhost project to ngrok to access it from public url
	 * @param port
	 * @returns {Promise}
	 */
	static connectToNgrok(port) {
		return new Promise(function (good, bad) {
			return ngrok.connect(port, function (err, url) {
				if (err) {
					good("Unable to connect Ngrok");
					return;
				}
				else {
					good(url);
					return;
				}
			});
		});
	}

	/**
	 * disconnect the  tunnel from ngrok
	 */
	static disconnectNgrok() {
		ngrok.disconnect();
		ngrok.kill()
	}

	/**
	 * Read file Contents
	 * @param file_pathname
	 * @returns {String}
	 */
	static readFileContents(file_pathname) {
		let fileLocation = path.resolve(file_pathname);
		let fileContent = fs.readFileSync(fileLocation, 'utf-8');
		if (fileLocation.indexOf(fileContent) > -1) {
			console.log("ERROR: There is nothing in this file!\n");
		}
		else {
			return fileContent;
		}
	}

	/**
	 * Runs a test, and returns the run GUID
	 * @param projID
	 * @param scriptName
	 * @param options
	 * @returns {Promise}
	 */
	static runTest(projID, scriptName, ngrokUrl, options) {
		// Get the browser config
		let form = {};
		if (options.browser == null) {
			form.browser = "chrome";
		}
		else {
			form.browser = options.browser;
		}
		if (options.height == null) {
			form.height = "1020px";
		}
		else {
			form.height = options.height;
		}
		if (options.width == null) {
			form.width = "1360px";
		}
		else {
			form.width = options.width;
		}
		if (options.dataObject != null) {
			form.data = rjson.transform(options.dataObject);
		}
		else if (options.dataFile != null) {
			form.data = rjson.transform(TestService.readFileContents(options.dataFile));
		}
		else {
			form.data = "{}";
		}
		if (ngrokUrl && options.ngrokParam) {
			var jsonObject = JSON.parse(form.data);
			jsonObject[options.ngrokParam] = ngrokUrl;
			form.data = JSON.stringify(jsonObject);
		}
		scriptName = scriptName.concat(".test.js");
		// Return promise obj
		return new Promise(function (good, bad) {
			return api.project.testrun.start({
				projectID: projID, runFile: scriptName, browser: form.browser, height: form.height,
				width: form.width, data: form.data, cli: "true"
			})
				.then(res => {
					res = JSON.parse(res);
					res = res.result;
					if (res.testRunIDs[0]) {
						good(res.testRunIDs[0]);
						return;
					}
					bad("ERROR: Invalid Test Run ID/Invalid JSON format");
					return;
				})
				.catch(res => {
					if (res.error.indexOf('FILE_NOT_FOUND') !== -1) {
						return bad("ERROR: Test file not found");
					}
					return bad("ERROR: Invalid Test Run ID/Invalid JSON format");
				});
		});
	}

	/**
	 * Run a test by git commit, and returns the run GUID
	 * @param projectId
	 * @param commitHash
	 * @param runFile
	 * @param ngrokUrl
	 * @param options
	 * @returns {Promise<any>}
	 */
	static runTestByGit(projectId, commitHash, runFile, ngrokUrl, options) {
		// Get the browser config
		let form = {};
		if (options.browser == null) {
			form.browser = "chrome";
		}
		else {
			form.browser = options.browser;
		}
		if (options.height == null) {
			form.height = "1020px";
		}
		else {
			form.height = options.height;
		}
		if (options.width == null) {
			form.width = "1360px";
		}
		else {
			form.width = options.width;
		}
		if(options.dataObject!=null){
			form.data = rjson.transform(options.dataObject);
		}
		else if(options.dataFile!=null){
			form.data = rjson.transform(TestService.readFileContents(options.dataFile));
		}
		else {
			form.data = "{}";
		}
		if(ngrokUrl && options.ngrokParam){
			let jsonObject = JSON.parse(form.data);
			jsonObject[options.ngrokParam] = ngrokUrl;
			form.data = JSON.stringify(jsonObject);
		}
		// Return promise obj
		return new Promise(function(good, bad) {
			return api.testrun.git.start({
				projectId: projectId, commitHash: commitHash, runFile:runFile, browser: form.browser,
				height: form.height, width: form.width, data: form.data, cli: "true"
			}).then(res => {
				res = JSON.parse(res);
				if (res.testRunIDs[0]) {
					good(res.testRunIDs[0]);
					return;
				}
				bad("ERROR: Invalid Test Run ID/Invalid JSON format");
				return;
			})
				.catch(errors => bad("ERROR: Unable to run the test file"));
		});
	}

	/**
	 * Download test run images and saved to local directory as .zip file
	 * @param testRunId
	 * @param saveToDir
	 * @returns {Promise<any>}
	 */
	static downloadTestRunImages(testRunId, saveToDir, currentUnixTimestamp) {
		// Under the Test run result folder the following file will be created
		if (!saveToDir.endsWith("/")) {
			saveToDir = saveToDir + "/";
		}
		let savedZipFile = saveToDir + currentUnixTimestamp + "-" + "images.zip";
		let fileWriteStream = fs.createWriteStream(savedZipFile);

		// Return the promise
		return new Promise(function (good, bad) {
			return api.project.testrun.images.download({id: testRunId}).pipe(fileWriteStream)
				.on('error', function (err) {
					bad("ERROR: An error occurred during download and save test run images.");
					return;
				})
				.on('close', function (data) {
					good("Successfully downloaded the test run images and saved to <" + savedZipFile + ">");
					return;
				});
		});
	}

}

module.exports = TestService;
