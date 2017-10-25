/*
* TestRunnerController class responds to run command
* in the command line
* @Author : Shahin (shahin@uilicious.com)
*/

// npm Dependencies
const fs = require('fs');
const util = require('util');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies (non-npm)
const CLIUtils = require('../utils/CliUtils');
const ProjectService = require('../service/ProjectService');
const TestService = require('../service/TestService');

class TestRunnerController {


//------------------------------------------------------------------------------
//	Main Function to run test script
//------------------------------------------------------------------------------

    // Run test script from project
    static main(projname, scriptpath, options) {

        if (options.save != null) {
            let copyProjectId;
            let copyTestDirectory;
            return TestService.makeDir(options.save)
                .then(testDirectory => {
                    // Test log functionality
                    copyTestDirectory = testDirectory;
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
                    //console.error = console.log;
                    CLIUtils.banner();
                    CLIUtils.consoleLogTestDate();

                    console.log("#");
                    console.log("# Uilicious CLI - Runner");
                    console.log("# Project Name: " + projname);
                    console.log("# Script Path : " + scriptpath);
                    console.log("#");

                    return ProjectService.projectID(projname)})
                .then(projID => {
                    console.log("# Project ID : "+projID);
                    copyProjectId=projID;
                    return TestService.testID(projID, scriptpath)})
                .then(scriptID =>  {
                    console.log("# Script ID  : "+scriptID);
                    let dataParams = null;
                    return TestService.runTest(copyProjectId, scriptID, dataParams)})
                .then(postID => {
                    console.log("# Test run ID: "+postID);
                    console.log("#");
                    console.log("");
                    return TestService.pollForResult(postID)})
                .then(response => {
                    console.log("");
                    TestService.outputStatus(response.outputPath, response.steps);
                    TestService.processErrors(response.outputPath, response.steps);
                    console.log(success("Test Info saved in "+copyTestDirectory+"\n"));
                })
                .catch(error => {
                    console.log("Error: "+error);
                });
        }
        else {
            CLIUtils.banner();
            CLIUtils.consoleLogTestDate();

            console.log("#");
            console.log("# Uilicious CLI - Runner");
            console.log("# Project Name: " + projname);
            console.log("# Script Path : " + scriptpath);
            console.log("#");
            let copyProjectId;
            return ProjectService.projectID(projname)
                .then(projectId => {
                    console.log("# Project ID : "+projectId);
                    copyProjectId=projectId;
                    return TestService.testID(projectId, scriptpath)})
                .then(scriptID =>  {
                    console.log("# Script ID  : "+scriptID);
                    let dataParams = null;
                    return TestService.runTest(copyProjectId, scriptID, dataParams)})
                .then(postID => {
                    console.log("# Test run ID: "+postID);
                    console.log("#");
                    console.log("");
                    return TestService.pollForResult(postID)})
                .then(response => {
                    console.log("");
                    TestService.outputStatus(response.outputPath, response.steps);
                    TestService.processErrors(response.outputPath, response.steps);
                })
                .catch(error => {
                    console.error(error(error));
                });
        }
    }
}

module.exports = TestRunnerController;
