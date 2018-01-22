## Intro
The Uilicious CLI is the primary tool used for continuous integration. This CLI contains many options.
This CLI is exclusive to our paying customers.

## Installation
Before installing this package, please run this to ensure that npm is updated to the latest version:
```
$ npm install npm@latest -g
```

This npm package can be installed by:
```
$ npm install -g uilicious-cli
```

## Commands
The list of commands can be retrieved by:
```
$ uilicious-cli
```

## Options
Name   | Command | Parameters
------ | ------- | ------------------
--user | -u `<parameter>` | Username (required)
--pass | -p `<parameter>` | Password (required)
<!-- --directory | -d `<parameter>` | Output directory path to use (required) -->
--browser | -b `<parameter>` | Browser (optional) [Chrome/Firefox]
--width | -w `<parameter>` | Width of browser (optional)
--height | -h `<parameter>` | Height of browser (optional)

## Import Test Script(s)

Use the `import` command to import a local folder consists of test script(s) under the root path of a project .
```bash
uilicious-cli -u <username> -p <password> import <project_name> <local_test_directory>
```

## Export Test Script

Use the `export` command to export everything from a project .
```bash
uilicious-cli -u <username> -p <password> export <project_name> <save_to_local_directory>
```

## Running
```
$ uilicious-cli run <project_name> <script_path>
```
* `<project_name>` - Name for the project being tested.
* `<script_path>` - Name of the test script being executed.

**Examples:**
```
$ uilicious-cli -u john -p doe123 run "demo" "/login/test 1"
```
* `<project_name>` - demo
* `<script_path>` - /login/test 1
* `<username>` - john
* `<password>` - doe123

Copyright &copy; 2017 Uilicious Private Limited
