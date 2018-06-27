/**
 *TestRunnerController class responds to run command
 *in the command line
 *@author Shahin (shahin@uilicious.com)
 */

// npm Dependencies
const fs = require('fs');
const util = require('util');
const rjson = require("relaxed-json");

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const CLIUtils = require('../utils/CliUtils');
const ProjectService = require('../service/ProjectService');
const TestService = require('../service/TestService');
const APIUtils = require('../utils/ApiUtils');

class TestRunnerController {


//------------------------------------------------------------------------------
//	Main Function to run test script
//------------------------------------------------------------------------------

    /**
     *Run test script from project
     *@param projectName
     *@param scriptPath
     *@param options
     *@return {Promise.<TResult>}
     */
    static main(projectName, scriptPath, options) {
        let errorCount;
        let copyNgrokUrl;
        if (options.save != null) {
            let copyTestDirectory;
            let copyTestRunId;
            let currentUnixTimestamp = (new Date()).getTime()+"";
            return TestService.makeDirIfNotExists(options.save)
                .then(testDirectory => {
                    // Test log functionality
                    copyTestDirectory = testDirectory;
                    let testLog = testDirectory +currentUnixTimestamp+"-"+ 'log.txt';
                    const logFile = fs.createWriteStream(testLog, {
                        flags: 'a',
                        defaultEncoding: 'utf8'
                    });
                    const logStdout = process.stdout;
                    CLIUtils.banner();
                    console.log = function() {
                        logFile.write(util.format.apply(null, arguments) + '\n');
                        logStdout.write(util.format.apply(null, arguments) + '\n');
                    };
                    //console.error = console.log;
                    CLIUtils.consoleLogTestDate();

                    console.log("#");
                    console.log("# Uilicious CLI - Test Runner");
                    console.log("# Project Name: " + projectName);
                    console.log("# Test Path : " + scriptPath);
                    console.log("#");
                    return APIUtils.login()})
                .then(response => {
                    console.log("# Log In Successful");
                    console.log("#");
                    if(options.ngrokPort != null) {
                        return TestService.connectToNgrok(options.ngrokPort)
                            .then(ngrokUrl => {
                                console.log("# Ngrok Url : " + ngrokUrl);
                                copyNgrokUrl = ngrokUrl;
                                return ProjectService.projectID(projectName);
                            });
                    }
                    else {
                        return ProjectService.projectID(projectName);
                    }
                })
                .then(projectId => {
                    if(projectId){
                        console.log("# Project ID : "+projectId);
                        return TestService.runTest(projectId, scriptPath, copyNgrokUrl, options);
                    }
                    else{
                        console.log(error("ERROR: Project name was not found"));
                        process.exit(1);
                    }
                })
                .then(postID => {
                    copyTestRunId = postID;
                    console.log("# Test run ID: "+postID);
                    console.log("#");
                    console.log("");
                    return TestService.pollForResult(postID)
                })
                .then(response => {
                    console.log("");
                    console.log(TestService.outputTotalTestRunningTime(response.steps));
                    console.log("");

                    // fetch number of test steps
                    errorCount = TestService.countErrorSteps(response.steps);

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

                    TestService.processErrors(response.steps);
                    if(copyNgrokUrl){
                        TestService.disconnectNgrok();
                    }
                    console.log("");
                    console.log("Successfully saved the test run log to <"+copyTestDirectory+currentUnixTimestamp+"-log.txt"+">\n");
                    return TestService.downloadTestRunImages(copyTestRunId, copyTestDirectory, currentUnixTimestamp);
                }).then(response => {
                    console.log(response);

                    // If the test is completed with error
                    // the process should exit with err code 1
                    if (errorCount > 0) {
                        process.exit(1);
                    }
                    else {
                        process.exit(0);
                    }
                })
                .catch(errors => {
                    console.error(error(errors));
                    if(copyNgrokUrl){
                        TestService.disconnectNgrok();
                    }
                    process.exit(1);
                });
        }
        else {
            CLIUtils.banner();
            CLIUtils.consoleLogTestDate();

            console.log("#");
            console.log("# Uilicious CLI - Runner");
            console.log("# Project Name: " + projectName);
            console.log("# Test Path : " + scriptPath);
            console.log("#");
            return APIUtils.login()
                .then(response => {
                    console.log("# Log In Successful");
                    if(options.ngrokPort != null) {
                        return TestService.connectToNgrok(options.ngrokPort)
                            .then(ngrokUrl => {
                                console.log("# Ngrok Url : " + ngrokUrl);
                                copyNgrokUrl = ngrokUrl;
                                return ProjectService.projectID(projectName);
                            });
                    }
                    else {
                        return ProjectService.projectID(projectName);
                    }

                })
                .then(projectId => {
                    if(projectId){
                        console.log("# Project ID : "+projectId);
                        return TestService.runTest(projectId, scriptPath, copyNgrokUrl, options);
                    }
                    else{
                        console.log(error("ERROR: Project name was not found"));
                        process.exit(1);
                    }
                })
                .then(postID => {
                    console.log("# Test run ID: "+postID);
                    console.log("#");
                    console.log("");
                    return TestService.pollForResult(postID)
                })
                .then(response => {
                    console.log("");
                    console.log(TestService.outputTotalTestRunningTime(response.steps));
                    console.log("");

                    // fetch number of test steps
                    errorCount = TestService.countErrorSteps(response.steps);
                    
                    // Display this log if no errors
                    if (errorCount == 0) {
                        console.log("Test successful with no errors.");
                    }
                    
                    // Display this log if there are errors
                    if (errorCount == 1) {
                        console.log("Test failed with " + errorCount + " error.");
                    } else if (errorCount > 1) {
                        console.log ("Test failed with " + errorCount + " errors.");
                    }

                    TestService.processErrors(response.steps);
                    if(copyNgrokUrl){
                        TestService.disconnectNgrok();
                    }
                    
                    // If the test is completed with error
                    // the process should exit with err code 1
                    if (errorCount > 0) {
                        process.exit(1);
                    }
                    else {
                        process.exit(0);
                    }
                })
                .catch(errors => {
                    console.error(error(errors));
                    if(copyNgrokUrl){
                        TestService.disconnectNgrok();
                    }
                    process.exit(1);
                });
        }
    }

