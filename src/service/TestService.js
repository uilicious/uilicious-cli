/*
* TestService class that provides functionality for CRUD operations
* to be performed by the test
*/

// npm Dependencies
const program = require('commander');
const fs = require('fs');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');

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

	// Get result from API and return results
	// @param runTestID
	// @param [Optional] Callback to return result
	static pollForResult(runTestID) {

		// Call API every 2000ms
		let pollInterval = 2000;

		return new Promise(function(good, bad) {
			function actualPoll() {
				setTimeout(function() {
                    TestService.getResult(runTestID, function(res) {
						// Everytime the result is received,
						// Update the screen for the latest status updates
                        TestService.processResultSteps(res.outputPath, res.steps);

						// Wait for test status (success/failure) and
						// then return the full results
						if (res.status == 'success' || res.status == 'failure') {
							good(res);
							return;
						}
						else {
							actualPoll();
						}
					})
				}, pollInterval);
			}
			actualPoll();
		});
	}

	// Output log for test status and errors after completion
	static outputStatus(remoteOutputPath, stepArr) {
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
			console.log("Test successful with no errors.");
		}
		// Display this log if there are errors
		if (errorCount == 1) {
			console.log("Test failed with " + errorCount + " error.");
		} else if (errorCount > 1) {
			console.log("Test failed with " + errorCount + " errors.");
		}
	}

	// Cycle through every step and output those steps with 'success/failure'
	static processResultSteps(remoteOutputPath, stepArr) {
		if (stepArr == null) {
			return;
		}
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			if (step.status == 'success' || step.status == 'failure') {
                TestService.outputStep(remoteOutputPath, idx, step);
			}
		}
	}

	// Cycle through every step and output errors
	static processErrors(remoteOutputPath, stepArr) {
		for (let idx = 0; idx < stepArr.length; idx++) {
			let step = stepArr[idx];
			if (step.status == 'failure') {
                TestService.outputError(remoteOutputPath, idx, step);
			}
		}
	}

	// Return the status of each step
	static formatStepOutputMsg(step) {
	    if(step.status=='success') {
            return "[Step " + (step.idx + 1) + " - " + success(step.status) + "]: " + step.description + " - " + step.time.toFixed(2) + "s";
        }
        else {
            return "[Step " + (step.idx + 1) + " - " + error(step.status) + "]: " + step.description + " - " + step.time.toFixed(2) + "s";
        }
	}

	// Return each error
	static formatErrorOutput(step) {
		return error("[Step " + (step.idx+1) + " - " + step.status + "]: " + step.error.message);
	}

	// Output each step
	static outputStep(remoteOutputPath, idx, step) {

		// Output each step, if its in cache, ignore duplicates
		if ( outputStepCache[idx] == null ) {
			outputStepCache[idx] = step;
			let stepMsg = TestService.formatStepOutputMsg(step);
			if ( step.status == 'success' ) {
				console.log(stepMsg);
			} else if ( step.status == 'failure' ) {
				console.error(stepMsg);
			}
		}
	}

	// Output each error
	static outputError(remoteOutputPath, idx, step) {

		// Output each error
		var outputErrorCache = [];

		if ( outputErrorCache[idx] == null ) {
			outputErrorCache[idx] = step;
			let stepError = TestService.formatErrorOutput(step);
			if ( step.status == 'failure' ) {
				console.error(stepError);
			}
		}
	}


	// Make local directory to save the test report and screenshots
	static makeDir(directory, callback) {
		return new Promise(function(good, bad) {
			let testRun = new Date().toString();
			let testDirectory = directory + "TestRun " + testRun;
			fs.mkdir(testDirectory, function(err) {
				if (err) {
					console.log(error("Error: An error occurred while creating the directory, Please specify a valid path"));
					process.exit(1);
				}
			});
			good(testDirectory);
			return;
		}).then(callback);
	}

	//------------------------------------------------------------------------------
	// Test API Functions
	//------------------------------------------------------------------------------

	/// Returns the test ID (if found), given the project ID AND test webPath
	/// Also can be used to return node ID for test
	/// @param  Project ID
	/// @param  Test Path
	/// @param  [Optional] Callback to return result
	/// @return  Promise object, for result
	static testID(projID, testPath) {
		return new Promise(function (good, bad) {

			while (testPath.startsWith("/")) {
				testPath = testPath.substr(1);
			}

			APIUtils.webstudioTestRequest(
				"GET",
				"/api/studio/v1/projects/" + projID + "/workspace/tests",
				{path: testPath},
				function (tests) {
					for (var i = 0; i < tests.length; i++) {
						let test = tests[i];
						if (test.path === testPath) {
							good(test.id);
							return;
						}
					}
					console.error(error("ERROR: Unable to find test script: '" + testPath + "'\n"));
					process.exit(1);
				}
			);
		});
	}

	/// Runs a test, and returns the run GUID
	/// @param   Project ID to use
	/// @param   Test ID to use
	/// @param   [optional] callback to return run GUID
	/// @return   Promise object for result run GUID
	static runTest(projID, testID, dataParams) {
		// Get the browser config
		let form = {};
		if (program.browser != null) {
			form.browser = program.browser;
		}
		if (program.height != null) {
			form.height = program.height;
		}
		if (program.width != null) {
			form.width = program.width;
		}
		form.data = dataParams;

		// Return promise obj
		return new Promise(function(good, bad) {
			APIUtils.webstudioJsonRequest(
				"POST",
				"/api/studio/v1/projects/" + projID + "/workspace/tests/" + testID + "/runAction?cli=true",
				form,
				function(res) {
					if ( res.id != null ) {
						good(res.id);
						return;
					}
					throw new Error(error("Missing Test Run ID/Invalid JSON format"));
				}
			);
		});
	}

	// Get result from the ID which is generated when a new test is ran
	// that ID id is called the runTestID
	// @param runTestID
	// @param [Optional] Callback to return result
	static getResult(runTestID, callback) {
		return APIUtils.webstudioJsonRequest(
			"GET",
			"/api/v0/test/result",
			{ id : runTestID },
			callback
		);
	}
}

module.exports = TestService;
