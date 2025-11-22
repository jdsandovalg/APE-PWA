const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

(async () => {
  try {
    const pdfPath = path.join(__dirname, '..', 'Octubre2025.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF no encontrado:', pdfPath);
      process.exit(2);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    const text = data.text || (data.pages ? data.pages.map(p=>p.text||p).join('\n') : '');

    const outTxt = path.join(__dirname, 'Octubre2025.txt');
    fs.writeFileSync(outTxt, text, 'utf8');
    console.log('Texto extraído a:', outTxt, `(longitud: ${text.length})`);

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const candidates = lines.filter(l => /energia|distribuc|cargo|iva|tarifa|kW|kWh|Q\b|GTQ|Quetzal|subtotal|impuesto|contribucion|potencia/i.test(l));
    const outJson = path.join(__dirname, 'Octubre2025_candidates.json');
    fs.writeFileSync(outJson, JSON.stringify({candidates, sampleLines: lines.slice(0,200)}, null, 2), 'utf8');
    console.log('Líneas candidatas guardadas en:', outJson, `(${candidates.length} líneas)`);

    console.log('--- Previsualización (primeras 80 líneas) ---');
    console.log(lines.slice(0,80).join('\n'));
  } catch (err) {
    console.error('Error extrayendo PDF:', err);
    process.exit(1);
  }
})();
