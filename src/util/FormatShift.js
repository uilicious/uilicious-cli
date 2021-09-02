/**
 * # FormatShift
 * 
 * Collection of various utility functions, for shifting the format of a list of objects.
 */
class FormatShift {

	/**
	 * Given the source object, remap the values (if needed), and filter for valid values (if needed)
	 * Note that remapped values are always included in the filter 
	 * 
	 * @param {Object}             sourceObj    to do the filtering and remapping on
	 * @param {Array<String>}      filterArray  [optional] properties to filter for
	 * @param {Map<String,String>} remapObj     [optional] remaps the key to the object values, unless an existing value is present
	 */
	objectPropertyFilterAndRemap( sourceObj, filterArray = null, remapObj = null ) {
		// The result object to return
		let resObj = null;

		// If filter is null, lets just clone the object
		// If filter is present, lets copy over the various values
		if( filterArray == null ) {
			resObj = Object.assign({}, sourceObj);
		} else {
			resObj = {};
			for(let key of filterArray) {
				resObj[key] = sourceObj[key];
			}
		}

		// Filtering is done (if needed) - time to do remapping
		if( remapObj ) {
			for(let [key,value] of Object.entries(remapObj)) {
				resObj[value] = resObj[value] || sourceObj[key];
			}
		}

		// Return the result
		return resObj;
	}

	/**
	 * Given the source array, remap the values (if needed), and filter for valid values (if needed)
	 * Note that remapped values are always included in the filter 
	 * 
	 * @param {Array<Object>}      sourceCollection source collection to scan and filter
	 * @param {Array<String>}      filterArray      [optional] properties to filter for
	 * @param {Map<String,String>} remapObj         [optional] remaps the key to the object values, unless an existing value is present
	 * @param {Array<Object>}      retCollection    to populate, defaults to an array
	 */
	collectionPropertyFilterAndRemap( sourceCollection, filterArray = null, remapObj = null, retCollection = [] ) {
		// Lets iterate through every source object
		for(let i=0; i<sourceCollection.length; ++i) {
			retCollection[i] = this.objectPropertyFilterAndRemap( sourceCollection[i], filterArray, remapObj );
		}

		// Return the result
		return retCollection;
	}
}

// Module export as a singleton
const FormatShiftSingleton = new FormatShift();
module.exports = FormatShiftSingleton;