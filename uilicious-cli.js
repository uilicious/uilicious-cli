#!/usr/bin/env node
// 'use strict';

//------------------------------------------------------------------------------------------
//
// Dependencies
//
//------------------------------------------------------------------------------------------
const fs = require('fs');
const chalk = require('chalk');
const program = require('commander');
const request = require('request');
const http = require('http');
const url = require('url');
const path = require('path');
const util = require('util');

// Chalk messages
const error_warning = chalk.bold.red;
const success_warning = chalk.bold.green;
const error = chalk.red;
const success = chalk.green;

// Log variables
// const logFile = fs.createWriteStream('log.txt', {
//   flags: 'a'
// });
// const logStdout = process.stdout;

//------------------------------------------------------------------------------------------
//
// Support polyfill
//
//------------------------------------------------------------------------------------------

// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString();
		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
		  position = subjectString.length;
		}
		position -= searchString.length;
		var lastIndex = subjectString.lastIndexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position){
		position = position || 0;
		return this.substr(position, searchString.length) === searchString;
	};
}

//------------------------------------------------------------------------------------------
//
// Utility for outputing logs to both screen and file
//
//------------------------------------------------------------------------------------------

// function outputLog(msg) {
// 	if(hasDirectory) {
// 		writeToOutputFile(msg);
// 	}
// 	console.log(msg);
// }
//
// function outputError(msg) {
// 	if(hasDirectory) {
// 		writeToOutputFile(msg);
// 	}
// 	console.error(error(msg));
// }

//------------------------------------------------------------------------------------------
//
// Utility for HTTP / API handling
//
//------------------------------------------------------------------------------------------

function requestErrorHandler(err) {
	console.log("FATAL ERROR >> ");
	console.log(err);
	process.exit(1);
}

/// Makes a POST or GET request, with the given form object
/// and return its JSON result in a promise
///
/// @param  "POST" or "GET" method
/// @param  FULL URL to make the request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
/// @return The promise object, with the attached callback
function rawRequestData(method, url, data, callback) {

	// Option / parameter parsing
	var option = {
		url : url,
		method : method
	};
	if ( method == "GET" ) {
		option.qs = data;
	} else {
		option.form = data;
	}

	// The actual API call, with promise object
	return new Promise(function(good, bad) {
		request(option, function( err, res, body ) {
			if (err) {
				throw new Error(error_warning("Unexpected error for URL request : "+url+" -> "+err));
			} else {
				try {
					good(body);
				} catch(err) {
					throw new Error(error_warning("Invalid data (JSON) format for URL request : "+url+" -> "+body));
				}
			}
		});
	}).then(callback);
}

/// Makes a POST or GET request, with the given form object
/// and return its JSON result in a promise
///
/// @param  Write stream to output data into
/// @param  "POST" or "GET" method
/// @param  FULL URL to make the request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
/// @return The promise object, returns the request object
function streamRequest(writeStream, method, url, data, callback) {
	// Option / parameter parsing
	var option = {
		url : url,
		method : method
	};
	if( method == "GET" ) {
		option.qs = data;
	} else {
		option.form = data;
	}

	// The actual API call, with promise object
	return new Promise(function(good, bad) {
		let req = request(option);
		req.pipe(writeStream)
		.on('error', function(err){
			throw new Error(error_warning("Unexpected error for URL request : "+url+" -> "+err));
		})
		.on('close', function(misc) {
			good(req, misc);
		});
	}).then(callback);
}

/// Makes a GET or POST request, with the given form object
/// and return its JSON result in a promise
///
/// @param  "GET" or "POST" method
/// @param  FULL URL to make the request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
/// @return The promise object, with the attached callback, returns the JSON output
function jsonRequest(method, url, inData, callback) {
	// Calling rawRequest, and parsing the good result as JSON
	return new Promise(function(good, bad) {
		rawRequestData(method, url, inData).then(function(data) {
			try {
				good(JSON.parse(data));
			} catch(err) {
				console.error("---- Error trace ----");
				console.error(err);
				console.error("---- HTTP response data ----");
				console.error(data);
				console.error("---- HTTP request URL ----");
				console.error(url);
				console.error("---- HTTP request data ----");
				console.error(inData);
				console.error("---- End of error report ----");
				process.exit(1);
			}
		},bad);
	}).then(callback);
}

/// Cached full host URL
var _fullHostURL = null;

/// Does a login check, and provides the actual server URL to call API
/// silently terminates, with an error message if it fails
///
/// @return   Promise object, returning the full URL to make request to
function getFullHostURL(callback) {
	if ( _fullHostURL != null ) {
		return Promise.resolve(_fullHostURL).then(callback);
	}

	return new Promise(function(good, bad) {
		jsonRequest(
			"POST",
			"https://beta-login.uilicious.com/api/fetchHostURL",
			{
				"user" : program.user,
				"pass" : program.pass
			},
			function(res) {
				if ( res.protectedURL == null ) {
					console.error(error_warning("ERROR: Unable to login - Invalid username/password"));
					process.exit(1);
				} else {
					_fullHostURL = res.protectedURL;
					good(_fullHostURL);
				}
			}
		);
	}).then(callback);
}

