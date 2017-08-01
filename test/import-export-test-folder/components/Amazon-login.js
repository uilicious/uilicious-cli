I.goTo("https://amazon.com");
I.click("Sign In");
I.fill("Email", "alice-abc@mailinator.com");
I.fill("Password", "passw0rd12#");
I.pressEnter();
I.see("Hello, Alice");
