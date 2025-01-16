/**
 * # ApiServerConnector
 * 
 * Provides the core api connection, with cookie/login handling logic.
 * DOES NOT provide any of the API specific logic.
 */

//------------------------------------------------------------------------
//
// Dependencies
//
//------------------------------------------------------------------------

const yargs = require("yargs")
const url = require("url")
const axios = require("axios")
const FormData = require("form-data")
const isStream = require("is-stream")
const httpAdapter = require('axios/lib/adapters/http');

const retryForResult = require("./retryForResult");
const OutputHandler = require("../OutputHandler")
const PromiseQueue = require("promise-queue")

//------------------------------------------------------------------------
//
// Parse command line arguments
//
//------------------------------------------------------------------------

const argv = yargs.option('trace', {
	alias: 't',
	type: 'boolean',
	description: 'Run with trace logging'
  }).argv;

const verbose = !!argv.trace;

//------------------------------------------------------------------------
//
// Proxy settings
//
//------------------------------------------------------------------------

// create an axios instance
let _axios = axios.create({})

// if "no_proxy" environment variable is set, disable proxy
if(process.env.no_proxy) {
	// do nothing
	if(verbose){
		console.log("env.no_proxy set, disabling proxy.")
	}
}

// Get proxy settings from "https_proxy" or "http_proxy" environment variable
else if(process.env.https_proxy || process.env.http_proxy) {

	// Parse the proxy URL
	let proxyUrl = null
	try{
		if(process.env.https_proxy) {
			proxyUrl = new url.URL(process.env.https_proxy)
			if(verbose){
				console.log("env.https_proxy=", proxyUrl)
			}
		}else{
			proxyUrl = new url.URL(process.env.http_proxy)
			if(verbose){
				console.log("env.http_proxy=", proxyUrl)
			}
		}
	}catch(e){
		throw new Error("Invalid proxy URL: " + process.env.https_proxy)
	}

	// create a proxy config object
	let proxyConfig = {}
	proxyConfig.protocol = proxyUrl.protocol
	proxyConfig.host = proxyUrl.hostname
	proxyConfig.port = proxyUrl.port || 443
	if(proxyUrl.username && proxyUrl.password) {	
		proxyConfig.auth = {
			username: proxyUrl.username,
			password: proxyUrl.password
		}
	}

	// create an axios instance with proxy settings
	_axios = axios.create({
		proxy: proxyConfig
	})

	if(verbose){
		console.log("Proxy configured.")
	}

}

//------------------------------------------------------------------------
//
// Adding of cookie support, specifically for uilicious use case
//
//------------------------------------------------------------------------

// Prepare the request Queue
// (which handles throttling the number of request to 4 request at a time)
// See: https://www.npmjs.com/package/promise-queue
let REQ_QUEUE = new PromiseQueue(4, Infinity)

// Cookie jar to use
let COOKIE_JAR = {}

// Sever connection settings
let BASE_URL = null
let AS_ACCOUNT_ID = null

// Inject cookie values into a request
_axios.interceptors.request.use(config => {

	let sizeOfCookieJar = Object.keys(COOKIE_JAR).length;
	if(sizeOfCookieJar > 0) {
		let cookies = []
		for(let attribute in COOKIE_JAR) {
			cookies.push(COOKIE_JAR[attribute])
		}
		
		config.headers["Cookie"] = cookies.join(";");
	}

	return config
})

// Extract cookie settings from response, used for login process
_axios.interceptors.response.use(response => {

	let responseCookie = response.headers["set-cookie"]
	if(responseCookie!= null){
		// For each of the cookie in responseCookie
		// Only store account_ses, account_tok, account_rmb, account_exp
		for(let index=0; index< responseCookie.length; index++) {

			// Lets get the responseCookie - set cookie segments
			let cookieSegment = responseCookie[index];

			// and skip if its blank
			if( cookieSegment == null || cookieSegment.length <= 0 ) {
				continue;
			}

			// Lets ensure extra "information" after ";" is removed
			cookieSegment = cookieSegment.split(";")[0];

			// Lets get the respective segments that needs storing
			let cookieKeys = [
				"csrf-token",
				"account_ses",
				"account_tok",
				"account_rmb",
				"account_exp"
			];

			// Iterate the cookie keys
			for(let keyIdx=0; keyIdx<cookieKeys.length; ++keyIdx) {
				// Get the respective key
				let key = cookieKeys[keyIdx];

				// Check if the key is relevent
				if(cookieSegment.indexOf(key) > -1) {
					COOKIE_JAR[key] = cookieSegment;
				}
			}
			
		}
	}
	
	return response
}, error => {
	// https://github.com/axios/axios#handling-errors
	// https://github.com/axios/axios/issues/960#issuecomment-320659373
	// When error 500 occurs
	// Need to have a way to safely ensure that the error returned is not
	// messed up
	return (error.response);
})

