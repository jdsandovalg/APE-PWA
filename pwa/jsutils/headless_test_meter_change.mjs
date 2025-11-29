import { chromium } from 'playwright'
import fetch from 'node-fetch'
import child_process from 'child_process'

const PREVIEW_PORT = process.env.PREVIEW_PORT || '5175'
const BASE_URL = `http://localhost:${PREVIEW_PORT}/`

async function waitForServer(url, timeout = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return true
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error('Server did not become ready: ' + url)
}

async function run() {
  console.log('Starting headless test: will connect to', BASE_URL)

  // Launch preview server
  console.log('Starting preview server on port', PREVIEW_PORT)
  const preview = child_process.spawn('npm', ['run', 'preview', '--', '--port', PREVIEW_PORT], { cwd: process.cwd(), shell: true, stdio: ['ignore', 'inherit', 'inherit'] })

  try {
    await waitForServer(BASE_URL)
  } catch (e) {
    preview.kill('SIGKILL')
    console.error('Preview server failed to start:', e)
    process.exit(1)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  const logs = []
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() })
    console.log('PAGE LOG>', msg.type(), msg.text())
  })

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // Click dashboard's "Gestionar medidores" button to navigate to meters view
    await page.waitForSelector('button[aria-label="Gestionar medidores"]', { timeout: 5000 })
    await page.click('button[aria-label="Gestionar medidores"]')

    // Wait for a star button to appear (one of the Establecer buttons)
    await page.waitForSelector('button[aria-label^="Establecer"]', { timeout: 5000 })

    // Capture current state
    const before = await page.evaluate(() => ({
      localStorage: localStorage.getItem('ape_currentMeterId'),
      selectValue: (document.querySelector('select') && document.querySelector('select').value) || null,
      headerInfo: (() => {
        const cards = Array.from(document.querySelectorAll('.glass-card'))
        for (const c of cards) {
          if (c.innerText && c.innerText.includes('Información del contador')) {
            const p = c.querySelector('p')
            if (p) return p.innerText.trim()
          }
        }
        return null
      })()
    }))

    console.log('Before:', JSON.stringify(before, null, 2))

    // Click the first "Establecer" button
    await page.click('button[aria-label^="Establecer"]')

    // Wait a moment for handlers, toast, and events
    await page.waitForTimeout(1200)

    const after = await page.evaluate(() => ({
      localStorage: localStorage.getItem('ape_currentMeterId'),
      selectValue: (document.querySelector('select') && document.querySelector('select').value) || null,
      headerInfo: (() => {
        const cards = Array.from(document.querySelectorAll('.glass-card'))
        for (const c of cards) {
          if (c.innerText && c.innerText.includes('Información del contador')) {
            const p = c.querySelector('p')
            if (p) return p.innerText.trim()
          }
        }
        return null
      })()
    }))

    console.log('After:', JSON.stringify(after, null, 2))

    // Collect console logs captured
    await browser.close()
    // Kill preview server
    preview.kill('SIGKILL')

    // Output result summary
    const result = { before, after, logs }
    console.log('\n===== TEST RESULT =====')
    console.log(JSON.stringify(result, null, 2))
    // Exit success
    process.exit(0)
  } catch (err) {
    console.error('Test error', err)
    try { await browser.close() } catch(e){}
    preview.kill('SIGKILL')
    process.exit(2)
  }
}

run()
