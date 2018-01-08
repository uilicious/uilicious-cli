/**
 * Utility classes that provided functionality that may/may not be
 * cross application applicable. This focuses on API specifically
 * @author Shahin Alam(shahin@uilicious.com)
 */
const request = require('request');
const url = require('url');
const program = require('commander');
const api = require('../utils/api');
/// Cached full host URL
var _fullHostURL = null;

class APIUtils {

	static requestErrorHandler(err) {
		console.log("FATAL ERROR >> ");
		console.log(err);
		process.exit(1);
	}

    /**
     * Does a login check,set cookies and provides the actual server URL to call API
     * silently terminates, with an error message if it fails
     * @return {Promise}
     */
	static login() {
		if ( _fullHostURL != null ) {
		    return Promise.resolve(_fullHostURL);
		}
        return new Promise(function (good, bad) {
            if(program.user==null || program.pass==null){
                console.log("Error: username/password can not leave empty");
                process.exit(1);
            }
            if(program.apiHost!=null){
                let apiHost = program.apiHost;
                let pattern = /^((http|https):\/\/)/;
                if(!pattern.test(apiHost)) {
                    apiHost = "https://" + apiHost;
                }
                if (apiHost.substr(-1) != '/'){
                    apiHost += '/';
				}
                api._core.baseURL(apiHost);
            }
            else {
                api._core.baseURL("https://api.uilicious.com/");
            }
            return api.account.login({loginName:program.user, password: program.pass})
                .then(response => {
                    response = JSON.parse(response);
                    if(response.result == true)
                    {
                        good();
                        return;
                    }
                    else{
                        bad("ERROR: "+response.INFO);
                        return
                    }
                })
                .catch(errors => bad("ERROR: an error occurred during authentication"));
        });
    }
}

module.exports = APIUtils;
