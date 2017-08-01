// Go to honestbee website
I.goTo("https://honestbee.sg/en/");

// See and click login
I.see("Log In");
I.click("Log In");

// Fill login fields
I.fill("Email", 'uilicious@mailinator.com');
I.fill("Password","uiliciousR0cks");

// Log in
I.click("Log In");

// See username
I.see("The email address and password you entered did not match our records");
