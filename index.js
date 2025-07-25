// index.js
const express   = require('express');
const puppeteer = require('puppeteer-core'); // Bleiben wir bei puppeteer-core für Render

// Environment variable for Chrome path (Render.com often provides this)
const RENDER_CHROME_PATH = process.env.CHROME_PATH;

const app = express();
// Allow JSON body up to 10MB
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
  let browser; // Declare browser here so it's accessible in finally block
  try {
    const { html, options = {} } = req.body;
    if (!html) {
      return res.status(400).send('Missing html');
    }

    // Configure Puppeteer launch options
    let launchOptions = {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage' // Often needed in container environments
        ],
        headless: true // Ensure it's truly headless
    };

    // --- CRITICAL CHANGE HERE ---
    // If CHROME_PATH is provided by Render.com, we do NOT set executablePath
    // in puppeteer.launch directly, as it might conflict with Render's internal setup.
    // Puppeteer is often able to find the browser via system PATH or implicit means.
    // If it's not set, it implies we're local and might need a fallback.
    if (RENDER_CHROME_PATH) {
        // We will NOT set executablePath for Render.com.
        // Puppeteer should find it via its internal mechanisms or PATH.
        // This is based on the error "executablePath must not be specified when using --product and a channel"
        // If this still fails, we might need to explicitly set it to RENDER_CHROME_PATH
        // in a fallback scenario.
        console.log("CHROME_PATH environment variable detected. Relying on Puppeteer's auto-detection.");
    } else {
        // Fallback for local development or other environments without CHROME_PATH
        // In this case, we expect the full 'puppeteer' package to be installed,
        // which includes executablePath()
        try {
            const localPuppeteer = require('puppeteer'); // This should be the full 'puppeteer' package
            launchOptions.executablePath = localPuppeteer.executablePath();
            console.log("No CHROME_PATH detected. Using local Puppeteer executable path.");
        } catch (e) {
            console.error("ERROR: No CHROME_PATH and unable to find local Puppeteer executable. PDF generation will likely fail.");
            // You might want to throw an error here or provide a default path for your local machine
            throw new Error("Could not determine Chrome executable path. Please ensure CHROME_PATH is set or 'puppeteer' package is installed.");
        }
    }
    // --- END CRITICAL CHANGE ---

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set content and wait for network to be idle
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground ?? true,
      margin: options.margin || {
        top: '1cm',
        bottom: '1cm',
        left: '1.5cm',
        right: '1.5cm',
      },
    });

    // Set headers and return PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options.filename || 'document'}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('Error during PDF generation:', err);
    res.status(500).send('Internal Server Error: ' + err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`PDF-Service listening on ${port}`);
});
