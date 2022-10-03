#!/usr/bin/env node

//-------------------------------------
//
// Main Sywac Setup & Dependencies
//
//-------------------------------------

const MainSywac = require("./MainSywac");
const OutputHandler = require("./OutputHandler")
const ArgumentValidator = require("./ArgumentValidator")

//-------------------------------------
//
// Various argument handling setup
//
//-------------------------------------

// Authentication argument handling
//
// Active: --user, --pass, --key
// Legacy: --email, --password 
ArgumentValidator.argsSetup_authentication(MainSywac);

// Output Handler configuration
//
// Active: --jsonOutput, --jsonOutputFile, --trace, --silent
OutputHandler.argsSetup_output(MainSywac);

// [Enterprise only] apiHost and other settings
//
// Active: --apiHost, --loginAs
ArgumentValidator.argsSetup_apiHost(MainSywac);

// Legacy arguments handling
//
// Legacy: --ngrokParam, --ngrokPort
ArgumentValidator.argsSetup_deprecatedWithErrors(MainSywac);

// Server login handling - this locks the current ApiServerConnector.js
// into the current provided login credentials
require("./api/ApiServerConnector.js").argsSetup_processApiHostAndAuth(MainSywac)

//-------------------------------------
//
// Command handling
//
//-------------------------------------

MainSywac.command("space <subcommand> <args>", {
	desc: "space specific commands, currently limited to : list",
	ignore: ['<subcommand>', '<args>'],
	setup: (sywac) => {
		sywac.command( require("./cli-command/space/list.js") );
	}
});

MainSywac.command("project <subcommand> <args>", {
	desc: "Project specific commands, such as : run, list, upload, download",
	ignore: ['<subcommand>', '<args>'],
	setup: (sywac) => {
		sywac.command( require("./cli-command/project/list.js") );
		sywac.command( require("./cli-command/project/filelist.js") );
		sywac.command( require("./cli-command/project/run.js") );
		sywac.command( require("./cli-command/project/upload.js") );
		sywac.command( require("./cli-command/project/download.js") );
		sywac.command( require("./cli-command/project/concurrency.js") );
	}
});

// Job commands
MainSywac.command("job <subcommand> <args>", {
	desc: "job specific commands, such as : run, list, status, waitFor",
	ignore: ['<subcommand>', '<args>'],
	setup: (sywac) => {
		// Job listing command
		sywac.command( require("./cli-command/job/list.js") );
		sywac.command( require("./cli-command/job/history.js") );
		sywac.command( require("./cli-command/job/start.js") );
	}
});


function setupAliasDescription(commandObj, alias) {
	// Clone the original object
	let ret = Object.assign({}, commandObj);

	// Update the description
	ret.desc = (commandObj.desc || commandObj.description)+` [Alias to: ${alias}]`;
	return ret;
}

// Quick top level run/upload/download
MainSywac.command( setupAliasDescription( require("./cli-command/project/run.js"), "project run" ) );
MainSywac.command( setupAliasDescription( require("./cli-command/project/upload.js"), "project upload" ) );
MainSywac.command( setupAliasDescription( require("./cli-command/project/download.js"), "project download" ) );

//----------------------------------------------------
//
// Examples !!!
//
//----------------------------------------------------

MainSywac.example("$0 --key <access-key> project run 'Project-Awesome' 'suite/test-all'", {
	desc: "Runs a test file in the given project name"
});
MainSywac.example("$0 --key <access-key> project run 'Project-Awesome' 'suite/test-all' --browser firefox --width 1080 --height 720 ", {
	desc: "Runs with a custom browser (firefox), width and height instead" // https://user.uilicious.com/profile/accessKeys
})
MainSywac.example("$0 --user <your-awesome-email@not-evil-corp.com> --pass <super-secure-password> run 'Project-Awesome' 'suite/test-all'", {
	desc: "Runs a test using your login email and password instead (please use --key instead)"
});
MainSywac.example("$0 --key <access-key> project upload 'Project-Delta' ./delta/ui-test/", {
	desc: "Upload a folder of files, into the uilicious project, overwrite any existing files"
});
MainSywac.example("$0 --key <access-key> project download 'Project-Gamma' ./gamma/ui-test/", {
	desc: "Download a ulicious project into a folder, overwrite any existing files"
});
MainSywac.example("$0 --apiHost https://<hostname>/<subpath-if-present>/api/v3.0/' <command>", {
	desc: "[Enterprise only] Using the CLI with your dedicated instance of uilicious"
});

//-------------------------------------
//
// Time to let the CLI run!
//
//-------------------------------------

// Enable strict mode
MainSywac.strict(true);

// Parse and exit
MainSywac.parseAndExit().then(argv => {
	// Unparsed segments are placed into: argv._
	// as such we should terminate ! if any unknown command is found
	if( argv._.length > 0 ) {
		OutputHandler.cliArgumentError("Unknown command: "+argv._.join(" "))
	}
});
