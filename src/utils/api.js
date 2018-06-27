var api = (function() {
/// API Builder javascript library
///
/// This is used by ApiBuilder, to generate out the full javascript file
/// with the various API endpoint initialized.
///
/// Normally this would be wrapped inside a function for the final api.js
/// to prevent uneeded global variable escape

/// The actual api object tor return
    var api = {};

/// api configuration object
    var apiconfig = {
        // baseURL: "//localhost:8080/api/",
        baseURL: null,
        apiKey: null
    };

/// The internal core sub namespace
    var apicore = {};
    api._core = apicore;

/// Function: api.isNodeJS
///
/// @return  Boolean true/false if the runtime environment is node.js compliant (or not)
    apicore.isNodeJS = function isNodeJS() {
        return ((typeof process !== 'undefined') && (typeof process.versions.node !== 'undefined') && require != null);
    }

//---------------------------------------------------------------------------------------
//
//  API client configuration
//
//---------------------------------------------------------------------------------------

/// Function: api._core.baseURL
///
/// @param   [Optional] overwrite the configured baseURL, avoid this, unless you know what your doing
///
/// @return  baseURL to call the api (as a string)
    apicore.baseURL = function baseURL(inBaseURL) {
        // Make configuration change when applicable
        if( inBaseURL ) {
            apiconfig.baseURL = inBaseURL;
        }
        // Return the value
        return apiconfig.baseURL;
    }

/// Function: api._core.apikey
///
/// @param   API key to use, note that using this in the browser side automatically authenticate the user
///          and would make certain functionality (such as logout) non functional
///
/// @return  nothing, intentionally reading the configured key is not made easily accesible
    apicore.apiKey = function apiKey(inKey) {
        if(inKey) {
            apiconfig.apiKey = inKey;
        }
    }

/// Function: api._core.persistentSession
/// @param    True or False value to set the persistency of the request session
///
/// @return  nothing
    apicore.persistentSession = function persistentSession(booleanValue){
        if(apicore.isNodeJS()){
            apicore.persistentSession = booleanValue;
        } else {
            throw "You are not in NodeJS environment.";
        }
    }

/// Function: api._core.setCookieJar
/// @param    Takes in a cookieJar to use for the request
///
/// @return  nothing
    apicore.setCookieJar = function setCookieJar(cookieJar){
        if(apicore.isNodeJS()){
            apicore.cookieJar = cookieJar;
        } else {
            throw "You are not in NodeJS environment.";
        }
    }

    /**
     * Function: api._core.getCookieJar
     * @return {cookieJar}
     */
    apicore.getCookieJar = function getCookieJar(){
        if(apicore.isNodeJS()){
            return apicore.cookieJar;
        } else {
            throw "You are not in NodeJS environment.";
        }
    }

//---------------------------------------------------------------------------------------
//
//  API rawPostRequest
//
//---------------------------------------------------------------------------------------

/// Function: api._core.rawPostRequest
///
/// @param   Subpath uri to call
/// @param   Post parameter object to pass
/// @param   Succesful callback, for good old fashion callback hell
///
/// @return  Promise object with the response string
    if(apicore.isNodeJS()) {
        // Load the node http/s libraries
        var http = require('http');
        var net = require('net');
        var url = require('url');
        var NodeFormData = require('form-data');
        var request = require('request-promise');
        // Set default persistency to be true
        apicore.persistentSession = apicore.persistentSession || true;

        // Does the node JS implementation
        apicore.rawPostRequest = function rawPostRequest(reqURI, paramObj, callback) {
            // Grab existing cookieJar or initialize a cookie jar
            var jar = apicore.cookieJar || request.jar();

            // Generate the formdata object where applicable
            var formData = new NodeFormData();
            if( paramObj != null ) {
                for (var name in paramObj) {
                    if (paramObj.hasOwnProperty(name)) {
                        var val = paramObj[name];
                        if( val instanceof Array || val instanceof Object ) {
                            val = JSON.stringify(val)
                        }
                        formData.append(name, val);
                    }
                }
            }
            // Declare options for POST request
            var options = {
                method: 'POST',
                uri: apicore.baseURL()+reqURI,
                formData: paramObj,
                jar : jar
            };
            // Make the request
            var ret = request(options);
            // Retain server's cookie response and store in jar if persistency is true
            if(apicore.persistentSession){
                apicore.cookieJar = jar;
            }
            apicore.setCookieJar(jar);
            // Attach callback
            if( callback != null ) {
                ret.then(callback);
            }
            // Return the promise
            return ret;
        }
    } else {
        // Does the browser xhttprequest
        // Cookie handling is done natively by the browser
        apicore.rawPostRequest = function rawPostRequest(reqURI, paramObj, callback) {

            // Generate the formdata object where applicable
            var formData = new FormData();
            if( paramObj != null ) {
                for (var name in paramObj) {
                    if (paramObj.hasOwnProperty(name)) {
                        var val = paramObj[name];
                        if( val instanceof Array || val instanceof Object ) {
                            val = JSON.stringify(val)
                        }
                        formData.append(name, val);
                    }
                }
            }

            // Generate XMLHttpRequest
            var request = new XMLHttpRequest();
            request.open("POST", apicore.baseURL()+reqURI);

            // Enable cookies on CORS
            // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials
            request.withCredentials = true;

            // Return promise object
            var ret = new Promise(function(good,bad) {

                // Function to call on a good load
                function goodLoad(evt) {
                    try {
                        // Process the JSON object response
                        var jsonObj = JSON.parse(request.responseText);

                        // Error response in request
                        if( jsonObj.ERROR || jsonObj.error) {
                            // Throw error from json object
                            bad(jsonObj.ERROR || jsonObj.error);
                        } else {
                            // Request succeded, returns json result
                            good(jsonObj);
                        }
                    } catch(e) {
                        // JSON format failure
                        bad("Request failed : Invalid JSON format");
                    }
                }

                // Good load event listener
                request.addEventListener("load", goodLoad)

                // Function to call on a bad load
                function badLoad(evt) {
                    bad("Request error / abort");
                }

                // Bad load event listener
                request.addEventListener("error", badLoad);
                request.addEventListener("abort", badLoad);

                // Send the form data request
                request.send(formData);
            });

            // Attach callback
            if( callback != null ) {
                ret.then(callback);
            }

            // Return the promise
            return ret;
        }
    }

//---------------------------------------------------------------------------------------
//
//  API endpoint management utilities
//
//  Note: that not all the functions here does parameter safety checks
//
//---------------------------------------------------------------------------------------

/// api endpoint map to config listing
    var apimap = {};

/// Function: normalizeEndpointPath
///
/// Normalize the endpoint to '/' notation from either '.' or '/' notations
/// Eg: user.account.login -> user/account/login
///
/// @param  The path the normalize
///
/// @return  normalized path
    function normalizeEndpointPath(path) {
        path = path.replace(/\./g, '/').trim();

        while( path.charAt(0) == '/' ) {
            path = path.slice(1);
        }

        while( path.charAt(path.length - 1) == '/' ) {
            path = path.slice(0, path.length - 1);
        }

        return path;
    }

/// Function: callSingleEndpoint
///
/// Calls an api endpoint, with the given arguments. Arguments are processed in accordence to the following rules.
///
/// + If there is no argument, no parameters is sent.
/// + If there is only a single argument object, it is assumed to be a parameter object.
///
/// - If the single argument, is a string or number, it is assumed to be a named parameter.
/// - If there is multiple arguments, it is assumed to be a named parameter.
/// - If its a named parameter request, and there is no configuration, an error is thrown via the promise object.
///
/// @param  Endpoint path, must be normalized
/// @param  Array of arguments
///
/// @return  Promise object with the api endpoint result
    function callSingleEndpoint(endpointPath, args) {

        // No arguments, nothing to consider
        if( args == null || args.length <= 0 ) {
            return apicore.rawPostRequest(endpointPath);
        }

        // Possible parameter object request
        if( args.length == 1 ) {
            var paramObj = args[0];
            var paramType = (typeof paramObj);

            // Its an object, assume its parameters
            if( paramType == "object" ) {
                return apicore.rawPostRequest(endpointPath, paramObj);
            }
        }

        // Assumed named arguments call
        return callEndpointWithNamedArguments(endpointPath, args);
    }

/// Function: callEndpointWithNamedArguments
///
/// Varient of callEndpoint, where it is assumed to be named arguments
/// NOTE: if there is no configuration, an error is thrown via the promise object.
///
/// @param  Endpoint path, must be normalized
/// @param  Array of arguments
///
/// @return  Promise object with the api endpoint result
    function callEndpointWithNamedArguments(endpointPath, args) {
        // Endpoint configuration
        var endpointConfig = apimap[endpointPath];

        // Terminates at invalid name point configration
        if( endpointConfig == null || endpointConfig.argNameList == null || endpointConfig.argNameList.length <= 0 ) {
            return new Promise(function(good,bad) {
                bad("Missing endpoint named parameters configuration for : "+endpointPath);
            });
        }

        // Arguments names list
        var argNameList = endpointConfig.argNameList;

        // Parameter object to build from named arguments
        var paramObject = {};

        // Parmaters names to object mapping
        for(var i=0; i<argNameList.length; ++i) {
            paramObject[argNameList[i]] = args[i];
        }

        // Does the parameter call
        return apicore.rawPostRequest(endpointPath, paramObject);
    }

/// Function: setEndpointRaw
///
/// @param   Endpoint path, must be normalized
/// @param   Arg names array, for multiple arguments mode / non object mode
/// @param   Configuration object
    function setEndpointRaw(endpointPath, argNameList, config) {
        // Normalize config object
        config = config || {};

        // store arguments names
        config.argNameList = argNameList;

        // Storing the configuration
        apimap[endpointPath] = config;

        // Split the endpoint path, amd call setup
        var splitEndpointPath = endpointPath.split("/");
        setupEndpointFunction(splitEndpointPath);
    }

/// Function: setupEndpointFunction
///
/// Setup the endpoint function against the "api" object.
/// This is done recursively against pathSuffix
///
/// @param   pathSuffix, array of names, to setup the call function
/// @param   [Optional] pathPrefix that represents the current apiObj
/// @param   [Optional] apiObj to append to, defaults to actual api object
    function setupEndpointFunction(pathSuffix, pathPrefix, apiObj) {
        // Validate path suffix needs processing
        if( pathSuffix == null || pathSuffix.length <= 0 ) {
            return; //terminate
        }

        // Setup optional params if missing
        if( apiObj == null || pathPrefix == null ) {
            apiObj = api;
            pathPrefix = [];
        }

        // clone array, prevent destructive edit on recursive call
        pathSuffix = pathSuffix.slice(0);
        pathPrefix = pathPrefix.slice(0);

        // Setup the new pathPrefix
        var name = pathSuffix.shift();
        pathPrefix.push( name );

        // apiObj[name] previously exists, use it
        if( apiObj[name] ) {
            apiObj = apiObj[name];
        } else {
            apiObj = setupEndpointFunctionStep(apiObj, name, pathPrefix.join('/'));
        }

        // Recursive call
        setupEndpointFunction(pathSuffix, pathPrefix, apiObj);
    }

/// Function: setupEndpointFunctionStep
///
/// @param  apiObj to append to
/// @param  name to attach function with
/// @param  full normalized endpoint path string to use
///
/// @return  The generated function (to append as another apiObj)
    function setupEndpointFunctionStep(apiObj, name, endpointPath) {
        apiObj[name] = function() {
            return callSingleEndpoint(endpointPath, (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)) );
        }
        return apiObj[name];
    }

//---------------------------------------------------------------------------------------
//
//  API endpoint management functions
//
//---------------------------------------------------------------------------------------

/// Function: api._core.callEndpoint
///
/// @param   Endpoint path
/// @param   arguments to pass forward ....
///
/// @return  Promise object for the API request
    apicore.callEndpoint = function callEndpoint(endpointPath) {
        return callSingleEndpoint( normalizeEndpointPath(endpointPath), Array.apply(null, arguments).slice(1) );
    }

/// Function: api._core.setEndpoint
///
/// @param   Endpoint path
/// @param   Arg names array, for multiple arguments mode / non object mode
/// @param   Configuration object
    apicore.setEndpoint = function setEndpoint(endpointPath, argNameList, config) {
        return setEndpointRaw( normalizeEndpointPath(endpointPath), argNameList, config );
    }

/// Function: api._core.setEndpointMap
///
/// @param   Object map of [path] = [arguments list]
    apicore.setEndpointMap = function setEndpointMap(pathMap) {
        if( pathMap != null ) {
            for (var path in pathMap) {
                if (pathMap.hasOwnProperty(path)) {
                    apicore.setEndpoint( path, pathMap[path] );
                }
            }
        }
    }
   // apicore.baseURL("//api.uilicious-dev.com//v0.0/");
    apicore.setEndpointMap({
        "job.run" : [],
        "account.subscriptions.cancel" : [],
        "project.testrun.list" : [],
        "project.get" : [],
        "project.list" : [],
		"git.project.list" : [],
        "project.testrun.start" : [],
		"testrun.git.start" : [],
        "project.file.get" : [],
        "job.quota" : [],
        "stripe.subscribe" : [],
        "account.info.get" : [],
        "group.admin.get_member_list_info" : [],
        "project.testrun.get" : [],
        "account.info.list" : [],
        "job.list" : [],
        "account.list" : [],
        "project.update" : [],
        "project.file.delete" : [],
        "account.info.set" : [],
        "project.file.move" : [],
        "project.file.query" : [],
        "account.new" : [],
        "group.update_member_meta_info" : [],
        "account.signup" : [],
        "account.NRAuth" : [],
        "job.get" : [],
        "group.getListOfGroupObjectOfMember" : [],
        "stripe.plans.get" : [],
        "project.new" : [],
        "project.testrun.image.get" : [],
        "project.testrun.images.download" : [],
        "group.admin.removeMembershipRole" : [],
        "account.hostURL" : [],
        "account.logout" : [],
        "account.admin.setLoginName" : [],
        "account.password.email.reset" : [],
        "project.testrunset.notify" : [],
        "group.getListOfGroupIDOfMember" : [],
        "group.getMemberRole" : [],
        "job.delete" : [],
        "account.password.email" : [],
        "account.login" : [],
        "group.groupRoles" : [],
        "account.changePassword" : [],
        "job.update" : [],
        "account.admin.createStack" : [],
        "project.file.put" : [],
        "project.delete" : [],
        "account.info.loginname" : [],
        "account.admin.deleteStack" : [],
        "account.admin.remove" : [],
        "account.admin.checkRancher" : [],
        "account.subscriptions.update" : [],
        "job.add" : [],
        "group.admin.addMembershipRole" : [],
        "config.get" : [],
        "account.subscriptions.get" : [],
        "account.stripe.payment.add" : [],
        "job.testrunset.list" : [],
        "group.get_single_member_meta" : [],
        "group.admin.add_remove_member" : [],
        "account.info.list.datatables" : [],
        "" : []
    });
    return api;
})();

if(api._core.isNodeJS()){
    module.exports=api;
}