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
const APIUtils = require('./../api-utils');
const CLIUtils = require('./../cli-utils');
const ProjectCRUD = require('./project-CRUD');
const folderCRUD = require('./folder-CRUD');
const ImportExport = require('./import-export');
const getData = require('./get-data');

class testCRUD {

	//------------------------------------------------------------------------------
	// Test Helper Functions
	//------------------------------------------------------------------------------

	// Create test script
	// @param		Project Name
	// @param		Test Name
	static createTestHelper(projname, testname) {
		ProjectCRUD.projectID(projname, function(projID) {
			testCRUD.checkTest(projID, testname, function(res) {
				testCRUD.createTest(projID, testname, function(res) {
					console.log(success("New test '" + testname + "' created under Project '" + projname + "'.\n"));
				});
			});
		});
	}

	// Create test script under folder
	// @param		Project Name
	// @param		Folder Name
	// @param		Test Name
	static createTestUnderFolderHelper(projname, folderName, testname) {
		ProjectCRUD.projectID(projname, function(projID) {
			folderCRUD.nodeID(projID, folderName, function (nodeId) {
				testCRUD.checkTest(projID, testname, function (res) {
					testCRUD.createTestUnderFolder(projID, nodeId, testname, function (res) {
						console.log(success("New test '" + testname + "' created.\nUnder the Folder '" + folderName + "' under the Project '" + projname));
					});
				});
			});
		});
	}

	// Read test script
	// @param		Project Name
	// @param		Test Name
	static readTestHelper(projname, testname, options) {
		ProjectCRUD.projectID(projname, function(projID) {
			testCRUD.testID(projID, testname, function(testID) {
				testCRUD.readTest(projID, testID, function(res) {
					if (res == null) {
						// @TODO - Check error handling
						console.error(error("ERROR: There is no script!\n"));
					} else {
						console.log(res);
					}
				});
			});
		});
	}

	// Update test script
	// @param		Project Name
	// @param		Test Name
	// @param		New Test Name
	static updateTestHelper(projname, testname, new_testname, options) {
		ProjectCRUD.projectID(projname, function(projID) {
			testCRUD.testID(projID, testname, function(nodeID) {
				testCRUD.checkTest(projID, new_testname, function(res) {
					folderCRUD.updateTestFolder(projID, nodeID, new_testname, function(res) {
						console.log(success("Test '"+testname+"' from Project '"+projname+"' renamed to '"+new_testname+"'.\n"));
					});
				});
			});
		});
	}

	// Delete test script
	// @param		Project Name
	// @param		Test Name
	static deleteTestHelper(projname, testname, options) {
		ProjectCRUD.projectID(projname, function(projID) {
			testCRUD.testID(projID, testname, function(nodeID) {
				folderCRUD.deleteTestFolder(projID, nodeID, function(res) {
					console.log(error("Test '"+testname+"' deleted from Project '"+projname+"'.\n"));
				});
			});
		});
	}

	//------------------------------------------------------------------------------
	// Test Core Functions
	//------------------------------------------------------------------------------

