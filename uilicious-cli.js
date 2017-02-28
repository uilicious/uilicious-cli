#!/usr/bin/env node
'use strict';

//------------------------------------------------------------------------------------------
//
// dependencies
//
//------------------------------------------------------------------------------------------
const program = require('commander');
const request = require('request');
const http = require('http');
const url = require('url');

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
// utility for HTTP / API handling
//
//------------------------------------------------------------------------------------------

/// Makes a POST request, with the given form object
/// and return its JSON result in a promise
///
/// @param  "POST" or "GET" method
/// @param  FULL URL to make the request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
/// @return The promise object, with the attached callback
function jsonRequest(method, url, data, callback) {

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
	return new Promise(function(good,bad) {
		request(option, function( err, res, body ) {
			if(err) {
				throw new Error("Unexpected error for URL request : "+url+" -> "+err);
			} else {
				try {
					good(JSON.parse(body));
				} catch(e) {
					throw new Error("Invalid JSON format for URL request : "+url+" -> "+body);
				}
			}
		});
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

	return new Promise(function(good,bad) {
		jsonRequest(
			"POST",
			"https://beta-login.uilicious.com/api/fetchHostURL",
			{
				"user" : program.user,
				"pass" : program.pass
			},
			function(res) {
				if( res.protectedURL == null ) {
					console.error("ERROR: Unable to login - Invalid username/password");
					return;
				} else {
					_fullHostURL = res.protectedURL;
					good(_fullHostURL);
				}
			}
		);
	}).then(callback);
}

/// Does a request to web-studio instance of the client
///
/// @param  "POST" or "GET" method
/// @param  Webstudio path request
/// @param  [OPTIONAL] Query / Form parameter to pass as an object
/// @param  [OPTIONAL] Callback parameter, to attach to promise
///
function webstudioRequest(method, path, params, callback) {
	return new Promise(function(good,bad) {
		getFullHostURL(function(hostURL) {
			jsonRequest(method, hostURL+path, params, good);
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
	return webstudioRequest(
		"GET",
		"/api/studio/v1/projects",
		{},
		callback
	);
}

/// Fetch the project ID for a project,
/// silently terminates, with an error message if it fails
///
/// @param  Project Name to fetch ID
/// @param  [Optional] Callback to return result
///
/// @return  Promise object, for result
function projectID(projectName, callback) {
	return new Promise(function(good,bad) {
		projectList(function(list) {
			for(let i=0; i<list.length; ++i) {
				let item = list[i];
				if(item.title == projectName) {
					good(parseInt(item.id));
					return;
				}
			}
			console.error("ERROR: Project Name not found: "+projectName);
			return;
		});
	}).then(callback);
}

/// Returns the test ID (if found), given the project ID AND test path
///
/// @param  Project ID
/// @param  Test Path
/// @param  [Optional] Callback to return result
///
/// @return  Promise object, for result
function testID(projID, testPath, callback) {
	return new Promise(function(good,bad) {
		webstudioRequest(
			"GET",
			"/api/studio/v1/projects/"+projID+"/workspace/tests",
			{ path : testPath },
			function(res) {
				if( res.length > 0 ) {
					let id = res[0].id;
					if( id != null ) {
						good(parseInt(id));
						return;
					}
				}
				console.error("ERROR: Unable to find test script: "+testPath);
				return;
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
	return new Promise(function(good,bad) {
		webstudioRequest(
			"POST",
			"/api/studio/v1/projects/"+projID+"/workspace/tests/"+testID+"/runAction?cli=true",
			form,
			function(res) {
				if( res.id != null ) {
					good(res.id);
					return;
				}
				throw new Error("Missing test run ID -> "+res.id);
			}
		);
	}).then(callback);
}

// Get result based on runTestID
function getResult(runTestID, callback) {
	return webstudioRequest(
		"GET",
		"/api/v0/test/result",
		{ id : runTestID },
		callback
	);
}

let pollInterval = 2500;
// Call api every 2500ms
function pollForResult(runTestID, callback) {
	return new Promise(function(good,bad) {
		function actualPoll() {
			setTimeout(function() {
				getResult(runTestID, function(res) {
					processResultSteps(res.steps);
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
function processResultSteps(stepArr) {
	if(stepArr == null) {
		return;
	}
	for( let idx = 0; idx < stepArr.length; ++idx ) {
		let step = stepArr[idx];
		if( step.status == 'success' || step.status == 'failure' ) {
			outputStep(idx, step);
		}
	}
}

// Return the status of each step
function formatStepOutputMsg(step) {
	return "[Step "+(step.idx+1)+" - "+step.status+"]: "+step.description+" - "+step.time+"s";
}

// Output
var outputStepCache = [];
function outputStep(idx, step) {
	if( outputStepCache[idx] == null ) {
		outputStepCache[idx] = step;
		if( step.status == 'success' ) {
			console.log( formatStepOutputMsg(step) );
		} else if( step.status == 'failure' ) {
			console.error( formatStepOutputMsg(step) );
		}
	}
}

//------------------------------------------------------------------------------------------
//
// main command
//
//------------------------------------------------------------------------------------------

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
					let totalSteps = finalRes.steps.length;
					if( finalRes.status == "success" ) {
						console.log("Test successful: "+totalSteps+" steps");
					} else {
						console.error("Test "+finalRes.status+": "+totalSteps+" steps");
					}
				});
			});
		});
	});
}

//-----------------------------------------------------------------------------------------
//
// parsing and running the command line
//
//------------------------------------------------------------------------------------------

// Basic CLI parameters handling
program.version('1.0.0')
	.usage('[commands] [options] <parameters> ...')
	.description("Uilicious.com CLI runner. For CI")
	.option('-u, --user <required>', 'Username')
	.option('-p, --pass <required>', 'Password')
//	.option('-d, --directory <required>', 'Output directory path to use')
	.option('-b, --browser <optional>', 'Browser [chrome/firefox]')
	.option('-w, --width <optional>', 'Width of browser')
	.option('-h, --height <optional>', 'Height of browser')
	.command('run <projname> <scriptpath>')
	.action(main);

// end with parse to parse through the input
program.parse(process.argv);

// if program was called with no arguments, show help.
if (program.args.length === 0) {
	program.help(); //Terminates as well
}
