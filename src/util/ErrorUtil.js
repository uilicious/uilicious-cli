/**
 * # ErrorUtil
 * 
 * Collection of error handling and message extraction utilities.
 */
class ErrorUtil {

	/**
	 * Unwraps and extracts a clean, human-readable error message from various error object formats
	 * (e.g. strings, standard Error instances, Axios responses, UI-licious API payloads).
	 * 
	 * @param {*} err error object, string, or response payload
	 * @return {String} human-readable error message
	 */
	extractErrorMessage(err) {
		if (!err) {
			return "Unknown error";
		}
		if (typeof err === "string") {
			return err;
		}
		if (err.message && typeof err.message === "string") {
			return err.message;
		}
		let errObj = err.ERROR || err.error || (err.data && (err.data.ERROR || err.data.error || err.data)) || (err.response && (err.response.data && (err.response.data.ERROR || err.response.data.error || err.response.data.message || err.response.data))) || err;
		if (typeof errObj === "string") {
			return errObj;
		}
		if (errObj && typeof errObj.message === "string") {
			return errObj.message;
		}
		if (errObj && typeof errObj.code === "string") {
			return errObj.code;
		}
		try {
			let str = JSON.stringify(errObj);
			return (str && str !== "{}") ? str : (err.toString() || "Unknown error");
		} catch(e) {
			return err.toString() || "Unknown error";
		}
	}
}

// Module export as a singleton
const ErrorUtilSingleton = new ErrorUtil();
module.exports = ErrorUtilSingleton;
