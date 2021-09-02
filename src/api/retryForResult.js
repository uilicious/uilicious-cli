
//---------------------------------------------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------------------------------------------

const sleep         = require('sleep-promise')
const jsonStringify = require("json-stringify-safe")
const OutputHandler = require("../OutputHandler")

//---------------------------------------------------------------------------------------
//
//  Utils
//
//---------------------------------------------------------------------------------------

/**
 * @param {int} num of attempts tried
 * @return number of milliseconds to delay 
 */
function default_retryDelay(num) {
	return Math.max((num - 1)*5000, 100)+Math.random()*500;
}

/**
 * Raw result from workerFunction to validate
 * @param {*} raw 
 * @param {int} num of attempts tried
 * 
 * @return null, if result is invalid, else the result intended
 */
function default_resultFilter(raw, num) {
	if( raw && raw.result != null ) {
		return raw.result;
	}
	return null;
}

/**
 * Raw result from workerFunction to validate
 * @param {*} raw 
 * @param {int} num of attempts tried
 * 
 * @return null, if result is invalid, else the result intended
 */
function rawResultAfterFilter(raw, num) {
	if( raw && raw.result != null ) {
		return raw;
	}
	return null;
}

//---------------------------------------------------------------------------------------
//
//  Implementation
//
//---------------------------------------------------------------------------------------

/**
 * Calls a worker function, until it returns a valid "result" parameter in the response object.
 * Automatically retries the worker function on error. Throws the last known error after the given number of retriews.
 * 
 * @param {*}         workerFunction      Function to call multiple times if needed, expected to return a promise
 * @param {int}       maxRetry            Maximum number of retries to perform
 * @param {Function}  delayHandler        Calculates and return the time delays between retry, given its try number
 * @param {Function}  resultFilter        Extract desired results from the workerFunction output
 * 
 * @return the unwrapped result object, if given
 */
async function retryForResult(
	workerFunction,
	maxRetry = 3,
	delayHandler = default_retryDelay,
	resultFilter = default_resultFilter
) {
	// Normalizing the parameters
	maxRetry = maxRetry || 3;
	delayHandler = delayHandler || default_retryDelay;
	resultFilter = resultFilter || default_resultFilter;

	// Error holding
	let err = null;

	// Lets loop and retry until the maxRetry
	for(let i=1; i<=maxRetry; ++i) {
		try {
			// Noisy logging, if its enabled
			OutputHandler.debugBlock(() => {
				return [
					"Calling request for result, attempt : "+i,
					"Using: "+workerFunction.toString()
				]
			});

			// Execute the worker function
			let raw = await workerFunction(i);
			let res = null
			
			if( raw != null ) {
				res = resultFilter(raw, i);
			}

			// Validate the result, if so - return it
			if(res != null) {
						
				// Noisy logging, if its enabled
				OutputHandler.debugBlock(() => {
					return [
						"Valid Request result: ",
						jsonStringify(res),
					]
				});
				
				// Return the result
				return res;
			}

			// If there are no res in the raw response, set the value of
			// err to be raw. This is made such that if there are still
			// other properties in "ERROR", it can be pushed upwards and 
			// handled by the caller
			err = raw
		
			// Noisy logging, if its enabled
			OutputHandler.debugBlock(() => {
				return [
					"IN-Valid Request result: ",
					jsonStringify(raw),
				]
			});
			
		} catch(e) {
			err = e;

			// Noisy logging, if its enabled
			OutputHandler.debugBlock(() => {
				// Lets try to normalize it
				let normalizedErr = null;
				if( err != null ) {
					normalizedErr = jsonStringify(err.ERROR || (err.data && err.data.ERROR) || err.data || err);
				}
				if( normalizedErr == "{}" ) {
					normalizedErr = err;
				}
		
				return [
					"Request error: ",
					err
				]
			});
			
		}

		// Lets do a sleep delay between retries
		await sleep( Math.max(delayHandler(i),0) );
	}

	// Everything has failed here, lets throw the error
	if( err ) {
		throw err;
	} else {
		throw "Unknown error - Recieved NULL result response"
	}
}

// Exposing default fitler and alternatives
retryForResult.default_retryDelay = default_retryDelay;
retryForResult.default_resultFilter = default_resultFilter;
retryForResult.rawResultAfterFilter = rawResultAfterFilter;

// Module export
module.exports = retryForResult;