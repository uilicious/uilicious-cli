#!/usr/bin/env node
'use strict';

//------------------------------------------------------------------------------------------
//
// dependencies
//
//------------------------------------------------------------------------------------------
const program = require('commander');

//------------------------------------------------------------------------------------------
//
// main command
//
//------------------------------------------------------------------------------------------

function main(projname, scriptpath, options) {
	console.log("Project Name: "+projname);
	console.log("Script Path : "+scriptpath);
	
	console.log("Base: "+program.base);
	console.log("User: "+program.user);
	console.log("Pass: "+program.pass);
}

//------------------------------------------------------------------------------------------
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
	.command('run <projname> <scriptpath>')
	.action(main);

// end with parse to parse through the input
program.parse(process.argv); 

// if program was called with no arguments, show help.
if (program.args.length === 0) {
	program.help(); //Terminates as well
}
