const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extract(pdfPath, outDir) {
  try {
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF not found:', pdfPath);
      process.exit(2);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text || '';

    if (!outDir) outDir = path.dirname(pdfPath);
    const base = path.basename(pdfPath, path.extname(pdfPath));
    const outTxt = path.join(outDir, `${base}.txt`);
    fs.writeFileSync(outTxt, text, 'utf8');
    console.log('Extracted text saved to:', outTxt, `(length: ${text.length})`);

    // Print a short preview (first 4000 chars)
    console.log('\n--- Text preview (first 4000 chars) ---\n');
    console.log(text.slice(0, 4000));

    return { text, outTxt };
  } catch (err) {
    console.error('Error extracting PDF:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node extract_pdf_text.js <pdf-path> [out-dir]');
    process.exit(2);
  }
  const pdfPath = path.resolve(arg);
  const outDir = process.argv[3] ? path.resolve(process.argv[3]) : undefined;
  extract(pdfPath, outDir);
}

module.exports = { extract };
