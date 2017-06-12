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

// Chalk messages
const error_warning = chalk.bold.red;
const success_warning = chalk.bold.green;
const error = chalk.red ;
const success = chalk.green;

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
//
// }
//
// function outputError(msg) {
// 	if(hasDirectory) {
// 		writeToOutputFile(msg);
// 	}
// 	console.error(error(msg));
//
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
	if( method == "GET" ) {
		option.qs = data;
	} else {
		option.form = data;
	}

	// The actual API call, with promise object
	return new Promise(function(good, bad) {
		request(option, function( err, res, body ) {
			if(err) {
				throw new Error(error_warning("Unexpected error for URL request : "+url+" -> "+err));
			} else {
				try {
					good(body);
				} catch(e) {
					throw new Error(error_warning("Invalid data (maybe json?) format for URL request : "+url+" -> "+body));
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
function jsonRequest(method, url, data, callback) {
	// Calling rawRequest, and parsing the good result as JSON
	return new Promise(function(good, bad) {
		rawRequestData(method, url, data).then(function(data) {
			try {
				good(JSON.parse(data));
			} catch(err) {
				console.log(err);
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
	if( _fullHostURL != null ) {
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
				if( res.protectedURL == null ) {
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
/// @param  [Optional] Callback to return result, defaults to to console.log
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

/// List all projects,
/// silently terminates, with an error message if no project present
function projects(callback) {
	return new Promise(function(good, bad) {
		projectList(function(list) {
			if (list != null) {
				for(let i = 0; i < list.length; i++) {
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
			for(let i=0; i<list.length; ++i) {
				let item = list[i];
				if(item.title == projectName) {
					good(parseInt(item.id));
					return;
				}
			}
			console.error(error_warning("ERROR: Project Name not found: "+projectName));
			process.exit(1);
		});
	}).then(callback);
}

/// Returns the test ID (if found), given the project ID AND test webPath
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
					console.error(error_warning("ERROR: Multiple scripts named \""+testPath+"\" found.\nPlease give the correct path!\n"));
					process.exit(1);
				} else {
					let id = res[0].id;
					good(parseInt(id));
					return;
				}
				console.error(error_warning("ERROR: Unable to find test script: "+testPath));
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
	if(program.browser != null) {
		form.browser = program.browser;
	}
	if(program.height != null) {
		form.height = program.height;
	}
	if(program.width != null) {
		form.width = program.width;
	}

	// Return promise obj
	return new Promise(function(good, bad) {
		webstudioJsonRequest(
			"POST",
			"/api/studio/v1/projects/"+projID+"/workspace/tests/"+testID+"/runAction?cli=true",
			form,
			function(res) {
				if( res.id != null ) {
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
					if( res.status == 'success' || res.status == 'failure') {
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
					if( res.status == 'success' || res.status == 'failure') {
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
					if( res.status == 'success' || res.status == 'failure') {
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
	if(stepArr == null) {
		return;
	}
	for( let idx = 0; idx < stepArr.length; idx++ ) {
		let step = stepArr[idx];
		if( step.status == 'success' || step.status == 'failure' ) {
			outputStep(remoteOutputPath, idx, step);
		}
	}
}

// Cycle through every step and output errors
function processErrors(remoteOutputPath, stepArr) {
	for( let idx = 0; idx < stepArr.length; idx++ ) {
		let step = stepArr[idx];
		if( step.status == 'failure' ) {
			outputError(remoteOutputPath, idx, step);
		}
	}
}

// Cycle through every step and output images
function processImages(remoteOutputPath, stepArr) {
	for( let idx = 0; idx < stepArr.length; idx++ ) {
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
	if( outputStepCache[idx] == null ) {
		outputStepCache[idx] = step;
		let stepMsg = formatStepOutputMsg(step);
		if( step.status == 'success' ) {
			console.log(success(stepMsg));
		} else if( step.status == 'failure' ) {
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
function outputLog(errorCount) {
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

// Make directory
function makeDir(callback) {
	return new Promise(function(good, bad) {
		fs.mkdir(program.directory, function(err) {
			if(err === 'EEXIST') {
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
function getInfo(options) {
	console.log("#------------#");
	console.log("#  Projects  #");
	console.log("#------------#");
	console.log("");

	projects(function(list) {
		console.log("");
	});
}

// Run test script from project
function main(projname, scriptpath, options) {

	console.log("#");
	console.log("# Uilicious CLI - Runner");
	console.log("# Project Name: "+projname);
	console.log("# Script Path : "+scriptpath);
	console.log("#");

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
					outputLog(errorCount);
					pollForError(postID);
					makeDir();
					pollForImg(postID);
					console.log(success("All images saved in "+program.directory));
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
	.option('-d, --directory <required>', 'Output directory path to use')
	.option('-b, --browser <optional>', 'browser [Chrome/Firefox]')
	.option('-w, --width <optional>', 'width of browser')
	.option('-h, --height <optional>', 'height of browser')

program
	.command('list')
	.description('List all projects.')
	.action(getInfo);

program
	.command('run <projname> <scriptpath>')
	.description('Uilicious.com CLI runner for CI')
	.action(main);

// end with parse to parse through the input
program.parse(process.argv);

// if program was called with no arguments, show help.
if (program.args.length === 0) {
	program.help(); // Terminates as well
}