	/**
	 * Test will be triggered by git commit from CI services e.g. Travis or Jenkins
	 * CI service will pass the project name and git commit ID
	 * @param projectName
	 * @param commitHash
	 * @param runFile
	 * @param options
	 * @returns {Promise<any>}
	 */
	static runByGit(projectName, commitHash, runFile, options) {
		CLIUtils.banner();
		CLIUtils.consoleLogTestDate();

		console.log("#");
		console.log("# Uilicious CLI - Runner");
		console.log("# Project Name: " + projectName);
		console.log("# Test file Name : " + runFile);
		console.log("#");
        let errorCount;
		return APIUtils.login()
			.then(response => {
				console.log("# Log In Successful");
				console.log("#");
				return ProjectService.fetchGitProjectByName(projectName);
			})
			.then(project => {
				let projectId = project._oid;
				console.log("# Test dir :" + project.testDir);
				console.log("# Git url : " + project.url);

				if (options.ngrokPort != null) {
					return TestService.connectToNgrok(options.ngrokPort)
						.then(ngrokUrl => {
							console.log("# Ngrok Url : " + ngrokUrl);
							return TestService.runTestByGit(projectId, commitHash, runFile, ngrokUrl, options);
						});
				}
				else {
					return TestService.runTestByGit(projectId, commitHash, runFile, null, options);
				}

			})
			.then(postID => {
				console.log("# Test run ID: " + postID);
				console.log("#");
				console.log("");
				return TestService.pollForResult(postID)
			})
			.then(response => {
				console.log("");
				console.log(TestService.outputTotalTestRunningTime(response.steps));
				console.log("");

				// fetch number of test steps
				errorCount = TestService.countErrorSteps(response.steps);

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

				TestService.processErrors(response.steps);
				if (options.ngrokPort != null) {
					TestService.disconnectNgrok();
				}
			}).catch(errors => {
				console.error(error(errors));
				if (options.ngrokPort != null) {
					TestService.disconnectNgrok();
				}
				process.exit(1);
			});
	}
}

module.exports = TestRunnerController;
