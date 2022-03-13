//---------------------------------------------------
//
//  Dependencies
//
//---------------------------------------------------

// Require core library
const path = require("path")
const fs   = require("fs")
const fse  = require("fs-extra")

const crypto   = require("crypto")
const process  = require("process")
const archiver = require("archiver-promise")

// Normalize file path with linux formatting
const normalizeLinuxPath = require("normalize-path")
const bufferFrom = require('buffer-from')

// get temp directory
const tempDir = require("os").tmpdir(); // /tmp

//---------------------------------------------------
//
//  Class Definition
//
//---------------------------------------------------

/**
 * # FileUtil
 * 
 * Collection of various utility functions, for maniplating the file system
 */
class FileUtil {

	/**
	 * Write a file, or kill the nodejs process.
	 * 
	 * @param {Path}         filePath   file path to write into
	 * @param {axios.Stream} axiosStream  NOTE: This assumes that the file content is an axios result stream
	 */
	async writeAxiosFileStream(filePath, axiosStream) {
		// Lets setup the directory for the file
		let directory = path.dirname(filePath)

		// And normalize the filepath (windows compatibility)
		filePath = path.normalize(filePath)

		// Lets setup the directory
		await fse.ensureDir(directory)

		// And write the content
		// await fs.writeFile(filePath, rawContent)

		await new Promise((good,bad) => {
			// Get the output stream, and write into it (till its done)
			try {
				const output = fse.createWriteStream(filePath);
				axiosStream.on('data', (chunk /* chunk is an ArrayBuffer */) => {
					output.write(bufferFrom(chunk));
				});
				axiosStream.on('end', () => {
					output.end();
					good(true);
				});
			} catch(e) {
				// LoggerWithLevels.error(e)
				bad(e);
			}
		});
	}

	/**
	 * Normalize the remoteFilePath parameter for input variations
	 * @param {String} inFilePath to be normalized
	 * 
	 * @return {[String,String]} array pair of remoteFilePath and remoteFilePathDir
	 */
	normalizeRemoteFilePath(inFilePath) {

		// Remote file path normalized as a directory
		let remoteFilePath = inFilePath;
		let remoteFilePathDir = remoteFilePath;

		// Normalize the remote filepath
		if( remoteFilePath && remoteFilePath.length > 0 ) {
			// Normalize the file path
			remoteFilePath = normalizeLinuxPath(inFilePath);
			
			// Retain the ending "/" if its present
			// this is removed by the normalize command
			if( inFilePath.endsWith("/") ) {
				remoteFilePath = remoteFilePath+"/"
			}

			// Remove any unwanted starting slash
			while(remoteFilePath.startsWith("./")) {
				remoteFilePath = remoteFilePath.substring(2);
			}
			while(remoteFilePath.startsWith("/")) {
				remoteFilePath = remoteFilePath.substring(1);
			}

			// Get its normalized dir path
			if( remoteFilePath.endsWith("/") ) {
				remoteFilePathDir = remoteFilePath
			} else {
				remoteFilePathDir = remoteFilePath + "/";
			}

			// Update normalized value
			// argv.remoteFilePath = remoteFilePath;
		}
		
		// Return the respective remoteFilePath and its directory varient
		return [ remoteFilePath, remoteFilePathDir ];
	}

