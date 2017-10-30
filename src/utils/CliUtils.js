const chalk       = require('chalk');
const figlet      = require('figlet');
/**
 * Utility classes that provided functionality that may/may not be
 * cross application applicable. And may be reused in other places
 */
class CLIUtils {
	static consoleLogTestDate() {
		var objToday = new Date();
		var weekday = new Array('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
		var dayOfWeek = weekday[objToday.getDay()];
		var localDateTime = objToday.toLocaleString();
		console.log("Test executed on: " + dayOfWeek + ", " + localDateTime + "\n");
	}

	static banner(){
        console.log(
            chalk.yellow(
                figlet.textSync('Uilicious', { horizontalLayout: 'full' })
            )
        );
	}
}

module.exports = CLIUtils;
