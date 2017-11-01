/**
 * Utility classes that provided functionality that may/may not be
 * cross application applicable. This focuses on API specifically
 * @author Shahin Alam(shahin@uilicious.com)
 */
const request = require('request');
const url = require('url');
const program = require('commander');
const api = require('../utils/api');

class APIUtils {

	static requestErrorHandler(err) {
		console.log("FATAL ERROR >> ");
		console.log(err);
		process.exit(1);
	}

	/**
     * Makes a POST or GET request, with the given form object
     * and return its JSON result in a promise
     * @param method "POST" or "GET" method
     * @param url
     * @param data
     * @param callback
     * @return {Promise.<TResult>}
     */
	static rawRequestData(method, url, data) {

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
						return;
					} catch(err) {
						throw new Error("Invalid data (JSON) format for URL request : " + url + " -> " + body);
					}
				}
			});
		});
	}

    /**
     * Makes a POST or GET request for test requests, with the given form object (strictly for test requests)
     * and return its JSON result in a promise
     * @param method
     * @param url
     * @param data
     * @param callback
     * @return {Promise.<TResult>}
     * @constructor
     */
	static TestRequestData(method, url, data) {

		// Option / parameter parsing
		var option = {
			url : url,
			method : method
		};
		if ( method == "GET" || method == "POST") {
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
						return;
					} catch(err) {
						throw new Error("Invalid data (JSON) format for URL request : " + url + " -> " + body);
					}
				}
			});
		});
	}


    /**
     * Makes a GET or POST request, with the given form object
     * and return its JSON result in a promise
     * @param method
     * @param url
     * @param inData
     * @param callback
     * @return {Promise.<TResult>}
     */
	static jsonRequest(method, url, inData) {
		// Calling rawRequest, and parsing the good result as JSON
		return new Promise(function(good, bad) {
			APIUtils.rawRequestData(method, url, inData)
                .then(data=> {
                    try {
					    good(JSON.parse(data));
					    return;
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
		});
	}

    /**
     * Debug the request and response
     * @param method
     * @param url
     * @param inData
     * @param callback
     * @return {Promise.<TResult>}
     * @constructor
     */
	static TestRequest(method, url, inData, callback) {
		// Calling rawRequest, and parsing the good result as JSON
		return new Promise(function(good, bad) {
			return APIUtils.TestRequestData(method, url, inData)
                .then(function(data) {
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

    /**
     * Does a login check, and provides the actual server URL to call API
     * silently terminates, with an error message if it fails
     * @return {*}
     */
	static getFullHostURL() {
		/// Cached full host URL
		 var _fullHostURL = null;

		if ( _fullHostURL != null ) {
			return Promise.resolve(_fullHostURL);
		}

		return new Promise(function(good, bad) {
			return APIUtils.jsonRequest(
				"POST",
				"https://beta-login.uilicious.com/api/fetchHostURL",
				{
					"user" : program.user,
					"pass" : program.pass
				})
                .then(res => {
					if ( res.protectedURL == null ) {
						console.error("ERROR: Unable to login - Invalid username/password");
						process.exit(1);
					} else {
						var _fullHostURL = res.protectedURL;
						good(_fullHostURL);
						return;
					}
				});
		});
	}

    /**
     * Does a JSON request to web-studio instance of the client
     * @param method
     * @param webPath
     * @param params
     * @param callback
     * @return {Promise.<TResult>}
     */
	static webstudioJsonRequest(method, webPath, params) {
		return new Promise(function(good, bad) {
			return APIUtils.getFullHostURL()
                .then(hostURL=> APIUtils.jsonRequest(method, hostURL+webPath, params))
                .then(response => {
                    good(response);
                    return;
                });
		});
	}

    /**
     * Does a request to web-studio for test run
     * @param method
     * @param webPath
     * @param params
     * @return {Promise}
     */
	static webstudioTestRequest(method, webPath, params) {
		return new Promise(function(good, bad) {
			return APIUtils.getFullHostURL()
                .then(hostURL=> APIUtils.TestRequest(method, hostURL+webPath, params))
                .then(response => {
                    good(response);
                    return;
                });
		});
	}

    /**
     * Does a RAW request to web-studio instance of the client
     * @param method
     * @param webPath
     * @param params
     * @return {Promise}
     */
	static webstudioRawRequest(method, webPath, params) {
		return new Promise(function(good, bad) {
			return APIUtils.getFullHostURL()
                .then(hostURL=> APIUtils.rawRequestData(method, hostURL+webPath, params))
                .then(data => {
                    good(JSON.parse(data));
                    return;
                });
		});
	}

    /**
     * This will authenticate the user
     * @return {Promise}
     */
	static login(){
	    return new Promise(function (good,bad) {
            return api.account.login({loginName:"myNewEdgeTest9@uilicious.com",password: "Password123456"})
                .then(response => {
                    console.log(response);
                    good(true);
                    return;
                });
        });
    }

}

module.exports = APIUtils;