	/**
	 * Generate a file list given the existing file path
	 * 
	 * @param {String}  dirPath to scan 
	 * @param {Boolean} includeSystemFiles, set to true, to include reserved files such as `.git` or `.DS_STORE`
	 * 
	 * @return {[String]} array of files to be uploaded
	 */
	async generateFileList(dirPath, includeSystemFiles = false) {
		// The result set
		let resSet = new Set();

		// Normalize the dirPath with the ending "/"
		if( !dirPath.endsWith("/") ) {
			dirPath = dirPath+"/";
		}

		// System file list to skip
		let systemFileSkipList = [".git", ".ds_store"]

		// Recursion function to use internally
		async function scanDir(filePath, pathPrefix) {
			// Get the list of file inodes
			let entList = await fs.promises.readdir(filePath, { withFileTypes: true });

			// Iterate the dir entities
			for(let ent of entList) {
				// Get the file/folder name
				let name = ent.name;

				// Known skip list
				if( systemFileSkipList.indexOf(name.toLowerCase()) >= 0 ) {
					continue;
				}

				// For each file
				if( ent.isFile() ) {
					// Add it to the set - and terminate
					resSet.add( pathPrefix + name );
					continue;
				}

				// For each folder
				if( ent.isDirectory() ) {
					// Add it to the set, and iterate
					resSet.add( pathPrefix + name + "/" );

					// Loop it
					await scanDir( filePath+name+"/", pathPrefix+name+"/" );
					continue;
				}
			}
		}
		
		// Lets do the recursive scan
		await scanDir(dirPath, "");

		// Convert result set into a list
		let resList = Array.from(resSet);
		resList.sort();

		// Return the result list
		return resList;
	}

	/**
	 * Validate a given path is a directory, or die
	 * Use this to validate parameters given 
	 * 
	 * @return {Promise<Boolean>} true, only if all checks passes
	 */
	async validateLocalDirectory_orDie(path, pathType = "path") {
		LoggerWithLevels.trace(`Validating for writable directory : ${path}`)

		try {
			let checks = await fs.pathExists(path)
			if( !checks ) {
				LoggerWithLevels.exitError(`${pathType} does not exists : ${path}`);
				return false;
			}
	
			// Checks for a valid directory, else throw an error
			await fs.ensureDir(path)
		} catch(e) {
			LoggerWithLevels.error(`ERROR - Invalid directory ${pathType} : ${path}`);
			LoggerWithLevels.error(e);
			LoggerWithLevels.exitError(`Invalid directory ${pathType} : ${path}`);
			return false;
		}

		// All passes, yay
		return true;
	}

	/**
	 * Given the project dir path, prepare a zip file, for uploading
	 * @param {Path} srcCodeDir 
	 */
	async prepareSrcCodeZipFile( srcCodeDir ) {
		// Lets normalize the provided srcCodeDir, and validate it
		srcCodeDir = path.resolve( srcCodeDir );
		await this.validateLocalDirectory_orDie( srcCodeDir );

		// The zip file ID to use (randomly generated)
		const zipID = crypto.randomBytes(16).toString("hex");

		// Zip file path we will use
		const zipFilePath = path.resolve(tempDir, "uilicious-cli/zip/"+zipID+".zip");
		const zipOutput   = fs.createWriteStream( zipFilePath );
		const archive     = archiver('zip', {
			zlib: { level: 9 } // Sets the compression level.
		});

		// Lets register the on exit cleanup / removal of tmp zip file
		process.on('exit', () => {
			fse.removeSync( zipFilePath );
		});

		// Pipe the archiver 
		archive.pipe(zipOutput);

		// Lets generate the file list
		const fileList = await this.generateFileList( srcCodeDir );

		// the current total file sizes
		let totalFileSizes = 0;

		// Lets prepare the zip file, and compute the total size
		for( const filePath of fileList ) {
			const fullFilePath = path.resolve( srcCodeDir, filePath );
			archive.file(fullFilePath, { name: filePath });

			// Get the file stat, assume a minimum of 5kb 
			// (work around some known limitations in FS)
			const fileStat = await fs.promises.stat();
			totalFileSizes += Math.min(fileStat.size, 5 * 1000);
		}

		// Check if the total file sizes is >= 100MB
		if( totalFileSizes >= (100 * 1000 * 1000)  ) {
			LoggerWithLevels.exitError(`Test code directory is larger then 100MB - aborting`);
			return;
		}

		// Lets finalize and await
		await archive.finalize();

		// Return the zip file path
		return zipFilePath;
	}

}

// Module export as a singleton
const FileUtilSingleton = new FileUtil();
module.exports = FileUtilSingleton;