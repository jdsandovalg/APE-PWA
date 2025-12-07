#!/usr/bin/env node

// Script to check if installation_date column exists and apply migration if needed
// Run with: node check-migration.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumnExists() {
  try {
    console.log('🔍 Checking if installation_date column exists...')

    // Try to select the column - if it doesn't exist, this will fail
    const { data, error } = await supabase
      .from('meters')
      .select('installation_date')
      .limit(1)

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Column installation_date does not exist')
      return false
    }

    console.log('✅ Column installation_date exists')
    return true
  } catch (error) {
    console.error('❌ Error checking column:', error.message)
    return false
  }
}

async function applyMigration() {
  try {
    console.log('📄 Reading migration SQL...')
    const migrationPath = path.join(__dirname, 'add-installation-date-column.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Applying migration...')
    console.log('SQL to execute:')
    console.log(migrationSQL)

    // Note: We can't execute raw SQL through the JS client easily
    // This would need to be done through the Supabase dashboard or CLI
    console.log('⚠️  Please execute this SQL in your Supabase dashboard:')
    console.log('')
    console.log(migrationSQL)

  } catch (error) {
    console.error('❌ Error applying migration:', error)
  }
}

async function checkExistingData() {
  try {
    console.log('📊 Checking existing meters with installation_date...')

    const { data, error } = await supabase
      .from('meters')
      .select('id, contador, installation_date')
      .not('installation_date', 'is', null)
      .limit(5)

    if (error) {
      console.error('❌ Error fetching data:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('✅ Found meters with installation_date:')
      data.forEach(meter => {
        console.log(`  - ${meter.contador}: ${meter.installation_date}`)
      })
    } else {
      console.log('ℹ️  No meters have installation_date set yet')
    }
  } catch (error) {
    console.error('❌ Error checking data:', error)
  }
}

async function main() {
  console.log('🔧 Installation Date Migration Checker\n')

  const columnExists = await checkColumnExists()

  if (!columnExists) {
    await applyMigration()
  } else {
    await checkExistingData()
  }

  console.log('\n✅ Check complete!')
}

main().catch(console.error)