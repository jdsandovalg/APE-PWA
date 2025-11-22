const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function safe(cmd){
  try{ return execSync(cmd, { encoding: 'utf8' }).trim() }catch(e){ return null }
}

const commit = safe('git rev-parse --short HEAD') || 'unknown'
const describe = safe('git describe --tags --always') || commit
const builtAt = new Date().toISOString()

let version = '0.0.0'
try{
  const pj = require(path.join(__dirname,'..','package.json'))
  version = pj.version || version
}catch(e){}

const meta = {
  version,
  commit: describe,
  builtAt,
  authorized: `Autorizado v${version}`
}

const out = path.join(__dirname, '..', 'public', 'build-meta.json')
try{
  fs.writeFileSync(out, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  console.log('Wrote build-meta to', out)
}catch(e){
  console.error('Failed to write build-meta.json', e)
  process.exit(2)
}
