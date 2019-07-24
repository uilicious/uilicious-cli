#!/usr/bin/env node

/**
 * Node JS wrapper for Uilicious CLI installation
 */

// Command line process spawner
const spawn = require('child_process').spawn;

// NPM path
const path = require('path');

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
	binName = path.join(scriptDirectory, "/bin/uilicious-cli-macos");
} else if(process.platform === "win32") {
	binName = path.join(scriptDirectory, "/bin/uilicious-cli-windows.exe");
} else if(process.platform === "linux") {
	binName = path.join(scriptDirectory, "/bin/uilicious-cli-linux");
}

// Execute the binary file, and pass forward the arguments
var child = spawn(binName, arguments);

// Pipe the output and error stream from the go-cli to the nodejs output
child.stdout.on('data', function(data) {
	process.stdout.write(data);
	// // It will ignore any empty lines or empty new line breaks.
	// data = data.toString().split(/(\r?\n)/g);
	// data.forEach((item, index) => {
	//     if (data[index] !== '\n' && data[index] !== '') {
	//         console.log(data[index]);
	//     }
	// });
});
child.stderr.on('data', function(data) {
	process.stderr.write(data);
});

// Close this node process when the go CLI finishes
// when either the input stream close or binary program exits
child.on('close', function(code, signal) {
  process.exit(code);
});
child.on('exit', function (code, signal) {
	process.exit(code);
});

// Output hard errors (OS, NodeJS), directly in their various edge cases
child.on('error', (err) => {
	console.error(err);
});

