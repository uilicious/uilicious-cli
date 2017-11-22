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
                    return TestService.getResult(runTestID)
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
                        })
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
            console.log("Test successful with no errors.");
        }
        // Display this log if there are errors
        if (errorCount == 1) {
            console.log("Test failed with " + errorCount + " error.");
        } else if (errorCount > 1) {
            console.log("Test failed with " + errorCount + " errors.");
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
        console.log("Total time to execute the test : " + totalTime.toFixed(2) + "s");

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

            return APIUtils.webstudioTestRequest(
                "GET",
                "/api/studio/v1/projects/" + projID + "/workspace/tests",
                {path: testPath}
                )
                .then(tests => {
                    for (var i = 0; i < tests.length; i++) {
                        let test = tests[i];
                        if (test.path === testPath) {
                            good(test.id);
                            return;
                        }
                    }
                    console.error(error("ERROR: Unable to find test script: '" + testPath + "'\n"));
                    process.exit(1);
                });
        });
    }

    /**
     * Runs a test, and returns the run GUID
     * @param projID
     * @param testID
     * @param dataParams
     * @param ngrokUrl
     * @param ngrokProperty
     * @returns {Promise}
     */
    static runTest(projID, testID, dataParams, ngrokUrl, ngrokProperty) {
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
        if(ngrokUrl && ngrokProperty){
            dataParams = JSON.parse(dataParams);
            if(dataParams[ngrokProperty]){
                dataParams[ngrokProperty] = ngrokUrl;
            }
            dataParams = JSON.stringify(dataParams);
        }
        form.data = dataParams;
        // Return promise obj
        return new Promise(function(good, bad) {
            return APIUtils.webstudioJsonRequest(
                "POST",
                "/api/studio/v1/projects/" + projID + "/workspace/tests/" + testID + "/runAction?cli=true",
                form)
                .then(res => {
                    res = JSON.parse(res);
                    if ( res.id != null ) {
                        good(res.id);
                        return;
                    }
                    bad("Missing Test Run ID/Invalid JSON format");
                    return;
                });
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
            });
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
