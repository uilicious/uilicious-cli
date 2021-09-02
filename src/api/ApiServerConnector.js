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

const axios = require("axios")
const FormData = require("form-data")
const isStream = require("is-stream")
const httpAdapter = require('axios/lib/adapters/http');

const retryForResult = require("./retryForResult");
const OutputHandler = require("../OutputHandler")
const PromiseQueue = require("promise-queue")

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
axios.interceptors.request.use(config => {
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
axios.interceptors.response.use(response => {
	let responseCookie = response.headers["set-cookie"]
	if(responseCookie!= null){
		// For each of the cookie in responseCookie
		// Only store account_ses, account_tok, account_rmb, account_exp
		for(let index=0; index< responseCookie.length; index++) {
			if(responseCookie[index].indexOf("account_ses") > -1) {
				COOKIE_JAR.account_ses = responseCookie[index]
			}
			if(responseCookie[index].indexOf("account_tok") > -1) {
				COOKIE_JAR.account_tok = responseCookie[index]
			}
			if(responseCookie[index].indexOf("account_rmb") > -1) {
				COOKIE_JAR.account_rmb = responseCookie[index]
			}
			if(responseCookie[index].indexOf("account_exp") > -1) {
				COOKIE_JAR.account_exp = responseCookie[index]
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
	// coerce into form data
	let formData = new FormData()
	if (data instanceof FormData) {
		formData = data
	} else if (typeof data === "object") {
		Object.keys(data).forEach((prop) => {
			let value = data[prop]

			try {
				if(value != null && isStream(value)){
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
					LoggerWithLevels.warn("WARNING - Skipping unknown data type in form data property name: "+ prop+ " type "+ typeof value)
				}
			} catch(e) {
				LoggerWithLevels.warn("WARNING - Skipping parameter due to conversion error: "+ prop+ ", type="+ typeof value+", err="+e)
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
		return axios
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
		return axios
			.post(BASE_URL + url, data, config)
			.then((res) => {
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
		return axios
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

function accountAuth(user, pass) {
	return POST("/account/login", {
		loginName: user,
		password:  pass
	})
}

function accessKeyAuth(accesskey) {
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
				OutputHandler.fatalError( ["Unknown error while attempting to authentication using access key", err] );
			}

			// Fail if login failed
			if(isLogin == false) {
				OutputHandler.fatalError("Invalid access key");
			}
		}

		// Attempt login using --user / --pass
		if(argv.user && argv.pass) {
			// Lets try up to 3 times
			try {
				isLogin = await retryForResult( async () => { return await accountAuth(argv.user, argv.pass); } );
			} catch(err) {
				// Ok at this point multiple authenticaiton attemps was tried - fail it hard
				OutputHandler.fatalError( "Unknown error while attempting to authentication using username and password", err );
			}

			// Fail if login failed
			if(isLogin == false) {
				OutputHandler.fatalError( "Invalid username / password" );
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
					OutputHandler.fatalError( "Failed loginAs support for (are you an admin?) : "+loginAs );
				}
			}
		}

		// Handles login rejections
		if( !isLogin ) {
			OutputHandler.fatalError( "No valid authentication information provided" );
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