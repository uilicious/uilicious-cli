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
// utility for HTTP handling
//
//------------------------------------------------------------------------------------------

/// Normalize callbacks, so that its not null
///
/// @param  [Optional] The callback function to normalize
///
/// @return  Normalized callback function to return
function normalizeCallback(callback) {
	return callback || function() {
		var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
		console.log.apply(console, args);
	};
}

/// @return Gets the base URL, with the requerid user / pass integrated
function getFullBaseUrl() {
	return "https://"+program.user+":"+program.pass+"@"+program.base+".uilicious.com";
}

///
function uiliciousRequest(method, path, params, callback) {
	// Options setup
	let options = {
		url: getFullBaseUrl()+path,
		method: method || "GET"
	};

	// Promise object to return
	return new Promise(function(good,bad) {
		request(options, function(err, res, body) {
			if( err ) {
				throw new Error("Unexpected error for URI request : "+path+" -> "+err);
			} else {
				try {
					good(JSON.parse(body));
				} catch(e) {
					throw new Error("Invalid JSON response for URI request : "+path+" -> "+body);
				}
			}
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
	return uiliciousRequest(
		"GET",
		"/api/projects",
		{},
		callback
	);
}

/// Get a project ID, given the project name
///
/// @param  Project name to lookup
/// @param  [Optional] Callback to return result, defaults to console.log
///
/// @return  Promise object, for project ID result
function projectID(projname, callback) {
	return new Promise(function(good,bad) {
		projectList().then(function(list) {
			for(let i=0; i<list.length; ++i) {
				let item = list[i];
				if(item.title == projname) {
					good(item.id);
					return;
				}
			}
			console.error("ERROR: Project Name not found: "+projname);
			return;
		});
	}).then(callback);
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

	// // Sanatize and validate inputs
	// console.log("Base: "+program.base);
	// console.log("User: "+program.user);
	// console.log("Pass: "+program.pass);

	projectID(projname, function(id) { console.log(id); });
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
	.option('-b, --base <required>', 'Host name parameter (without .uilicious.com)')
	.option('-u, --user <required>', 'Username to login as')
	.option('-p, --pass <required>', 'Password to login as')
	.option('-d, --directory <required>', 'Output directory path to use')
	.command('run <projname> <scriptpath>')
	.action(main);

// end with parse to parse through the input
program.parse(process.argv);

// if program was called with no arguments, show help.
if (program.args.length === 0) {
	program.help(); //Terminates as well
}
