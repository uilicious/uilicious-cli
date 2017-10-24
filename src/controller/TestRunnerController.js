/*
* testCRUD class that provides functionality for CRUD operations
* to be performed by the test
*/

// npm Dependencies
const path = require('path');
const program = require('commander');
const fs = require('fs');
const util = require('util');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const APIUtils = require('../utils/api-utils');
const CLIUtils = require('../utils/cli-utils');
const ProjectService = require('../service/project-CRUD');
const folderCRUD = require('../service/folder-CRUD');
const ImportExport = require('./ImportExportController');
const getData = require('../features/get-data');
const TestService = require('../service/test-CRUD');

/// Output test caching, this is to prevent duplicates
/// in test steps from appearing on screen
///
/// Test steps found in this array cache is not shown on the screen on Calls
/// to ouputStep repeatingly
var outputStepCache = [];

class testCRUD {

    //------------------------------------------------------------------------------
    // Test Core Functions
    //------------------------------------------------------------------------------

    // Get result from API and return results
    // @param runTestID
    // @param [Optional] Callback to return result
    static pollForResult(runTestID, callback) {

        // Call API every 2000ms
        let pollInterval = 2000;

        return new Promise(function(good, bad) {
            function actualPoll() {
                setTimeout(function() {
                    testCRUD.getResult(runTestID, function(res) {
                        // Everytime the result is received,
                        // Update the screen for the latest status updates
                        testCRUD.processResultSteps(res.outputPath, res.steps);

                        // Wait for test status (success/failure) and
                        // then return the full results
                        if (res.status == 'success' || res.status == 'failure') {
                            good(res);
                            return;
                        } else {
                            actualPoll();
                        }
                    })
                }, pollInterval);
            }
            actualPoll();
        }).then(callback);
    }

    // Get result from API and return errors
    //@param runTestID
    // @param [Optional] Callback to return result
    static pollForError(runTestID, callback) {

        // Call API every 2500ms
        let pollInterval = 100;

        return new Promise(function(good, bad) {
            function actualPoll() {
                setTimeout(function() {
                    testCRUD.getResult(runTestID, function(res) {
                        testCRUD.processErrors(res.outputPath, res.steps);
                        if (res.status == 'success' || res.status == 'failure') {
                            good(res);
                            return;
                        } else {
                            actualPoll();
                        }
                    })
                }, pollInterval);
            }
            actualPoll();
        }).then(callback);
    }

    // Get result from API and return images
    //@param runTestID
    // @param [Optional] Callback to return result
    static pollForImg(runTestID, directory, callback) {

        // Call API every 2500ms
        let pollInterval = 2500;

        return new Promise(function(good, bad) {
            function actualPoll() {
                setTimeout(function() {
                    testCRUD.getResult(runTestID, function(res) {
                        testCRUD.processImages(res.outputPath, res.steps, directory);
                        if (res.status == 'success' || res.status == 'failure') {
                            good(res);
                            return;
                        } else {
                            actualPoll();
                        }
                    })
                }, pollInterval);
            }
            actualPoll();
        }).then(callback);
    }