	// Get result from API and return results
	// @param runTestID
	// @param [Optional] Callback to return result
	static pollForResult(runTestID, callback) {

		// Call API every 2500ms
		let pollInterval = 10000;

		return new Promise(function(good, bad) {
			function actualPoll() {
				setTimeout(function() {
					testCRUD.getResult(runTestID, function(res) {
						testCRUD.processResultSteps(res.outputPath, res.steps);
						if ( res.status == 'success' || res.status == 'failure') {
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
		let pollInterval = 500;

		return new Promise(function(good, bad) {
			function actualPoll() {
				setTimeout(function() {
					testCRUD.getResult(runTestID, function(res) {
						testCRUD.processErrors(res.outputPath, res.steps);
						if ( res.status == 'success' || res.status == 'failure') {
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
						if ( res.status == 'success' || res.status == 'failure') {
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
		let pollInterval = 500;

		return new Promise(function(good, bad) {
			function actualPoll() {
				setTimeout(function() {
					testCRUD.getResult(runTestID, function(res) {
						testCRUD.outputStatus(res.outputPath, res.steps);
						if ( res.status == 'success' || res.status == 'failure') {
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
		for ( let idx = 0; idx < stepArr.length; idx++ ) {
			let step = stepArr[idx];
			if ( step.status == 'failure' ) {
				errorCount++;
			}
		}
		// Display this log if no errors
		if (errorCount == 0) {
			console.log("Test successful: No errors.");
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
		for ( let idx = 0; idx < stepArr.length; idx++ ) {
			let step = stepArr[idx];
			if ( step.status == 'success' || step.status == 'failure' ) {
				testCRUD.outputStep(remoteOutputPath, idx, step);
			}
		}
	}

	// Cycle through every step and output errors
	static processErrors(remoteOutputPath, stepArr) {
		for ( let idx = 0; idx < stepArr.length; idx++ ) {
			let step = stepArr[idx];
			if ( step.status == 'failure' ) {
				testCRUD.outputError(remoteOutputPath, idx, step);
			}
		}
	}

	// Cycle through every step and output images
	static processImages(remoteOutputPath, stepArr, directory) {
		for ( let idx = 0; idx < stepArr.length; idx++ ) {
			let step = stepArr[idx];
			if ( step.status == 'success' || step.status == 'failure' ) {
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

	// Return image name of each step
	static formatImgOutput(step) {
		return step.afterImg;
	}

	// Output each step
	static outputStep(remoteOutputPath, idx, step) {

		// Output each step
		var outputStepCache = [];

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

	static outputImgPathInfo(remoteOutputPath, idx, step) {

		// Output each image
		var outputImgCache = [];

		if (outputImgCache[idx] == null) {
			outputImgCache[idx] = step;
			let stepImg = testCRUD.formatImgOutput(step);
			if ( step.status == 'failure' || step.status == 'success' ) {
				console.log(remoteOutputPath+stepImg);
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
					//process.exit(1);
				}
			});
			good(testDirectory);
			return;
		}).then(callback);
	}

	//------------------------------------------------------------------------------
	// Test API Functions
	//------------------------------------------------------------------------------

	/// Get a list of tests
	/// @param  [Optional] Callback to return result, defaults to console.log
	/// @return  Promise object, for result
	static testList(projectID, callback) {
		return APIUtils.webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/tests",
			{},
			callback
		);
	}

	/// Check for duplicate Test name
	/// @param	Project ID
	/// @param	Test Name
	static checkTest(projID, filePathname, callback) {
		return new Promise(function(good, bad) {
			let testName = path.parse(filePathname).name;
			APIUtils.webstudioJsonRequest(
				"GET",
				"/api/studio/v1/projects/" + projID + "/workspace/tests",
				{ name: testName },
				function (list) {
					for (let i = 0; i < list.length; i++) {
						let item = list[i];
						if (item.name == testName) {
							console.error(error("ERROR: This test '" + testName + "' exists.\nPlease use another name!\n"));
							process.exit(1);
						}
					}
					good(testName);
					return;
				}
			);
		}).then(callback);
	}

	// @param Project ID
	// @param Test ID
	static getScript(projectID, testID, callback) {
		return new Promise(function(good, bad) {
			APIUtils.webstudioRawRequest(
				"GET",
				"/api/studio/v1/projects/" + projectID + "/workspace/tests/" + testID + "/script",
				{},
				function(res) {
					good(res);
				}
			);
		}).then(callback);
	}

	/// Create a new test under a project using the projectName
	/// @param	Project ID from projectID()
	/// @param testName - name given to create a new test
	/// @param [Optional] Callback to return result
		static createTest(projectID, testName, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/tests/addAction",
			{
				name: testName
			},
			callback
		);
	}

	/// Create a new test under a folder using the folderID and projectName
	/// @param	Project ID from projectID()
	/// @param Node ID from the nodeID() - taken as parentId
	/// @param testName - name of the new folder that is created under the folder with the parentId
	/// @param [Optional] Callback to return result
	static createTestUnderFolder(projectID, nodeID, testName, callback) {
		return APIUtils.webstudioRawRequest(
			"POST",
			"/api/studio/v1/projects/" + projectID + "/workspace/tests/addAction",
			{
				name: testName,
				parentId: nodeID
			},
			callback
		);
	}

	/// Read a test and display its directory
	/// @param projectID
	/// @param testID
	/// @param [Optional] Callback to return result
	static readTest(projectID, testID, callback) {
		return APIUtils.webstudioRawRequest(
			"GET",
			"/api/studio/v1/projects/" + projectID + "/workspace/tests/" + testID + "/script",
			{},
			callback
		);
	}

	/// Returns the test ID (if found), given the project ID AND test webPath
	/// Also can be used to return node ID for test
	/// @param  Project ID
	/// @param  Test Name
	/// @param  [Optional] Callback to return result
	/// @return  Promise object, for result
	static testID(projID, testName, callback) {
		return new Promise(function(good, bad) {
			APIUtils.webstudioJsonRequest(
				"GET",
				"/api/studio/v1/projects/" + projID + "/workspace/tests",
				{ name : testName },
				function(tests) {
					for (var i = 0; i < tests.length; i++) {
						let single_test = tests[i];
						if (single_test.name == testName) {
							good(parseInt(single_test.id));
							return;
						}
					}
					console.error(error("ERROR: Unable to find test script: '" + testName + "'\n"));
					process.exit(1);
				}
			);
		}).then(callback);
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
					throw new Error("Missing Test Run ID/Invalid JSON format");
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

	static check(options, callback) {
		return new Promise(function(good, bad) {
			console.log(typeof options.data);
		}).then(callback);
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

		if (options.directory != null) {

			testCRUD.makeDir(options.directory, function(testDirectory) {
				// Test log functionality
				let testLog = testDirectory + '/log.txt';
				const logFile = fs.createWriteStream(testLog, {
					flags: 'a'
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

				ProjectCRUD.projectID(projname, function(projID) {
					console.log("# Project ID : "+projID);
					testCRUD.testID(projID, scriptpath, function(scriptID) {
						console.log("# Script ID  : "+scriptID);
						if (options.datafile != null) {
							ImportExport.checkPath(options.datafile, function(dataDirectory) {
								getData.readDataFile(options, function(dataParams) {
									testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
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
								testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
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
							testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
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

			ProjectCRUD.projectID(projname, function(projID) {
				console.log("# Project ID : "+projID);
				testCRUD.testID(projID, scriptpath, function(scriptID) {
					console.log("# Script ID  : "+scriptID);
					if (options.datafile != null) {
						ImportExport.checkPath(options.datafile, function(dataDirectory) {
							getData.readDataFile(options, function(dataParams) {
								testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
									console.log("# Test run ID: "+postID);
									console.log("#");
									console.log("");
									testCRUD.pollForResult(postID, function(finalRes) {
										console.log("");
										testCRUD.pollForStatus(postID, function(res) {
											testCRUD.pollForError(postID);
										});
									});
								});
							});
						});
					} else if (options.data != null) {
						getData.readDataObj(options, function(dataParams) {
							testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
								console.log("# Test run ID: "+postID);
								console.log("#");
								console.log("");
								testCRUD.pollForResult(postID, function(finalRes) {
									console.log("");
									testCRUD.pollForStatus(postID, function(res) {
										testCRUD.pollForError(postID);
									});
								});
							});
						});
					} else {
						let dataParams = null;
						testCRUD.runTest(projID, scriptID, dataParams, function(postID) {
							console.log("# Test run ID: "+postID);
							console.log("#");
							console.log("");
							testCRUD.pollForResult(postID, function(finalRes) {
								console.log("");
								testCRUD.pollForStatus(postID, function(res) {
									testCRUD.pollForError(postID);
								});
							});
						});
					}
				});
			});

		}
	}

}

module.exports = testCRUD;
