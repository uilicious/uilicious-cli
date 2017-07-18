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
		console.log("Executed on:\n" + dayOfWeek + ", " + localDateTime + "\n");

		// var day = objToday.getDate();
		// var month = objToday.getMonth() + 1;
		// var year = objToday.getFullYear();
		// var currentDate = dayOfWeek + ", " + day + "-" + month + "-" + year;
		// var hour = objToday.getHours() > 12 ? objToday.getHours() - 12 : (objToday.getHours() < 10 ? "0" + objToday.getHours() : objToday.getHours());
		// var minute = objToday.getMinutes() < 10 ? "0" + objToday.getMinutes() : objToday.getMinutes();
		// var seconds = objToday.getSeconds() < 10 ? "0" + objToday.getSeconds() : objToday.getSeconds();
		// var meridiem = objToday.getHours() > 11 ? "PM" : "AM";
		// var meridiem = objToday.getHours();
		// var currentTime = hour + ":" + minute + ":" + seconds + " " + meridiem;
		// console.log("Executed on:\n" + currentDate + " " + currentTime + "\n");
	}
}

module.exports = CLIUtils;