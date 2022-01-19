# UI-licious Command Line Interface

![Example](https://github.com/uilicious/uilicious-cli/raw/main/readme-img/uilicious-cli-help.png)

[UI-licious](https://uilicious.com) is a tool for development teams to rapidly create and run end-to-end user journey tests for their web applications.

This command line interface allows you to run and manage your UI-licious tests through the command line.

> Note that the UI-licious CLI can only be used with an active subscription of UI-licious.

## Installation

You may install the CLI by downloading the recommended binary distribution, or via NPM.

### Download binaries directly from our github release page (recommended)

* [all releases](https://github.com/uilicious/uilicious-cli/releases)

### Download via npm

Before installing this package, ensure that npm is updated to the latest version:
```
$ npm install npm@latest -g
```

Run the following to install uilicious-cli globally:
```
$ npm install uilicious-cli -g
```

## Using `--help`

Use the `--help` option to list the available top level commands:
```
$ uilicious-cli --help
```

To get more information about a single command, use `--help` after the command:

```
$ uilicious-cli <command> --help
```

![Run Help](https://github.com/uilicious/uilicious-cli/raw/main/readme-img/uilicious-cli-run-help.png)

## Authentication

You can use your access key or username and password to authenticate yourself.

### Authentication with access key

> **Where can I get my access key?**

> Login to UI-licious Studio, go to "[Account and Billing > Access Key](https://user.uilicious.com/profile/accessKeys)"  to view and regenerate your access key

You can set your access key with the `--key` option when using the cli, e.g.:
```
$ uilicious-cli run "demo" "/login/test 1" --key <acccess_key>
```

### Authentication with username and password

Alternative you can authenticate with your username and password, using the `--user` and `--pass` options e.g.
```
$ uilicious-cli run "demo" "/login/test 1" --user <username> --pass <password>
```

You can also use the short form `-u` or `-p`, e.g.:
```
$ uilicious-cli run "demo" "/login/test 1" -u <username> -p <password>
```

## Running a test

![Run Example](https://github.com/uilicious/uilicious-cli/raw/main/readme-img/uilicious-cli-run-example.png)

```
$ uilicious-cli run  <project_name> <script_path> [--browser] [--width] [--height]
```
* `<project_name>` - Name for the project being tested.
* `<script_path>` - Name of the test script being executed.

**Additional Options**
+ `--browser <browser_name>` options :  e.g. chrome, firefox, edge, safari, ie11 (default "chrome")
+ `--height <browser_height>` height of browser (default "960")
+ `--width <browser_width>` width of browser (default "1280")

### Setting the `DATA` object

The `DATA` object is a special object you can use in the test script for dynamic test data.

You can use the `DATA` object in your script like this:
```javascript
// Here's an example to help you get started!
I.goTo("https://github.com")
I.click("Sign up")
I.see("Join GitHub")
I.fill("Username", DATA.username)
I.fill("Email", DATA.email)
I.fill("Password", DATA.password)
I.click("Create an account")
```

You can set the `DATA` using a json string using `--dataObject` or by reading from json file using `--dataFile`.

E.g.
```
$ uilicious-cli run "github" "Login" --dataObject {"username":"brucewayne","password":"secret","email":"bruce@waynecorp.com"}
$ uilicious-cli run "github" "Login" --dataFile "./user-brucewayne.json"
```

### Dataset 
You can now configure variables for running tests on different environments.

You can manage the datasets in Uilicious Project editor. To run a test using dataset, you need to specify the name of dataset using `--dataset`.

E.g.
```
uilicious-cli run Demo demo --dataset "PROD"
```

## Upload files to a project

You can upload files from a local directory to an UI-licious project using the `upload` command. If the project does not exists, it will be automatically created:
```bash
uilicious-cli upload <project_name> <local_directory>
```

## Download files from a project

You can download files from a UI-licious project to a local directory using the `download` command. Files will be overwritten in the destination folder if they already exist.

```bash
uilicious-cli download <project_name> <local_directory>
```

### To test your local web applications 

Plese use services such as 

- https://ngrok.com/

Native ngrok support is deprecated from v3.0.0 

## Deprecated Commands

> **Warning**: Please avoid using deprecated aliases for the commands, as they may be removed in the future.

Command  | **Deprecated** aliases | Removal Schedule | Purpose
------   | ---------------------- | ---------------- | ------------------
run      |                        | none             | Run a test
download | export                 | none             | Download a project to a local directory
upload   | import                 | none             | Upload files from a local directory to a project

> Commands with removal schedule of "none" will have atleast 6 months notice warning, when we plan its removal. And will be treated as a major CLI version upgrade.

## Need help?

Contact [support@uilicious.com](mailto:support@uilicious.com)!

---

Copyright &copy; 2019 Uilicious Private Limited
