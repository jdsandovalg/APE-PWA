const fs = require('fs');
const path = require('path');

function extractRawText(pdfPath, outDir) {
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    process.exit(2);
  }

  const buf = fs.readFileSync(pdfPath);
  // Use latin1 to preserve byte values
  const raw = buf.toString('latin1');

  // Replace runs of non-printable bytes with newline
  const cleaned = raw.replace(/[^\x20-\x7E\xA0-\xFF]+/g, '\n');
  const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Keep lines that look like human-readable (contain digits and letters)
  const candidates = lines.filter(l => /[0-9].*[0-9]|[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(l)).slice(0, 1000);

  if (!outDir) outDir = path.dirname(pdfPath);
  const base = path.basename(pdfPath, path.extname(pdfPath));
  const outTxt = path.join(outDir, `${base}.raw.txt`);
  fs.writeFileSync(outTxt, candidates.join('\n'), 'utf8');
  console.log('Raw text candidate lines written to:', outTxt, `(lines: ${candidates.length})`);
  console.log('\n--- Preview (first 2000 chars) ---\n');
  console.log(candidates.join('\n').slice(0, 2000));
}

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node raw_extract_text.cjs <pdf-path>');
    process.exit(2);
  }
  const pdfPath = path.resolve(arg);
  extractRawText(pdfPath);
}

module.exports = { extractRawText };
