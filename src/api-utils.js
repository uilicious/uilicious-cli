/**
 * Utility classes that provided functionality that may/may not be
 * cross application applicable. This focuses on API specifically
 */
const request = require('request');
const url = require('url');
const program = require('commander');

class APIUtils {

	static requestErrorHandler(err) {
		console.log("FATAL ERROR >> ");
		console.log(err);
		process.exit(1);
	}

	/// Makes a POST or GET request, with the given form object
	/// and return its JSON result in a promise
	///
	/// @param  "POST" or "GET" method
	/// @param  FULL URL to make the request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	/// @return The promise object, with the attached callback
	static rawRequestData(method, url, data, callback) {

		// Option / parameter parsing
		var option = {
			url : url,
			method : method
		};
		if ( method == "GET" ) {
			option.qs = data;
		} else {
			option.form = data;
		}

		// The actual API call, with promise object
		return new Promise(function(good, bad) {
			request(option, function( err, res, body ) {
				if (err) {
					throw new Error("Unexpected error for URL request : " + url + " -> " + err);
				} else {
					try {
						good(body);
					} catch(err) {
						throw new Error("Invalid data (JSON) format for URL request : " + url + " -> " + body);
					}
				}
			});
		}).then(callback);
	}

	/// Makes a POST or GET request, with the given form object (strictly for test requests)
	/// and return its JSON result in a promise
	///
	/// @param  "POST" or "GET" method
	/// @param  FULL URL to make the request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	/// @return The promise object, with the attached callback
	static TestRequestData(method, url, data, callback) {

		// Option / parameter parsing
		var option = {
			url : url,
			method : method
		};
		if ( method == "GET" ) {
			option.form = data;
		} else {
			option.form = data;
		}

		// The actual API call, with promise object
		return new Promise(function(good, bad) {
			request(option, function( err, res, body ) {
				if (err) {
					throw new Error("Unexpected error for URL request : " + url + " -> " + err);
				} else {
					try {
						good(body);
					} catch(err) {
						throw new Error("Invalid data (JSON) format for URL request : " + url + " -> " + body);
					}
				}
			});
		}).then(callback);
	}

	/// Makes a POST or GET request, with the given form object
	/// and return its JSON result in a promise
	///
	/// @param  Write stream to output data into
	/// @param  "POST" or "GET" method
	/// @param  FULL URL to make the request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	/// @return The promise object, returns the request object
	static streamRequest(writeStream, method, url, data, callback) {
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
		return new Promise(function(good, bad) {
			let req = request(option);
			req.pipe(writeStream)
				.on('error', function(err){
					throw new Error("Unexpected error for URL request : " + url + " -> " + err);
				})
				.on('close', function(misc) {
					good(req, misc);
				});
		}).then(callback);
	}

	/// Makes a GET or POST request, with the given form object
	/// and return its JSON result in a promise
	///
	/// @param  "GET" or "POST" method
	/// @param  FULL URL to make the request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	/// @return The promise object, with the attached callback, returns the JSON output
	static jsonRequest(method, url, inData, callback) {
		// Calling rawRequest, and parsing the good result as JSON
		return new Promise(function(good, bad) {
			APIUtils.rawRequestData(method, url, inData).then(function(data) {
				try {
					good(JSON.parse(data));
				} catch(err) {
					console.error("---- Error trace ----");
					console.error(err);
					console.error("---- HTTP response data ----");
					console.error(data);
					console.error("---- HTTP request URL ----");
					console.error(url);
					console.error("---- HTTP request data ----");
					console.error(inData);
					console.error("---- End of error report ----");
					process.exit(1);
				}
			},bad);
		}).then(callback);
	}

	static TestRequest(method, url, inData, callback) {
		// Calling rawRequest, and parsing the good result as JSON
		return new Promise(function(good, bad) {
			APIUtils.TestRequestData(method, url, inData).then(function(data) {
				try {
					good(JSON.parse(data));
				} catch(err) {
					console.error("---- Error trace ----");
					console.error(err);
					console.error("---- HTTP response data ----");
					console.error(data);
					console.error("---- HTTP request URL ----");
					console.error(url);
					console.error("---- HTTP request data ----");
					console.error(inData);
					console.error("---- End of error report ----");
					process.exit(1);
				}
			},bad);
		}).then(callback);
	}

	/// Does a login check, and provides the actual server URL to call API
	/// silently terminates, with an error message if it fails
	///
	/// @return   Promise object, returning the full URL to make request to
	static getFullHostURL(callback) {
		/// Cached full host URL
		 var _fullHostURL = null;

		if ( _fullHostURL != null ) {
			return Promise.resolve(_fullHostURL).then(callback);
		}

		return new Promise(function(good, bad) {
			APIUtils.jsonRequest(
				"POST",
				"https://beta-login.uilicious.com/api/fetchHostURL",
				{
					"user" : program.user,
					"pass" : program.pass
				},
				function(res) {
					if ( res.protectedURL == null ) {
						console.error("ERROR: Unable to login - Invalid username/password");
						process.exit(1);
					} else {
						var _fullHostURL = res.protectedURL;
						good(_fullHostURL);
					}
				}
			);
		}).then(callback);
	}

	/// Does a JSON request to web-studio instance of the client
	///
	/// @param  "POST" or "GET" method
	/// @param  Webstudio webPath request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	static webstudioJsonRequest(method, webPath, params, callback) {
		return new Promise(function(good, bad) {
			APIUtils.getFullHostURL(function(hostURL) {
				APIUtils.jsonRequest(method, hostURL+webPath, params).then(good, bad);
			});
		}).then(callback);
	}

	static webstudioTestRequest(method, webPath, params, callback) {
		return new Promise(function(good, bad) {
			APIUtils.getFullHostURL(function(hostURL) {
				APIUtils.TestRequest(method, hostURL+webPath, params).then(good, bad);
			});
		}).then(callback);
	}

	/// Does a RAW request to web-studio instance of the client
	///
	/// @param  "POST" or "GET" method
	/// @param  Webstudio webPath request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	static webstudioRawRequest(method, webPath, params, callback) {
		return new Promise(function(good, bad) {
			APIUtils.getFullHostURL(function(hostURL) {
				APIUtils.rawRequestData(method, hostURL+webPath, params).then(good, bad);
			});
		}).then(callback);
	}


	/// Makes a POST or GET request, with the given form object
	/// and return its JSON result in a promise
	///
	/// @param  Write stream to output data into
	/// @param  "POST" or "GET" method
	/// @param  FULL URL to make the request
	/// @param  [OPTIONAL] Query / Form parameter to pass as an object
	/// @param  [OPTIONAL] Callback parameter, to attach to promise
	///
	/// @return The promise object, returns the request object
	static webstudioStreamRequest(writeStream, method, webPath, params, callback) {
		return new Promise(function(good, bad) {
			APIUtils.getFullHostURL(function(hostURL) {
				APIUtils.streamRequest(writeStream, method, hostURL+webPath, params).then(good, bad);
			});
		}).then(callback);
	}

}

module.exports = APIUtils;
