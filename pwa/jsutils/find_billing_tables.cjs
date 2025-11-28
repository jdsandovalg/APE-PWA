const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase URL or Key. Load pwa/.env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key)

const possibleTables = ['calculations','invoices','bills','charges','contributions','readings','companies']

async function probeTables() {
  for (const t of possibleTables) {
    try {
      process.stdout.write(`🔎 Probing table '${t}'... `)
      const { data, error } = await supabase.from(t).select('*').limit(1)
      if (error) {
        console.log(`❌ Not accessible or does not exist: ${error.message}`)
        continue
      }
      if (!data || data.length === 0) {
        console.log('📭 Exists but empty')
      } else {
        console.log('✅ Exists — sample record:')
        console.log(JSON.stringify(data[0], null, 2))
      }

      // Get column definitions if possible
      try {
        const { data: cols, error: colsErr } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_schema', 'public')
          .eq('table_name', t)

        if (!colsErr && cols && cols.length > 0) {
          console.log(`  Columns (${cols.length}): ${cols.map(c=>c.column_name).join(', ')}`)
        }
      } catch (e) {
        // ignore
      }

    } catch (err) {
      console.error('❌ Error probing table', t, err)
    }
    console.log('')
  }
}

probeTables()
