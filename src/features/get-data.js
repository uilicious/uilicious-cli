/*
* getData class that provides functionality for passing data parameters
* for test run
*/

// npm Dependencies
const fs = require('fs');
const path = require('path');

// Chalk (color) messages for success/error
const chalk = require('chalk');
const error = chalk.red;
const success = chalk.green;

// Module Dependencies
const APIUtils = require('./../api-utils');
const CLIUtils = require("./../cli-utils");
const ProjectCRUD = require('./project-CRUD');
const folderCRUD = require('./folder-CRUD');
const ImportExport = require('./import-export');

class getData {

  // Read data parameters from file in local directory
  // @param   File Pathname
  // @return  Promise object that returns the data parameters from file in local directory
  static readDataContents(options, callback) {
    return new Promise(function(good, bad) {
      let dataDirectory = path.resolve(options.data);
      let dataParams = fs.readFileSync(dataDirectory, 'utf-8');
      if (dataDirectory.indexOf(dataParams) > -1) {
        console.error(error("ERROR: There is nothing in this file!\n"));
  			process.exit(1);
      } else {
        good(dataParams);
      }
    }).then(callback);
  }

}

module.exports = getData;