/// Does a JSON request to web-studio instance of the client
///
/// @param  "POST" or "GET" method
/// @param  Webstudio webPath request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
function webstudioJsonRequest(method, webPath, params, callback) {
	return new Promise(function(good, bad) {
		getFullHostURL(function(hostURL) {
			jsonRequest(method, hostURL+webPath, params).then(good, bad);
		});
	}).then(callback);
}

/// Does a RAW request to web-studio instance of the client
///
/// @param  "POST" or "GET" method
/// @param  Webstudio webPath request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
function webstudioRawRequest(method, webPath, params, callback) {
	return new Promise(function(good, bad) {
		getFullHostURL(function(hostURL) {
			rawRequestData(method, hostURL+webPath, params).then(good, bad);
		});
	}).then(callback);
}

/// Makes a POST or GET request, with the given form object
/// and return its JSON result in a promise
///
/// @param  Write stream to output data into
/// @param  "POST" or "GET" method
/// @param  FULL URL to make the request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
/// @return The promise object, returns the request object
function webstudioStreamRequest(writeStream, method, webPath, params, callback) {
	return new Promise(function(good, bad) {
		getFullHostURL(function(hostURL) {
			streamRequest(writeStream, method, hostURL+webPath, params).then(good, bad);
		});
	}).then(callback);
}

//------------------------------------------------------------------------------------------
//
// API request handling
//
//------------------------------------------------------------------------------------------

/// Get a list of project, in the following format [ { id, title, logoUrl }]
///
/// @param  [Optional] Callback to return result, defaults to console.log
///
/// @return  Promise object, for result
function projectList(callback) {
	return webstudioJsonRequest(
		"GET",
		"/api/studio/v1/projects",
		{},
		callback
	);
}

/// Get a list of folders
///
/// @param  [Optional] Callback to return result, defaults to console.log
///
/// @return  Promise object, for result
function folderList(projectID, callback) {
	return webstudioJsonRequest(
		"GET",
		"/api/studio/v1/projects/"+projectID+"/workspace/folders",
		{},
		callback
	);
}

/// Get a list of tests
///
/// @param  [Optional] Callback to return result, defaults to console.log
///
/// @return  Promise object, for result
function testList(projectID, callback) {
	return webstudioJsonRequest(
		"GET",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests",
		{},
		callback
	);
}

/// List all projects,
/// silently terminates, with an error message if no project present
function projects(callback) {
	return new Promise(function(good, bad) {
		projectList(function(list) {
			if (list != null) {
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					console.log(" * " + item.title);
				}
				console.log("");
			} else {
				console.error(error_warning("ERROR: No project present."));
				process.exit(1);
			}
		});
	}).then(callback);
}

// List all the folders
// silently terminates , with an error message if no project is present
function folders(projectId, callback) {
	return new Promise(function(good,bad) {
		folderList(projectId, function(list) {
			if(list != null) {
				for(let i = 0; i < list.length; i++) {
					let item = list[i];
					console.log(" * " + item.name);
				}
				console.log("");
			} else {
				console.error(error_warning("ERROR: No folder is present."));
				process.exit(1);
			}
		});
	}).then(callback);
}

/// Check for duplicate Project name
/// @param	Project Name
function checkProject(projname, callback) {
	return new Promise(function(good, bad) {
		projectList(function(list) {
			for (let i = 0; i < list.length; i++) {
				let item = list[i];
				if (item.title == projname) {
					console.error(error_warning("ERROR: This project '"+projname+"' exists.\nPlease use another name!\n"));
					process.exit(1);
				}
			}
			good();
			return;
		});
	}).then(callback);
}

/// Check for duplicate Test name
/// @param	Project ID
/// @param	Test Name
function checkTest(projID, filePathname, callback) {
	return new Promise(function(good, bad) {
		let testName = path.parse(filePathname).name;
		webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/"+projID+"/workspace/tests",
			{ name: testName },
			function (list) {
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					if (item.name == testName) {
						console.error(error_warning("ERROR: This test '"+testName+"' exists.\nPlease use another name!\n"));
						process.exit(1);
					}
				}
				good(testName);
				return;
			}
		);
	}).then(callback);
}

/// Check for duplicate Folder name
/// @param	Project ID
/// @param	Folder Name
function checkFolder(projID, folderName, callback) {
	return new Promise(function(good, bad) {
		folderList(projID, function(folders) {
				for (let i = 0; i < folders.length; i++) {
					let folder = folders[i];
					if (folder.name == folderName) {
						console.error(error_warning("ERROR: This folder '"+folderName+"' exists.\nPlease use another name!\n"));
						process.exit(1);
					}
				}
				good(folderName);
				return;
			});
	}).then(callback);
}

