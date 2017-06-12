## Intro
The Uilicious CLI is the primary tool used for continuous integration. This CLI contains many options.

## Installation
Before installing this package, please run this to ensure that npm is updated to the latest version:
```
$ npm install npm@latest -g
```

This npm package can be installed by:
```
$ npm install -g uilicious-cli
```

## Listing
```
$ uilicious-cli list
```
List all projects available.

## Running
```
$ uilicious-cli run <project_name> <script_path>
```
* `<project_name>` - Name for the project being tested.
* `<script_path>` - Name of the test script being executed.

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
--directory | -d `<parameter>` | Output directory path to use (required)
--browser | -b `<parameter>` | Browser (optional) [Chrome/Firefox]
--width | -w `<parameter>` | Width of browser (optional)
--height | -h `<parameter>` | Height of browser (optional)

Copyright &copy; 2017 Uilicious Private Limited
