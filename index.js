// index.js
const express   = require('express');
const puppeteer = require('puppeteer-core');

// Render gibt uns CHROME_PATH, lokal fällt er zurück auf puppeteer.executablePath()
const CHROME_PATH = process.env.CHROME_PATH || puppeteer.executablePath();

const app = express();
// JSON‑Body bis 10 MB erlauben
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
  try {
    const { html, options = {} } = req.body;
    if (!html) {
      return res.status(400).send('Missing html');
    }

    // Browser starten
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // HTML rendern
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // PDF erzeugen
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

    await browser.close();

    // Header setzen und PDF zurückgeben
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options.filename || 'document'}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF‑Generierung fehlgeschlagen:', err);
    return res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF-Service listening on ${PORT}`);
});

