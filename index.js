const express    = require('express');
const bodyParser = require('body-parser');
const puppeteer  = require('puppeteer');
const executablePath = process.env.CHROME_PATH || puppeteer.executablePath();
const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
const { html, options = {} } = req.body;
  if (!html) return res.status(400).send('Missing html');

const browser = await puppeteer.launch({
  args: ['--no-sandbox'],
  executablePath,
});  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({
  format: options.format || 'A4',
  printBackground: options.printBackground ?? true,
  margin: options.margin || { top: '1cm', bottom: '1cm', left: '1.5cm', right: '1.5cm' },
});
  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="expose.pdf"',
    'Content-Length': pdfBuffer.length
  });
  res.send(pdfBuffer);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PDF-Service listening on ${PORT}`));