    // Get result from API and return status with errors
    // @param runTestID
    // @param [Optional] Callback to return result
    static pollForStatus(runTestID, callback) {

        // Call API every 2500ms
        let pollInterval = 100;

        return new Promise(function(good, bad) {
            function actualPoll() {
                setTimeout(function() {
                    testCRUD.getResult(runTestID, function(res) {
                        testCRUD.outputStatus(res.outputPath, res.steps);
                        if (res.status == 'success' || res.status == 'failure') {
                            good(res);
                            return;
                        } else {
                            actualPoll();
                        }
                    })
                }, pollInterval);
            }
            actualPoll();
        }).then(callback);
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
                testCRUD.outputStep(remoteOutputPath, idx, step);
            }
        }
    }

    // Cycle through every step and output errors
    static processErrors(remoteOutputPath, stepArr) {
        for (let idx = 0; idx < stepArr.length; idx++) {
            let step = stepArr[idx];
            if (step.status == 'failure') {
                testCRUD.outputError(remoteOutputPath, idx, step);
            }
        }
    }

    // Cycle through every step and output images
    static processImages(remoteOutputPath, stepArr, directory) {
        for (let idx = 0; idx < stepArr.length; idx++) {
            let step = stepArr[idx];
            if (step.status == 'success' || step.status == 'failure') {
                // @TODO : (low priority), download the image after a step completes, instead of the very end
                //         Due to the async nature of the image from the test run, this will prevent very large tests
                //         from going through a very large download phase
                testCRUD.downloadImg(remoteOutputPath, step.afterImg, directory);
            }
        }
    }

    // Return the status of each step
    static formatStepOutputMsg(step) {
        return "[Step " + (step.idx+1) + " - " + step.status + "]: " + step.description + " - " + step.time.toFixed(2) + "s";
    }

    // Return each error
    static formatErrorOutput(step) {
        return "[Step " + (step.idx+1) + " - " + step.status + "]: " + step.error.message;
    }

    // Output each step
    static outputStep(remoteOutputPath, idx, step) {

        // Output each step, if its in cache, ignore duplicates
        if ( outputStepCache[idx] == null ) {
            outputStepCache[idx] = step;
            let stepMsg = testCRUD.formatStepOutputMsg(step);
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
            let stepError = testCRUD.formatErrorOutput(step);
            if ( step.status == 'failure' ) {
                console.error(stepError);
            }
        }
    }


    /// Calls and perform the download image (if needed)
    /// @param   Represent the server test workspace URI, with the output folder. Eg: "/workspace/:testid/output/""
    /// @param   image ID and name to download. Eg: "0-goTo-endin-:img-guid.png"
    /// @param   folder path to write the images into
    /// @param   callback to pass the result image data to
    /// @return  promise object to return the output data
    static downloadImg(remoteOutputPath, afterImg, localremoteOutputPath, callback) {
        return APIUtils.webstudioStreamRequest(
            fs.createWriteStream( path.join(localremoteOutputPath, afterImg) ),
            "GET",
            remoteOutputPath + afterImg,
            {},
            callback
        );
    }

    // Make local directory to save the test report and screenshots
    static makeDir(directory, callback) {
        return new Promise(function(good, bad) {
            let testRun = new Date().toString();
            let testDirectory = directory + "/TestRun " + testRun;
            fs.mkdir(testDirectory, function(err) {
                if (err) {
                    throw err;
                    process.exit(1);
                }
            });
            good(testDirectory);
            return;
        }).then(callback);
    }

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
    static runTest(projID, testID, dataParams, callback) {
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
        }).then(callback);
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

