/*
* TestService class that provides functionality for CRUD operations
* to be performed by the test
*/

// npm Dependencies
const program = require('commander');
const fs = require('fs');
const path = require('path');
const ngrok = require('ngrok');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/ApiUtils');
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
        return new Promise(function(good, bad) {
            function actualPoll() {
                setTimeout(function() {
                  return api.project.testrun.get({id:runTestID})
                        .then(res => {
                            res = JSON.parse(res);
                            // Everytime the result is received,
                            // Update the screen for the latest status updates
                            TestService.processResultSteps(res.steps);
                            // Wait for test status (success/failure) and
                            // then return the full results
                            if (res.status == 'success' || res.status == 'failure') {
                                good(res);
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
        let totalTime=0;
        for (let idx = 0; idx < stepArr.length; idx++) {
            let step = stepArr[idx];
            totalTime+=step.time;
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
                if ( outputStepCache[idx] == null ) {
                    outputStepCache[idx] = step;
                    let stepMsg = "[Step " + (step.idx + 1) + " - " + step.status + "]: " + step.description + " - " + step.time.toFixed(2) + "s";
                    if ( step.status == 'success' ) {
                        console.log(stepMsg);
                    } else if ( step.status == 'failure' ) {
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

                if ( outputErrorCache[idx] == null ) {
                    outputErrorCache[idx] = step;
                    let stepError = "[Step " + (step.idx+1) + " - " + step.status + "]: " + step.error.message;
                    if ( step.status == 'failure' ) {
                        console.log(stepError);
                    }
                }
            }
        }
    }

    /**
     * Make local directory to save the test report and screenshots
     * @param directory
     * @return {Promise}
     */
    static makeDir(directory) {
        return new Promise(function(good, bad) {
            let testRun = new Date().toString();
            let testDirectory = directory + "TestRun " + testRun;
            return fs.mkdir(testDirectory, function(err) {
                if (err) {
                    console.log(error("Error: An error occurred while creating the directory, Please specify a valid path"));
                    process.exit(1);
                }
                good(testDirectory);
                return;
            });
        });
    }

    /**
     * Read contents from file in local directory
     * @param file_pathname
     * @return {Promise}
     */
    static readFileContents(file_pathname) {
        let fileLocation = path.resolve(file_pathname);
        let fileContent = fs.readFileSync(fileLocation, 'utf-8');
        if (fileLocation.indexOf(fileContent) > -1) {
            console.log("ERROR: There is nothing in this file!\n");
        } else {
            return fileContent;
        }
    }

    //------------------------------------------------------------------------------
    // Test API Functions
    //------------------------------------------------------------------------------

    /**
     * Returns the test ID (if found), given the project ID AND test webPath
     * Also can be used to return node ID for test
     * @param projID
     * @param testPath
     * @return {Promise}
     */
    static testID(projID, testPath) {
        return new Promise(function (good, bad) {
            while (testPath.startsWith("/")) {
                testPath = testPath.substr(1);
            }
            return api.project.file.get({projectID:projID, filePath:testPath})
                .then(tests => {
                    tests = JSON.parse(tests);
                    tests = tests.result.children;
                    for (var i = 0; i < tests.length; i++) {
                        let test = tests[i];
                        if (test.name === testPath) {
                            good(test.id);
                            return;
                        }
                    }
                    bad("ERROR: Unable to find test script: '" + testPath +"'");
                    return;
                })
                .catch(errors => bad("ERROR: error occurred while finding the test script in the project"));
        });
    }

    /**
     * Runs a test, and returns the run GUID
     * @param projID
     * @param testID
     * @param dataParams
     * @param ngrokUrl
     * @param options
     * @returns {Promise}
     */
    static runTest(projID, scriptName, options) {
        // Get the browser config
        let form = {};
        if (options.browser != null) {
            form.browser = options.browser;
        }
        if (options.height != null) {
            form.height = options.height;
        }
        if (options.width != null) {
            form.width = options.width;
        }
        // Return promise obj
        return new Promise(function(good, bad) {
            return api.project.runAction({projectID:projID, runFile:scriptName})
                .then(res => {
                    res = JSON.parse(res);
                    if(res.testRunIDs[0]){
                        good(res.testRunIDs[0]);
                        return;
                    }
                    bad("Missing Test Run ID/Invalid JSON format");
                    return;
                })
                .catch(errors => bad("Missing Test Run ID/Invalid JSON format"));
        });
    }

    /**
     * Get result from the ID which is generated when a new test is ran
     * @param runTestID
     * @return {*}
     */
    static getResult(runTestID) {
        return APIUtils.webstudioJsonRequest(
            "GET",
            "/api/v0/test/result",
            { id : runTestID }
            )
            .then(data => {
                return data;
            })
            .catch(errors => bad(errors));
    }

    /**
     * connect localhost project to ngrok to access it from public url
     * @param port
     * @returns {Promise}
     */
    static connectToNgrok(port){
        return new Promise(function (good, bad) {
            return ngrok.connect(port, function (err, url) {
                if(err){
                    good("Unable to connect Ngrok");
                    return;
                }
                else{
                    good(url);
                    return;
                }
            });
        });
    }

    /**
     * disconnect the  tunnel from ngrok
     * @returns {Promise}
     */
    static disconnectNgrok(){
        ngrok.disconnect();
        ngrok.kill();
    }

}

module.exports = TestService;
