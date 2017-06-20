/**
 * Created by tadapatrisonika on 20/6/17.
 */

var execeptionToCatch = null;
try {
	runUiliciousCliRaw("-u", "teh-cake", "-p", "IS-A-LIE", "list");
} catch(e) {
	execeptionToCatch = e;
}

assert(execeptionToCatch, "Caught exception");
assert.equal(execeptionToCatch.stderr.trim(), "ERROR: Unable to login - Invalid username/password");