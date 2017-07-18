/**
 * Test class that provides functionality for CRUD operations
 * to be performed by the Test
 */

// Chalk messages
const chalk = require('chalk');
const error_warning = chalk.bold.red;
const success_warning = chalk.bold.green;
const error = chalk.red;
const success = chalk.green;

const APIUtils = require('./../api-utils');
const ProjectCRUD = require('./project-CRUD');
const folderCRUD = require('./folderCRUD');


class testCRUD {

}

module.exports = testCRUD;