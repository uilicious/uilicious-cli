#!/usr/bin/env node
// 'use strict';

// Setup basic logging
const LONG_LOG_LINE = "------------------------------------------------------------------------";
console.log(LONG_LOG_LINE);
console.log("Starting uilicious-cli test run");

//---------------------------------------------------------------------------------------------
//
//  Required sub-modules,
//  PS: as much as possible, avoid external libs, unless they are test libs
//
//---------------------------------------------------------------------------------------------

const fs = require("fs");
const path = require('path');
const child_process = require('child_process');
const assert = require('chai').assert;

//---------------------------------------------------------------------------------------------
//
//  Utility functions
//  AKA: Not this application specific, probably can copy pasta somewhere else as well
//
//---------------------------------------------------------------------------------------------

/// Scan the path for all directories, and return them as an array
///
/// @param   String path, to a directory (eg: ./hello)
///
/// @return  Array of directories, excluding srcpath (eg: motto)
function getDirectories(srcpath) {
	return fs.readdirSync(srcpath)
			.filter(file => fs.lstatSync(path.join(srcpath, file)).isDirectory());
}

/// Generates a random alpha numeric string, for various uses
///
/// @param   length of string required
/// @param   character key set, as a string (not array), defaults to alphanumeric if not given.
///
/// @return   The randomly generated string
function randomString(length, chars) {
	if( chars == null || chars.length == 0 ) {
		chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	}
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}

/// Extend chai asserting, to support an array of values
///
/// @param { Mixed } object
/// @param { Array. } keys
/// @param { String } message
assert.containsAllValues = function(obj, keyArr, msg) {
	for(var i in keyArr) {
		assert.include(obj, keyArr[i], msg);
	}
}


//---------------------------------------------------------------------------------------------
//
//  Startup internal variables, and checks
//
//---------------------------------------------------------------------------------------------

/// Path of the node installation being used to run this executable script
var nodePath   = process.argv[0];

/// Script path of the run.js, used to derive the other folder locations
var scriptPath = process.argv[1];

/// Test folder path
var testFolder = path.join(scriptPath, "..");

/// Project folder
var projectFolder = path.join(testFolder, "..");

/// CLI file
var uiliciousCliPath = path.join(projectFolder, "uilicious-cli.js");

/// User authtentication to use
var user = process.argv[2];

/// Password to use, should also accept API token keys (when that is finally implemented)
var pass = process.argv[3];

// User has no value check
if( !user ) {
	console.error("Missing user parameter");
	process.exit(1);
}

// Pass has no value check
if( !pass ) {
	console.error("Missing password parameter");
	process.exit(1);
}

console.log("Assuming test folder : "+testFolder);

/// Scripts to run array
var testPackages = process.argv.slice(4);

// If missing packages assume to search all
if( testPackages == null || testPackages.length == 0 ) {
	testPackages = getDirectories(testFolder);
}

console.log("All test suites : "+testPackages);

//---------------------------------------------------------------------------------------------
//
//  Test running functions
//
//---------------------------------------------------------------------------------------------

/// Run uilicious CLI WITHOUT username and password prefixed
///
/// @param   Arguments to pass (WITHOUT user/pass)
///
/// @return  String output of the command line
function runUiliciousCliRaw() {
	var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

	// Executing run
	var cmd = uiliciousCliPath+" "+args.join(" ");
	console.log("Executing >>> "+cmd);

	// This is SYNCRONOUS
	var output = child_process.execFileSync(uiliciousCliPath, args, {
		cwd : projectFolder,
		stdio : 'pipe',
		stderr : 'pipe',
		encoding : "utf-8"
	}, (error, stdout, stderr) => {
		retObj.error = error;
		retObj.stdout = stdout;
		retObj.stderr = stderr;
	});

	// RetObj is assumed to be properly set here
	return output;
}

/// Run uilicious CLI with username and password prefixed
///
/// @param   Arguments to pass (after user/pass)
///
/// @return  String output of the command line
function runUiliciousCli() {
	var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
	return runUiliciousCliRaw.apply(this, ["-u", user, "-p", pass].concat(args));
}

/// Runs a test package, and do an eval on test.js
///
/// @param   Test package name, to run the test.js from
///
/// @return  test.js return value (if any)
function runTestPackage(packageName) {

	/// The test folder, currently assumed
	var testJSFolder = path.join(testFolder, packageName);
	var testJS = path.join(testFolder, packageName, "test.js");
	var testJSContent = fs.readFileSync(testJS, { encoding : "utf-8" });


	// Run (i mean EVIL eval) the test case
	var ret = eval(testJSContent);

	// No exception occured, assuming everything pass (probably a bad assumption)
	console.log(packageName+"/test.js : no error");
	return ret;
}


//---------------------------------------------------------------------------------------------
//
//  Iterate and run the test packages
//
//---------------------------------------------------------------------------------------------

// Iterate the required packages to run
for( var packageIndx in testPackages ) {
	var onePackageName = testPackages[packageIndx];

	console.log(LONG_LOG_LINE);
	console.log("Running 1 test suite : "+onePackageName);

	runTestPackage(onePackageName);
}

//---------------------------------------------------------------------------------------------
//
//  Wrapping up test run
//
//---------------------------------------------------------------------------------------------
console.log(LONG_LOG_LINE);
