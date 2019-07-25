#!/usr/bin/env node

/**
 * Node JS wrapper for setting up binary links
 */

// NPM path
const path = require('path');
const fs   = require('fs');

// Process and argument path handling
const currentWorkingDirectory = process.cwd();
const nodeBinary = process.argv[0];
const executedFile = process.argv[1];
const arguments = process.argv.slice(2);  

// Script filename, and script directory
const scriptFilePath = __filename;
const scriptDirectory = __dirname;

// Mapping from Node's `process.arch` to Golang's `$GOARCH`
const ARCH_MAPPING = {
	"ia32": "386",
	"x64": "amd64"
};

// Mapping between Node's `process.platform` to Golang's 
const PLATFORM_MAPPING = {
	 "darwin": "darwin",
	 "linux": "linux",
	 "win32": "windows"
};

if (!(process.arch in ARCH_MAPPING)) {
	console.error("Uilicious-CLI is not supported for this architecture: " + process.arch);
	return;
}

if (!(process.platform in PLATFORM_MAPPING)) {
	console.error("Uilicious-CLI is not supported for this platform: " + process.platform);
	return
}

// Get the bin executable path
// Binary name on Windows has .exe suffix
var binName = null
if(process.platform === "darwin") {
	binName = path.join(scriptDirectory, "bin/uilicious-cli-macos-32bit");
} else if(process.platform === "win32") {
	binName = path.join(scriptDirectory, "bin/uilicious-cli-windows-32bit.exe");
} else if(process.platform === "linux") {
	if(process.arch === "x64") {
		binName = path.join(scriptDirectory, "bin/uilicious-cli-linux-64bit");
	} else {
		binName = path.join(scriptDirectory, "bin/uilicious-cli-linux-32bit");
	}
}

/**
 * Cleanup and setup the final binary link
 */

// Lets setup the binary link, which is cross platform compatible
let finalBinary = path.join(scriptDirectory,"bin/uilicious-bin.exe");
// Lets rm the final binary if it existed from a previous install
if( fs.existsSync(finalBinary) ) {
	fs.unlinkSync(finalBinary);
}
// And make the symlink
fs.symlinkSync( binName, finalBinary );

/**
 * Cleanup of uneeded binary
 */
let binList = [
	path.join(scriptDirectory, "bin/uilicious-cli-macos-32bit"),
	path.join(scriptDirectory, "bin/uilicious-cli-windows-32bit.exe"),
	path.join(scriptDirectory, "bin/uilicious-cli-linux-64bit"),
	path.join(scriptDirectory, "bin/uilicious-cli-linux-32bit")
]
for(let i=0; i<binList.length; ++i) {
	if( binName != finalBinary[i] ) {
		fs.unlinkSync(binList[i])
	}
}