//------------------------------------------------------------------------
//
// HTTP utility functions
//
//------------------------------------------------------------------------

function transformParams(data) {
	if (typeof data === "undefined" || null) {
		data = {}
	}
	
	// Impersonation
	if (AS_ACCOUNT_ID) {
		data.asAccountID = AS_ACCOUNT_ID
	}
	// Append CLI request flag
	data.isCLI = true

	return data
}

function transformRequestData(data) {
	if (typeof data === "undefined" || null) {
		data = new FormData()
	}

	// Prepare the form data (max size 100MB)
	let formData = new FormData( { maxDataSize: (100 * 1000 * 1000) })
	if (data instanceof FormData) {
		// coerce into form data
		formData = data
	} else if (typeof data === "object") {
		Object.keys(data).forEach((prop) => {
			let value = data[prop]

			try {
				if(value == null || value == undefined) {
					// does nothing
				} else if(isStream(value)){
					formData.append(prop, value)
				} else if(value instanceof Buffer) {
					formData.append(prop, value)
				} else if (typeof value === "boolean" || typeof value === "number" || typeof value === "object" ){
					formData.append(prop, JSON.stringify(value))
				} else if (Array.isArray(value)) {
					formData.append(prop, JSON.stringify(value))
				} else if( typeof value === "string" ) {
					formData.append(prop, value)
				} else {
					OutputHandler.debug("WARNING - Skipping unknown data type in form data property name: "+ prop+ " type "+ typeof value)
				}
			} catch(e) {
				OutputHandler.debug("WARNING - Skipping parameter due to conversion error: "+ prop+ ", type="+ typeof value+", err="+e)
			}
		})
	}
	
	// Impersonation
	if (AS_ACCOUNT_ID) {
		formData.append("asAccountID", AS_ACCOUNT_ID)
	}

	// Append CLI request flag
	formData.append("isCLI", 1)

	return formData
}

//------------------------------------------------------------------------
//
// Handling of HTTP requests
//
//------------------------------------------------------------------------

/**
 * GET request handling
 */
function GET(url, params) {
	// Ensure requests go through the global queue system
	return REQ_QUEUE.add(async function() {
		// todo: handle user being online or offline
		return _axios
			.get(BASE_URL + url, {params: transformParams(params), withCredentials: true})
			.then((res) => {
				if(res.data == null) {
					return Promise.reject(res.ERROR || res.error || "Missing response data : \n"+res);
				}
				return Promise.resolve(res.data)
			});
	});
}

/**
 * Simple POST request handling
 */
function POST(url, data, isMultipart = false) {
	// Adapt the request data
	if(isMultipart) {
		data = transformRequestData(data)
	} else {
		if (AS_ACCOUNT_ID) {
			data.asAccountID = AS_ACCOUNT_ID;
		}
	}

	// Axios config
	let config = {
		responseType: 'json',
		withCredentials: true
	}
	if(isMultipart) {
		config.headers = data.getHeaders()
	}

	// Ensure requests go through the global queue system
	return REQ_QUEUE.add(async function() {
		// todo: handle user being online or offline
		return _axios
			.post(BASE_URL + url, data, config)
			.then((res) => {
				if(res == null) {
					return Promise.reject("Unexpected NULL response");
				}
				if(res.data == null) {
					return Promise.reject(res.ERROR || res.error || "Missing response data : \n"+res);
				}
				return Promise.resolve(res.data)
			})
			// .catch((error) => {
			// 	// return Promise.reject(error) // returns  
			// 	// console.log(error)
			// 	return Promise.resolve({ "error": error.message })
			// })
	});
}

/**
 * Advance POST request handling of streaming data
 */
function POST_stream(url, data, isMultipart = false) {
	// Adapt the request data
	if(isMultipart) {
		data = transformRequestData(data)
	}
	
	// Ensure requests go through the global queue system
	return REQ_QUEUE.add(async function() {
		return _axios
			.post(BASE_URL + url, data, {responseType: 'stream', adapter: httpAdapter, withCredentials: true})
			.then((res) => {
				if(res.data == null) {
					return Promise.reject(res.ERROR || res.error || "Missing response data : \n"+res);
				}
				// if(typeof res.data.ERROR !== "undefined" && res.data.ERROR !== null){
				// 	return Promise.reject(res.data.ERROR)
				// }
				// todo: this is missing from the /config/premise method
				// if(typeof res.data.result === "undefined"){
				// 	return Promise.reject("missing `result` from response")
				// }
				return Promise.resolve(res.data)
			})
			// .catch((error) => {
			// 	return Promise.reject(error) // returns 
			// })
	});
}