// Get children of folder
function getChildren(projID, folderID, callback) {
	return new Promise(function(good, bad) {
		testList(projID, function(children) {
			for (var i = 0; i < children.length; i++) {
				let child = children[i];
				if (child.parentId == folderID) {
					getScript(projID, child.id);
				}
			}
			return;
		});
	}).then(callback);
}

function getScript(projectID, testID, callback) {
	return new Promise(function(good, bad) {
		webstudioRawRequest(
			"GET",
			"/api/studio/v1/projects/"+projectID+"/workspace/tests/"+testID+"/script",
			{},
			function(res) {
				// console.log(res);
				good(res);
			}
		);
	}).then(callback);
}

//------------------------------------------------------------------------------
//	Project Functions
//------------------------------------------------------------------------------

/// Create a new project using projectName
/// @param	Project Name
function createProject(projectName, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects",
		{ title: projectName },
		callback
	);
}

/// Read a project and display its directory
// function getProj(projectID, callback) {
// 	return
// }

/// Update a project
function updateProject(projectID, newProjectName, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID,
		{ title: newProjectName },
		callback
	);
}

/// Delete a project
/// @param	Project ID from projectID()
/// @param  [Optional] Callback to return result
function deleteProject(projectID, callback) {
	return webstudioRawRequest(
		"DELETE",
		"/api/studio/v1/projects/"+projectID,
		{},
		callback
	);
}

//------------------------------------------------------------------------------
//	Folder & Test Functions
//------------------------------------------------------------------------------

/// Create a new test under a project using the projectName
/// @param	Project ID from projectID()
function createTest(projectID, testName, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests/addAction",
		{
			name: testName
		},
		callback
	);
}

/// Create a new test under a folder using the folderID and projectName
/// @param	Project ID from projectID()
/// @param Node ID from the nodeID()
function createTestUnderFolder(projectID, nodeID, testName, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests/addAction",
		{
			name: testName,
			parentId: nodeID
		},
		callback
	);
}

/// Read a test and display its directory
function readTest(projectID, testID, callback) {
	return webstudioRawRequest(
		"GET",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests/"+testID+"/script",
		{},
		callback
	);
}

/// Create a new test using projectName
/// @param	Project ID from projectID()
function importTest(projectID, testName, testContent, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests/addAction",
		{
			name: testName,
			script: testContent
		},
		callback
	);
}

// Create a new test by importing it under a folder in a project
//@param Project ID from projectID()
//@param nodeID from nodeID()
function importTestUnderFolder(projectID, nodeID, testName, testContent, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/tests/addAction",
		{
			name: testName,
			parentId: nodeID,
			script: testContent
		},
		callback
	);
}

/// Create a new folder using projectName
/// @param	Project ID from projectID()
function createFolder(projectID, folderName, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/folders/addAction",
		{
			name: folderName
		},
		callback
	);
}

/// Create a new folder under another folder under the project using the nodeID and the projectName
/// @param projectID
/// @param nodeID
function createFolderUnderFolder(projectID, nodeID, creatingfoldername, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/folders/addAction",
		{
			name: creatingfoldername,
			parentId: nodeID
		},
		callback
	);
}

/// Update a test/folder
/// @param	Project ID from projectID()
/// @param	Node ID from testID() or folderID()
/// @param  [Optional] Callback to return result
function updateTestFolder(projectID, nodeID, new_Name, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/nodes/"+nodeID+"/renameAction",
		{
			name: new_Name
		},
		callback
	);
}

/// Delete a test/folder
/// @param	Project ID from projectID()
/// @param	Node ID from testID() of folderID()
/// @param  [Optional] Callback to return result
function deleteTestFolder(projectID, nodeID, callback) {
	return webstudioRawRequest(
		"POST",
		"/api/studio/v1/projects/"+projectID+"/workspace/nodes/"+nodeID+"/deleteAction",
		{},
		callback
	);
}

//------------------------------------------------------------------------------
//	Main Functions
//------------------------------------------------------------------------------

/// Fetch the project ID for a project,
/// silently terminates, with an error message if it fails
///
/// @param  Project Name to fetch ID
/// @param  [Optional] Callback to return result
///
/// @return  Promise object, for result
function projectID(projectName, callback) {
	return new Promise(function(good, bad) {
		projectList(function(list) {
			for (let i=0; i<list.length; ++i) {
				let item = list[i];
				if (item.title == projectName) {
					good(parseInt(item.id));
					return;
				}
			}
			console.error(error_warning("ERROR: Project Name not found: "+projectName));
			process.exit(1);
		});
	}).then(callback);
}

