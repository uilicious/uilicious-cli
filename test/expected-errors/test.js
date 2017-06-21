/**
 * Created by tadapatrisonika on 20/6/17.
 */


var exception = null;

// Tries to
function runUiliciousCliRaw_assertException(argArr, msg) {
	var execeptionToCatch = null;
	try {
		runUiliciousCliRaw.apply(this, argArr);
	} catch(e) {
		execeptionToCatch = e;
	}
	assert(execeptionToCatch, "Missing Exception : "+msg);

	execeptionToCatch.stderr = execeptionToCatch.stderr.trim();
	execeptionToCatch.stdout = execeptionToCatch.stdout.trim();

	return execeptionToCatch;
}


exception = runUiliciousCliRaw_assertException(["-u", "teh-cake", "-p", "IS-A-LIE", "list"], "Invalid login exception");
assert.equal( exception.stderr, "ERROR: Unable to login - Invalid username/password" );

exception = runUiliciousCliRaw_assertException(["-u", "UIlicious", "-p", "UIliciousR0cks", "this-command-does-not-exists"], "Invalid command exception");
assert.equal( exception.stderr, "ERROR: Invalid command" );