//------------------------------------------------------------------------
//
// Basic user login, and authentication
//
//------------------------------------------------------------------------

async function accountAuth(user, pass) {
	// Get the CSRF token first
	await POST("/account/issueCSRFToken");

	// Then do the login
	return POST("/account/login", {
		loginName: user,
		password:  pass
	})
}

async function accessKeyAuth(accesskey) {
	// Get the CSRF token first
	await POST("/account/issueCSRFToken");

	// Then do the login
	return POST("/accesskey/auth", {
		accessKey: accesskey
	})
}

function argsSetup_processApiHostAndAuth(main) {

	main.layeredCheck(async function(argv, context) {
		// Lets normalize the apiHost
		// use "https://httpbin.org/status/500" to simulate failure
		BASE_URL = argv.apiHost || "https://api.uilicious.com/v3.0/" 
		
		// @TODO - Api Host Validation
		// require("./util/ApiHostTest")(argv.apiHost);

		// Login result
		let isLogin = false;

		// Attempt login using --key
		if(argv.key) {
			// Lets try up to 3 times
			try {
				isLogin = await retryForResult( async () => { return await accessKeyAuth(argv.key); } );
			} catch(err) {
				// Ok at this point multiple authenticaiton attemps was tried - fail it hard
				OutputHandler.fatalError("Unknown error while attempting to authentication using access key", err, 3);
			}

			// Fail if login failed
			if(isLogin == false) {
				OutputHandler.fatalError("Invalid access key", null, 2);
			}
		}

		// Attempt login using --user / --pass
		if(argv.user && argv.pass) {
			// Lets try up to 3 times
			try {
				isLogin = await retryForResult( async () => { return await accountAuth(argv.user, argv.pass); } );
			} catch(err) {
				// Ok at this point multiple authenticaiton attemps was tried - fail it hard
				OutputHandler.fatalError( "Unknown error while attempting to authentication using username and password", err, 3);
			}

			// Fail if login failed
			if(isLogin == false) {
				OutputHandler.fatalError( "Invalid username / password", null, 2);
			}
		}

		// ADMIN login actions
		if( isLogin ) {
			// asAccountID alias support
			if(argv.asAccountID) {
				argv.loginAs = argv.loginAs || argv.asAccountID;
			}
	
			// loginAs support
			if(argv.loginAs) {
	
				// loginAs argument passing
				let loginAs = argv.loginAs;
	
				// Lets attempt to find the login ID from the email
				// note as a safety measure, we will require a full exact match
				let userList = await retryForResult( async () => { 
					return POST("/admin/account/list", {
						loginName: loginAs,
						start: 0,
						length: 1
					});
				});
	
				// Handle the found user
				if( userList.length >= 1 ) {
					// Check its validity (require a full match)
					let user = userList[0];
					if( user.email == loginAs || user.loginNameList.indexOf(loginAs) > 0 ) {
						AS_ACCOUNT_ID = user._oid;
					}
				} else if( loginAs.length == 22 ) {
					
					// Handle the GUID search instead (user not found by email)
					userList = await retryForResult( async () => { 
						return POST("/admin/account/list", {
							_oid: loginAs,
							start: 0,
							length: 1
						});
					});

					// Return matching GUID
					if( userList.length >= 1 ) {
						AS_ACCOUNT_ID = userList[0]._oid;
					}
				}

				// Does a validation that loginAs is properlly matched
				if( AS_ACCOUNT_ID == null ) {
					OutputHandler.fatalError( "Failed loginAs support for (are you an admin?) : "+loginAs, null, 2);
				}
			}
		}

		// Handles login rejections
		if( !isLogin ) {
			OutputHandler.fatalError( "No valid authentication information provided", null, 1);
		}

		// Return at the end
		return;
	});
	
}

//------------------------------------------------------------------------
//
// Module export
//
//------------------------------------------------------------------------

// As a single object
const ApiServerConnectorSingleton = {

	// Basic GET / POST
    GET: GET,
    POST: POST,
	POST_stream: POST_stream,
	
	// Configure the API host
    configureApiHost: function(apHost) {
        BASE_URL = apHost;
	},
	
	// Basic login
	// accountAuth: accountAuth,
	// accessKeyAuth: accessKeyAuth,

	// Argument processing
	argsSetup_processApiHostAndAuth: argsSetup_processApiHostAndAuth
}

// Exported
module.exports = ApiServerConnectorSingleton;