/// Returns the folder ID (if found), given the project ID AND folder webPath
/// Also can be used to return node ID for folder
///
/// @param  Project ID
/// @param  Folder Name
/// @param  [Optional] Callback to return result
///
/// @return  Promise object, for result
function folderID(projID, folderPath, callback) {
	return new Promise(function(good, bad) {
		webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/"+projID+"/workspace/folders",
			{ path : folderPath },
			function(res) {
				// Prevent
				if (res.length > 1) {
					console.error(error_warning("ERROR: Multiple folders named '"+folderPath+"' found.\nPlease give the correct name!\n"));
					process.exit(1);
				} else {
					let id = res[0].id;
					good(parseInt(id));
					return;
				}
				console.error(error_warning("ERROR: Unable to find folder: '"+folderPath+"'\n"));
				process.exit(1);
			}
		);
	}).then(callback);
}

/// Returns the node ID (if found) , given the project ID and folderName
///@param projectID
///@param folderName
///@param [optional] callback to return the result
///
/// return promise object , for result
function nodeID(projectId, folderName, callback) {
	return new Promise(function(good, bad) {
		folderList(projectId, function(list) {
			for(let i = 0; i<list.length; ++i) {
				let item = list[i];
				if(item.name == folderName) {
					good(parseInt(item.id));
					return;
				}
			}
			console.error(error_warning("ERROR: This folder <" + folderName + "> does not exist!"));
			process.exit(1);
		});
	}).then(callback);
}

/// Returns the test ID (if found), given the project ID AND test webPath
/// Also can be used to return node ID for test
///
/// @param  Project ID
/// @param  Test Path
/// @param  [Optional] Callback to return result
///
/// @return  Promise object, for result
function testID(projID, testPath, callback) {
	return new Promise(function(good, bad) {
		webstudioJsonRequest(
			"GET",
			"/api/studio/v1/projects/"+projID+"/workspace/tests",
			{ path : testPath },
			function(res) {
				// Prevent
				if (res.length > 1) {
					console.error(error_warning("ERROR: Multiple scripts named '"+testPath+"' found.\nPlease give the correct path!\n"));
					process.exit(1);
				} else {
					let id = res[0].id;
					good(parseInt(id));
					return;
				}
				console.error(error_warning("ERROR: Unable to find test script: '"+testPath+"'\n"));
				process.exit(1);
			}
		);
	}).then(callback);
}

/// Runs a test, and returns the run GUID
///
/// @param   Project ID to use
/// @param   Test ID to use
/// @param   [optional] callback to return run GUID
///
/// @return   Promise object for result run GUID
function runTest(projID, testID, callback) {

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

	// Return promise obj
	return new Promise(function(good, bad) {
		webstudioJsonRequest(
			"POST",
			"/api/studio/v1/projects/"+projID+"/workspace/tests/"+testID+"/runAction?cli=true",
			form,
			function(res) {
				if ( res.id != null ) {
					good(res.id);
					return;
				}
				throw new Error(error_warning("Missing test run ID -> "+res.id));
			}
		);
	}).then(callback);
}

// Get result based on runTestID
function getResult(runTestID, callback) {
	return webstudioJsonRequest(
		"GET",
		"/api/v0/test/result",
		{ id : runTestID },
		callback
	);
}

// Call API every 2500ms
let pollInterval = 2500;