//------------------------------------------------------------------------------
//	Main Function to run test script
//------------------------------------------------------------------------------

    // Run test script from project
    static main(projname, scriptpath, options) {

        // Exit CLI if both '-d' & '-ds' are used
        if (options.data && options.datafile != null) {
            console.error(error("ERROR: Unable to accept both '-d' & '-df' options!\nPlease use either 1 option only!\n"));
            process.exit(1);
        }

        if (options.save != null) {

            testCRUD.makeDir(options.save, function(testDirectory) {
                // Test log functionality
                let testLog = testDirectory + '/log.txt';
                const logFile = fs.createWriteStream(testLog, {
                    flags: 'a',
                    defaultEncoding: 'utf8'
                });
                const logStdout = process.stdout;
                console.log = function() {
                    logFile.write(util.format.apply(null, arguments) + '\n');
                    logStdout.write(util.format.apply(null, arguments) + '\n');
                };
                console.error = console.log;

                CLIUtils.consoleLogTestDate();

                console.log("#");
                console.log("# Uilicious CLI - Runner");
                console.log("# Project Name: " + projname);
                console.log("# Script Path : " + scriptpath);
                console.log("#");

                ProjectService.projectID(projname, function(projID) {
                    console.log("# Project ID : "+projID);
                    testCRUD.testID(projID, scriptpath, function(scriptID) {
                        console.log("# Script ID  : "+scriptID);
                        if (options.datafile != null) {
                            TestService.checkPath(options.datafile).then(dataDirectory => {
                                TestService.readDataFile(options).then(dataParams => {
                                    testCRUD.runTest(projID, scriptID, dataParams)
                                        .then(postID => {
                                            console.log("# Test run ID: "+postID);
                                            console.log("#");
                                            console.log("");
                                            testCRUD.pollForResult(postID, function(finalRes) {
                                                console.log("");
                                                testCRUD.pollForStatus(postID, function(res) {
                                                    testCRUD.pollForError(postID, function(res) {
                                                        testCRUD.pollForImg(postID, testDirectory, function(res) {
                                                            console.log("Test Info saved in "+testDirectory+"\n");
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                });
                            });
                        } else if (options.data != null) {
                            getData.readDataObj(options, function(dataParams) {
                                testCRUD.runTest(projID, scriptID, dataParams)
                                    .then(postID => {
                                        console.log("# Test run ID: "+postID);
                                        console.log("#");
                                        console.log("");
                                        testCRUD.pollForResult(postID, function(finalRes) {
                                            console.log("");
                                            testCRUD.pollForStatus(postID, function(res) {
                                                testCRUD.pollForError(postID, function(res) {
                                                    testCRUD.pollForImg(postID, testDirectory, function(res) {
                                                        console.log("Test Info saved in "+testDirectory+"\n");
                                                    });
                                                });
                                            });
                                        });
                                    });
                            });
                        } else {
                            let dataParams = null;
                            TestService.runTest(projID, scriptID, dataParams)
                                .then(postID => {
                                    console.log("# Test run ID: "+postID);
                                    console.log("#");
                                    console.log("");
                                    TestService.pollForResult(postID, function(finalRes) {
                                        console.log("");
                                        testCRUD.pollForStatus(postID, function(res) {
                                            testCRUD.pollForError(postID, function(res) {
                                                testCRUD.pollForImg(postID, testDirectory, function(res) {
                                                    console.log("Test Info saved in "+testDirectory+"\n");
                                                });
                                            });
                                        });
                                    });
                                });
                        }
                    });
                });
            });

        } else {

            CLIUtils.consoleLogTestDate();

            console.log("#");
            console.log("# Uilicious CLI - Runner");
            console.log("# Project Name: " + projname);
            console.log("# Script Path : " + scriptpath);
            console.log("#");

            if (options.datafile != null) {
                ProjectService.projectID(projname).then(projID => {
                    console.log("# Project ID : "+projID);
                    TestService.testID(projID, scriptpath).then(scriptID =>  {
                        console.log("# Script ID  : "+scriptID);

                        TestService.checkPath(options.datafile).then(dataDirectory => {
                            TestService.readDataFile(options).then(dataParams => {
                                TestService.runTest(projID, scriptID, dataParams).then(postID => {
                                    console.log("# Test run ID: "+postID);
                                    console.log("#");
                                    console.log("");
                                    TestService.pollForResult(postID, function(finalRes) {
                                        console.log("");
                                        TestService.pollForStatus(postID, function(res) {
                                            TestService.pollForError(postID);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else if (options.data != null) {
                ProjectService.projectID(projname)
                    .then(projID => {
                        console.log("# Project ID : "+projID);
                        return TestService.testID(projID, scriptpath)})
                    .then(scriptID =>  {
                        console.log("# Script ID  : "+scriptID);
                        return getData.readDataObj(options) })
                    .then(dataParams => {
                            TestService.runTest(projID, scriptID, dataParams).then(postID => {
                                console.log("# Test run ID: "+postID);
                                console.log("#");
                                console.log("");
                                TestService.pollForResult(postID, function(finalRes) {
                                    console.log("");
                                    TestService.pollForStatus(postID, function(res) {
                                        TestService.pollForError(postID);
                                    });
                                });
                            });
                        });
            } else {
                ProjectService.projectID(projname).then(projID => {
                    console.log("# Project ID : "+projID);
                    TestService.testID(projID, scriptpath).then(scriptID =>  {
                        console.log("# Script ID  : "+scriptID);

                        let dataParams = null;
                        TestService.runTest(projID, scriptID, dataParams).then(postID => {
                            console.log("# Test run ID: "+postID);
                            console.log("#");
                            console.log("hello");
                            TestService.pollForResult(postID, function(finalRes) {
                                console.log("");
                                TestService.pollForStatus(postID, function(res) {
                                    TestService.pollForError(postID);
                                });
                            });
                        });
                    });
                });
            }

        }
    }
}

module.exports = testCRUD;
