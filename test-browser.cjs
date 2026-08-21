const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating...");
  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    console.log('Page loaded successfully!');
  } catch (err) {
    console.error('Error loading page:', err);
  }
  
  // wait 2 seconds for react to render
  await new Promise(resolve => setTimeout(resolve, 2000));

  await browser.close();
  console.log("Done");
})();
