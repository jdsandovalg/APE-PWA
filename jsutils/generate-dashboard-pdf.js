#!/usr/bin/env node
/*
  Simple script to serve `pwa/dist` and generate a PDF of the Dashboard for a given contador/correlativo.
  Usage:
    node scripts/generate-dashboard-pdf.js --output=out.pdf --port=4000 --contador=123 --correlativo=456

  Dependencies: puppeteer
    cd pwa
    npm install --save-dev puppeteer

  This script is intentionally minimal and for developer use.
*/

const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const args = require('minimist')(process.argv.slice(2))
const OUTPUT = args.output || 'dashboard.pdf'
const PORT = Number(args.port || 4000)
const DIST = path.resolve(__dirname, '..', 'pwa', 'dist')

function serveStatic(req, res){
  const parsed = url.parse(req.url)
  let filePath = path.join(DIST, parsed.pathname === '/' ? 'index.html' : decodeURIComponent(parsed.pathname))
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html')
  fs.stat(filePath, (err, stat)=>{
    if (err){ res.statusCode = 404; res.end('Not found'); return }
    fs.createReadStream(filePath).pipe(res)
  })
}

const server = http.createServer(serveStatic)
server.listen(PORT, async ()=>{
  console.log('Serving', DIST, 'on http://localhost:' + PORT)
  try{
    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    const query = []
    if (args.contador) query.push(`contador=${encodeURIComponent(args.contador)}`)
    if (args.correlativo) query.push(`correlativo=${encodeURIComponent(args.correlativo)}`)
    const q = query.length ? ('?' + query.join('&')) : ''
    const target = `http://localhost:${PORT}/${q}`
    console.log('Loading', target)
    await page.goto(target, { waitUntil: 'networkidle0' })
    await page.pdf({ path: OUTPUT, format: 'A4', printBackground: true })
    console.log('Saved PDF to', OUTPUT)
    await browser.close()
  }catch(e){
    console.error('Error generating PDF:', e)
  }finally{
    server.close()
  }
})