// Get result from API and return results
function pollForResult(runTestID, callback) {
	return new Promise(function(good, bad) {
		function actualPoll() {
			setTimeout(function() {
				getResult(runTestID, function(res) {
					processResultSteps(res.outputPath, res.steps);
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
function pollForError(runTestID, callback) {
	return new Promise(function(good, bad) {
		function actualPoll() {
			setTimeout(function() {
				getResult(runTestID, function(res) {
					processErrors(res.outputPath, res.steps);
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
function pollForImg(runTestID, callback) {
	return new Promise(function(good, bad) {
		function actualPoll() {
			setTimeout(function() {
				getResult(runTestID, function(res) {
					processImages(res.outputPath, res.steps);
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

// Cycle through every step and output those steps with 'success/failure'
function processResultSteps(remoteOutputPath, stepArr) {
	if (stepArr == null) {
		return;
	}
	for ( let idx = 0; idx < stepArr.length; idx++ ) {
		let step = stepArr[idx];
		if ( step.status == 'success' || step.status == 'failure' ) {
			outputStep(remoteOutputPath, idx, step);
		}
	}
}

// Cycle through every step and output errors
function processErrors(remoteOutputPath, stepArr) {
	for ( let idx = 0; idx < stepArr.length; idx++ ) {
		let step = stepArr[idx];
		if ( step.status == 'failure' ) {
			outputError(remoteOutputPath, idx, step);
		}
	}
}

// Cycle through every step and output images
function processImages(remoteOutputPath, stepArr) {
	for ( let idx = 0; idx < stepArr.length; idx++ ) {
		let step = stepArr[idx];
		if ( step.status == 'success' || step.status == 'failure' ) {
			// outputImgPathInfo(remoteOutputPath, idx, step);
			// @TODO : Support actual file path parameter,
			// @TODO : This function should be skipped if not directory
			//         Perhaps comment on this in the output
			//         "To download the images with the CLI call, use the -d parameter"
			// @TODO : (low priority), download the image after a step completes, instead of the very end
			//         Due to the async nature of the image from the test run, this will prevent very large tests
			//         from going through a very large download phase
			downloadImg(remoteOutputPath, step.afterImg, program.directory);
		}
	}
}

// Return the status of each step
function formatStepOutputMsg(step) {
	return "[Step "+(step.idx+1)+" - "+step.status+"]: "+step.description+" - "+step.time.toFixed(2)+"s";
}

// Return each error
function formatErrorOutput(step) {
	return "[Step "+(step.idx+1)+" - "+step.status+"]: "+step.error.message;
}

// Return image name of each step
function formatImgOutput(step) {
	return step.afterImg;
}

// Output each step
var outputStepCache = [];
var errorCount = 0;
function outputStep(remoteOutputPath, idx, step) {
	if ( outputStepCache[idx] == null ) {
		outputStepCache[idx] = step;
		let stepMsg = formatStepOutputMsg(step);
		if ( step.status == 'success' ) {
			console.log(success(stepMsg));
		} else if ( step.status == 'failure' ) {
			errorCount++;
			console.error(error(stepMsg));
		}
	}
}

// Output each error
var outputErrorCache = [];
function outputError(remoteOutputPath, idx, step) {
	if ( outputErrorCache[idx] == null ) {
		outputErrorCache[idx] = step;
		let stepError = formatErrorOutput(step);
		if ( step.status == 'failure' ) {
			console.error(error(stepError));
		}
	}
}

// Output each image
var outputImgCache = [];
function outputImgPathInfo(remoteOutputPath, idx, step) {
	if (outputImgCache[idx] == null) {
		outputImgCache[idx] = step;
		let stepImg = formatImgOutput(step);
		if ( step.status == 'failure' || step.status == 'success' ) {
			console.log(remoteOutputPath+stepImg);
		}
	}
}

// Output log for test status and errors after completion
function outputStatus(errorCount) {
	// Display this log if no errors
	if (errorCount == 0) {
		console.log(success_warning("Test successful: No errors."));
	}
	// Display this log if there are errors
	if (errorCount == 1) {
		console.log(error_warning("Test failed with "+errorCount+" error."));
	} else if (errorCount > 1) {
		console.log(error_warning("Test failed with "+errorCount+" errors."));
	}
}

/// Calls and perform the download image (if needed)
///
/// @param   Represent the server test workspace URI, with the output folder. Eg: "/workspace/:testid/output/""
/// @param   image ID and name to download. Eg: "0-goTo-endin-:img-guid.png"
/// @param   folder path to write the images into
/// @param   callback to pass the result image data to
///
/// @return  promise object to return the output data
function downloadImg(remoteOutputPath, afterImg, localremoteOutputPath, callback) {
	return webstudioStreamRequest(
		fs.createWriteStream( path.join(localremoteOutputPath, afterImg) ),
		"GET",
		remoteOutputPath+afterImg,
		{},
		callback
	);
}

// Read file contents
// @param   File Pathname
function readFileContents(file_pathname, callback) {
	return new Promise(function(good, bad) {
		let fileLocation = path.resolve(file_pathname);
		let fileContent = fs.readFileSync(fileLocation, 'utf-8');
		if (fileContent != null) {
			good(fileContent);
		} else {
			console.error(error_warning("ERROR: There is nothing in this file!\n"));
			process.exit(1);
		}
	}).then(callback);
}

// Import folder contents
function importFolderContents(projname, foldername, folder_pathname, callback) {
	return new Promise(function(good, bad) {
		let folderLocation = path.resolve(folder_pathname);
		let folderContents = fs.readdir(folder_pathname, function(err, files) {
			for (var i = 0; i < files.length; i++) {
				let file = files[i];
				let fileName = path.parse(file).name;
				let fileLocation = folderLocation + "/" + file;
				importTestUnderFolderHelper(projname, foldername, fileLocation);
			}
		})
	}).then(callback);
}

// Check path and return path location if valid
function checkPath(path_name, callback) {
  return new Promise(function(good, bad) {
    let pathLocation = path.resolve(path_name);
		let folderName = path.basename(path_name);
    if (!fs.existsSync(pathLocation)) {
      console.error(error_warning("This path does not exist!\n"));
      process.exit(1);
    } else {
      good(pathLocation);
      return;
    }
  }).then(callback);
}

// Check folder contents and return folder name if folder is not empty
function checkFolderContents(folder_pathname, callback) {
  return new Promise(function(good, bad) {
    let folderName = path.basename(folder_pathname);
    let folderContents = fs.readdir(folder_pathname, function(err, files) {
      if (err || files.length == 0) {
        console.error(error_warning("This folder is empty!\n"));
        process.exit(1);
      } else {
      	good(folderName);
				return;
      }
    })
  }).then(callback);
}

// Make directory
function makeDir(callback) {
	return new Promise(function(good, bad) {
		fs.mkdir(program.directory, function(err) {
			if (err === 'EEXIST') {
				console.error(error_warning("ERROR: '"+program.directory+"' exists.\nPlease use another directory.\n"));
				process.exit(1);
			}
		});
	}).then(callback);
}

//------------------------------------------------------------------------------------------
//
// Core Commands
//
//------------------------------------------------------------------------------------------

// Get list of projects from account
function getAllProjects(options) {
	console.log("#------------#");
	console.log("#  Projects  #");
	console.log("#------------#");
	console.log("");

	projects(function(list) {
		console.log("");
	});
}

//------------------------------------------------------------------------------
//	Project Helper Functions
//------------------------------------------------------------------------------

// Create new project
// @param		Project Name
function createProjectHelper(projname, options) {
	checkProject(projname, function(res) {
		createProject(projname, function(res) {
			console.log(success("New project '"+projname+"' created.\n"));
		});
	});
}

// Update project using projname to get projID
// @param		Project Name
// @param		New Project Name
function updateProjectHelper(projname, new_projname, options) {
	projectID(projname, function(projID) {
		checkProject(new_projname, function(res) {
			updateProject(projID, new_projname, function(res) {
				console.log(success("Project '"+projname+"' renamed to '"+new_projname+"'\n"));
			});
		});
	});
}

// Delete project using project name
// @param		Project Name
function deleteProjectHelper(projname, options) {
	projectID(projname, function(projID) {
		deleteProject(projID, function(res) {
			console.log(error_warning("Project '"+projname+"' deleted\n"));
		});
	});
}

//------------------------------------------------------------------------------
//	Test Helper Functions
//------------------------------------------------------------------------------

// Create test script
// @param		Project Name
// @param		Test Name
function createTestHelper(projname, testname) {
	projectID(projname, function(projID) {
		checkTest(projID, testname, function(res) {
			createTest(projID, testname, function(res) {
				console.log(success("New test '" + testname + "' created under Project '" + projname + "'.\n"));
			});
		});
	});
}

// Create test script under folder
// @param		Project Name
// @param		Folder Name
// @param		Test Name
function createTestUnderFolderHelper(projname, folderName, testname) {
	projectID(projname, function(projID) {
		nodeID(projID, folderName, function (nodeId) {
			checkTest(projID, testname, function (res) {
				createTestUnderFolder(projID, nodeId, testname, function (res) {
					console.log(success("New test '" + testname + "' created.\nUnder the Folder '" + folderName + "' under the Project '" + projname));
				});
			});
		});
	});
}

// Read test script
// @param		Project Name
// @param		Test Name
function readTestHelper(projname, testname, options) {
	projectID(projname, function(projID) {
		testID(projID, testname, function(testID) {
			readTest(projID, testID, function(res) {
				console.log(res);
			});
		});
	});
}

// Update test script
// @param		Project Name
// @param		Test Name
// @param		New Test Name
function updateTestHelper(projname, testname, new_testname, options) {
	projectID(projname, function(projID) {
		testID(projID, testname, function(nodeID) {
			checkTest(projID, new_testname, function(res) {
				updateTestFolder(projID, nodeID, new_testname, function(res) {
					console.log(success("Test '"+testname+"' from Project '"+projname+"' renamed to '"+new_testname+"'\n"));
				});
			});
		});
	});
}

// Delete test script
// @param		Project Name
// @param		Test Name
function deleteTestHelper(projname, testname, options) {
	projectID(projname, function(projID) {
		testID(projID, testname, function(nodeID) {
			deleteTestFolder(projID, nodeID, function(res) {
				console.log(error_warning("Test '"+testname+"' deleted from Project '"+projname+"'\n"));
			});
		});
	});
}

// Import test script
// @param		Project Name
// @param		Test Name
// @param		File Path Name
function importTestHelper(projname, file_pathname, options) {
	readFileContents(file_pathname, function(file_content) {
		projectID(projname, function(projID) {
			checkTest(projID, file_pathname, function(testname) {
				importTest(projID, testname, file_content, function(res) {
					console.log(success("Import successful!\nNew test '"+testname+"' created in Project '"+projname+"'\n"));
				});
			});
		});
	});
}

// Import test script under a folder
// @param Project Name
// @param folder Name
// @param File Path Name
function importTestUnderFolderHelper(projname, foldername, file_pathname, options) {
	readFileContents(file_pathname, function(file_content) {
		projectID(projname, function(projID) {
			nodeID(projID, foldername, function(nodeId) {
				checkTest(projID, file_pathname, function(testname) {
					importTestUnderFolder(projID, nodeId, testname, file_content, function(res) {
						console.log(success("Import successful!\nNew test '"+testname+"' created under Folder '"+foldername+"' under Project '"+projname+"'.\n"));
					});
				});
			});
		});
	});
}

//------------------------------------------------------------------------------
//	Folder Helper Functions
//------------------------------------------------------------------------------

// Create folder
// @param		Project Name
// @param		Folder Name
function createFolderHelper(projName, folderName, options) {
	projectID(projName, function(projID) {
		checkFolder(projID, folderName, function(res) {
			createFolder(projID, folderName, function(res) {
			 	console.log(success("New folder '"+folderName+"' created in Project '"+projName+"'\n"));
			 });
		});
	});
}

// Create folder under a folder
// @param Project Name
// @param FolderName
// @param creating Folder Name
function createFolderUnderFolderHelper(projname, foldername, creatingfoldername) {
	projectID(projname, function(projID) {
		nodeID(projID, foldername, function(nodeId) {
			checkFolder(projID, creatingfoldername, function(res) {
				createFolderUnderFolder(projID, nodeId, creatingfoldername, function(res) {
					console.log(success("New folder '" + creatingfoldername + "' created under Folder '" + foldername + "' under Project '" + projname));
				});
			});
		});
	});
}

// Get folder List under the project
// @param Project Name
function getFolderListHelper( projectName , options) {
	projectID(projectName, function(projectId) {
		folders(projectId, function(list) {
			console.log(list);
		});
	});
}

// Update test script
// @param		Project Name
// @param		Test Name
// @param		New Test Name
function updateFolderHelper(projName, folderName, new_folderName, options) {
	projectID(projName, function(projID) {
		folderID(projID, folderName, function(nodeID) {
			checkFolder(projID, new_folderName, function(res) {
				updateTestFolder(projID, nodeID, new_folderName, function(res) {
					console.log(success("Folder '"+folderName+"' from Project '"+projName+"' renamed to '"+new_folderName+"'\n"));
				});
			});
		});
	});
}

// Delete folder
// @param		Project Name
// @param		Folder Name
function deleteFolderHelper(projName, folderPath, options) {
	projectID(projName, function(projID) {
		folderID(projID, folderPath, function(nodeID) {
			deleteTestFolder(projID, nodeID, function(res) {
				console.log(error_warning("Folder '"+folderPath+"' deleted from Project '"+projName+"'\n"));
			});
		});
	});
}

// Import folder and its contents
function importFolderHelper(projName, folderPath, options) {
  checkPath(folderPath, function(folder_pathname) {
		checkFolderContents(folder_pathname, function(folder_name) {
			projectID(projName, function(projID) {
				checkFolder(projID, folder_name, function(folder_name) {
					createFolder(projID, folder_name, function(res) {
						importFolderContents(projName, folder_name, folder_pathname, function(res) {
							console.log("");
						});
					});
				});
			});
		});
  });
}

// Export folder and its contents
function exportFolderHelper(projName, folderName, options) {
	projectID(projName, function(projID) {
		nodeID(projID, folderName, function(folderID) {
			getChildren(projID, folderID, function(res) {
				console.log("");
			});
		});
	});
}

//------------------------------------------------------------------------------
//	Main Function to run test script
//------------------------------------------------------------------------------

// Run test script from project
function main(projname, scriptpath, options) {
	// console.log = function() {
	// 	logFile.write(util.format.apply(null, arguments) + '\n');
	// 	logStdout.write(util.format.apply(null, arguments) + '\n');
	// }

	console.log("#");
	console.log("# Uilicious CLI - Runner");
	console.log("# Project Name: "+projname);
	console.log("# Script Path : "+scriptpath);
	console.log("#");

  // makeDir();
	projectID(projname, function(projID) {
		console.log("# Project ID : "+projID);
		testID(projID, scriptpath, function(scriptID) {
			console.log("# Script ID  : "+scriptID);
			runTest(projID, scriptID, function(postID) {
				console.log("# Test run ID: "+postID);
				console.log("#");
				console.log("");
				pollForResult(postID, function(finalRes) {
					console.log("");
					outputStatus(errorCount);
					pollForError(postID);
					// pollForImg(postID);
					// console.log(success("All images saved in "+program.directory+"\n"));
				});
			});
		});
	});
}

//-----------------------------------------------------------------------------------------
//
// Parsing & running the command line
//
//------------------------------------------------------------------------------------------

// Basic CLI parameters handling
program
	.version('1.3.12')
	.option('-u, --user <required>', 'username')
	.option('-p, --pass <required>', 'password')
	// .option('-d, --directory <required>', 'Output directory path to use')
	.option('-b, --browser <optional>', 'browser [Chrome/Firefox]')
	.option('-w, --width <optional>', 'width of browser')
	.option('-hg, --height <optional>', 'height of browser');

//List the projects
program
	.command('list-project')
	.alias('list')
	.description('List all projects')
	.action(getAllProjects);

// List the folders under a project
program
	.command('list-folder <projname>')
	.alias('lf')
	.description('List all folders under a project')
	.action(getFolderListHelper);

// -----------------------------
// 	Commands for Project CRUD
// -----------------------------

// Create Project
program
	.command('create-project <projname>')
	.alias('cp')
	.description('Create a new project')
	.action(createProjectHelper);

// Update Project
program
	.command('rename-project <projname> <new_projname>')
	.alias('rp')
	.description('Rename a project')
	.action(updateProjectHelper);

// Delete Project
program
	.command('delete-project <projname>')
	.alias('dp')
	.description('Delete a project')
	.action(deleteProjectHelper);

// -----------------------------
// 	Commands for Test CRUD
// -----------------------------

// Create Test
program
	.command('create-test <projName> <test_name>')
	.option('-f, --folder <folder>', 'Set the folder name')
	.alias('ct')
	.description('Create a test')
	.action(function(projname, test_name, options) {
		let folder_name = options.folder || null;
		if (folder_name == null) {
			createTestHelper(projname, test_name);
		} else {
			createTestUnderFolderHelper(projname, folder_name, test_name);
		}
	});

// Read Test (Get contents of Test)
program
	.command('get-test <projname> <test_name>')
	.alias('gt')
	.description('Read a test')
	.action(readTestHelper);

// Update Test
program
	.command('rename-test <projname> <test_name> <new_testname>')
	.alias('rt')
	.description('Rename a test')
	.action(updateTestHelper);

// Delete Test
program
	.command('delete-test <projname> <test_name>')
	.alias('dt')
	.description('Delete a test')
	.action(deleteTestHelper);

// Import Test
program
	.command('import-test <projname> <file_pathname>')
	.option('-f, --folder <folder>', 'Set the folder path')
	.alias('it')
	.description('Import a test')
	.action(function(projname, file_pathname, options) {
		let folder_name = options.folder || null;
		if (folder_name == null) {
			importTestHelper(projname, file_pathname);
		} else {
			importTestUnderFolderHelper(projname, folder_name, file_pathname);
		}
	});

// -----------------------------
// 	Commands for Folder CRUD
// -----------------------------

// Create Folder
program
	.command('create-folder <projname> <folder_name>')
	.option('-f, --folder <folder>', 'Set the folder name')
	.alias('cf')
	.description('Create a folder')
	.action(function(projname, folder_name, options) {
		let folder  = options.folder || null;
		if(folder == null) {
			createFolderHelper(projname, folder_name);
		} else {
			createFolderUnderFolderHelper(projname, folder, folder_name);
		}
	});

// Update Folder
program
	.command('rename-folder <projname> <folder_name> <new_folder_name>')
	.alias('rf')
	.description('Rename a folder')
	.action(updateFolderHelper);

// Delete Folder
program
	.command('delete-folder <projname> <folder_name>')
	.alias('df')
	.description('Delete a folder')
	.action(deleteFolderHelper);

// Import Folder
program
	.command('import-folder <projname> <folder_path>')
	.alias('if')
	.description('Import a folder')
	.action(importFolderHelper);

// Export Folder
program
	.command('export-folder <projname> <folder_name>')
	.alias('ef')
	.description('Export a folder')
	.action(exportFolderHelper);

// -----------------------------
// 	Commands for running tests
// -----------------------------
program
	.command('run <projname> <scriptpath>')
	.description('Run a test from a project')
	.action(main);

// end with parse to parse through the input.txt
program.parse(process.argv);

// If program was called with no arguments or invalid arguments, show help.
if (!program.args.length) {
	// Show help by default
	program.parse([process.argv[0], process.argv[1], '-h']);
	process.exit(0);
}
//  else {
// 	// Warn about invalid commands
// 	let validCommands = program.commands.map(function(cmd){
// 		return cmd.name;
// 	});
// 	let invalidCommands = program.args.filter(function(cmd){
// 		// If command is executed, it will be an object and not a string
// 		return (typeof cmd === 'string' && validCommands.indexOf(cmd) === -1);
// 	});
// 	if (invalidCommands.length) {
// 		console.log('\n [ERROR] - Invalid command: "%s".\n See "--help" for a list of available commands.\n', invalidCommands.join(', '));
// 	}
// }
