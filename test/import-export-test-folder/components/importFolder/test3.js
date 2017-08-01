// Go to google com
I.goTo("https://www.google.com");

// Try searching for something
I.fillField("Search", "lolcats");

// Find an expected result
I.see("Cheezburger");

// Results that I don't expect to see
I.dontSee("flying pigs");

// images loading
I.click("images");

// Loading all
I.click("All");

// click on a link
I.click("Lolcats - Funny cat pictures");
