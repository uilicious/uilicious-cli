//-------------------------------------
//
// Dependencies
//
//-------------------------------------

const OutputHandler = require("./OutputHandler")

//-------------------------------------
//
// Implementation
//
//-------------------------------------

/**
 * Various command line argument setup and validation
 * Grouped into single reusable functions for setup
 **/
class ArgumentValidator {

	/**
	 * Setup the required CLI args for authentication
	 * @param {sywac} main 
	 */
	argsSetup_authentication(main) {
				
		//
		// Authentication argument hanlding
		//

		// Basic authentication arguments 
		main.string("-u, --user <login-email>", {
			description: "Login email [Note: please use --key instead]"
		})
		main.string("-p, --pass <password>", {
			description: "Login password [Note: please use --key instead]"
		})
		main.string("-k, --key  <access-key>", {
			description: "Access key for CLI / API login, you can find this from your `Profile` -> `Access Keys`. This can alternatively be provided using the `UILICIOUS_ACCESSKEY` environment variable"
		})

		// Alias remapping
		// of various legacy parameters
		main.string("--email, --username <login-email>", {
			hidden: true
		})
		main.string("--password <password>", {
			hidden: true
		})

		// Argument validation
		main.layeredCheck((argv, context) => {
			// Normalizing the arguments
			argv.user = argv.user || argv.u || argv.email || argv.username;
			argv.pass = argv.pass || argv.p || argv.password;
			
			// There is a key provided, use it
			if( argv.key && argv.key.length > 2 ) {
				return;
			} else if ( process.env.UILICIOUS_ACCESSKEY && process.env.UILICIOUS_ACCESSKEY.length > 2 ) {
				argv.key = process.env.UILICIOUS_ACCESSKEY;
				return;
			}

			// No key provided check for username && password
			if( argv.user && argv.user.length > 2 && argv.pass && argv.pass.length > 2 ) {
				return;
			}

			// Ok lets assume invalid login parameters now - time to bail!
			OutputHandler.cliArgumentError("Missing authentication parameters, use either `--key <access-key>` or `--user <login-email> --pass <password>`");
		});
	}
	
	/**
	 * Setup the required CLI args for apiHost
	 * @param {sywac} main 
	 */
	argsSetup_apiHost(main) {
		//
		// ApiHost and admin settings
		//

		main.string("--apiHost <url-string>", {
			description: "[Enterprise Only] API url for dedicated or on-premise"
		})
		main.string("--loginAs <login-email>", {
			description: "[Enterprise Only] As an super admin, perform an action impersonating as the given user"
		})

		// Normalizing of args - does not perform the actual validation
		main.layeredCheck((argv, context) => {
			// Lets normalize the apiHost
			// use "https://httpbin.org/status/500" to simulate failure
			argv.apiHost = argv.apiHost || "https://api.uilicious.com/v3.0/" 
		})
	}
	
	/**
	 * Setup the known deprecated CLI args, to throw errors on
	 * @param {sywac} main 
	 */
	argsSetup_deprecatedWithErrors(main) {
		main.string("--ngrokParam <ngrok-param>", {
			hidden: true
		})
		main.string("--ngrokPort <ngrok-port>", {
			hidden: true
		})
		main.layeredCheck((argv, context) => {
			if(argv.ngrokParam || argv.ngrokPort) {
				OutputHandler.cliArgumentError("ngrokParam / ngrokPort is deprecated - please consider using ngrok directly instead (https://ngrok.com/)");
			}
		});
	}

};

// The module export
const ArgumentValidatorSingleton = new ArgumentValidator();
module.exports = ArgumentValidatorSingleton;