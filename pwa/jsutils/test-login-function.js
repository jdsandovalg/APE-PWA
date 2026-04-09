import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wtczfdkldixaptrskjwb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Y3pmZGtsZGl4YXB0cnNrandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTk1NDIsImV4cCI6MjA3MjIzNTU0Mn0.paNwJUSuKaisbdMmK_J77LKTs4HpfKwgvv3cJz9pqI4'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'energia' }
})

async function testLogin() {
  console.log('🔍 Test login directo con diferentes valores:\n')
  
  // Test 1: LF01 con clave plana
  console.log('Test 1: p_identifier="LF01", p_clave="c14321"')
  const r1 = await supabase.rpc('login_user', { p_identifier: 'LF01', p_clave: 'c14321' })
  console.log('  Result:', r1.data, 'Error:', r1.error, '\n')
  
  // Test 2: Con id como texto
  console.log('Test 2: p_identifier="1", p_clave="c14321"')
  const r2 = await supabase.rpc('login_user', { p_identifier: '1', p_clave: 'c14321' })
  console.log('  Result:', r2.data, 'Error:', r2.error, '\n')

  // Test 3: Con email
  console.log('Test 3: p_identifier="jdsandovalg@hotmail.com", p_clave="vilma123"')
  const r3 = await supabase.rpc('login_user', { p_identifier: 'jdsandovalg@hotmail.com', p_clave: 'vilma123' })
  console.log('  Result:', r3.data, 'Error:', r3.error, '\n')

  // Test 4: buscar la definicion de la funcion
  console.log('🔍 Ver definición de energia.login_user:')
  const { data: def } = await supabase.rpc('pg_get_function_result', { oid: 24621 })
  console.log('  Definition:', def)
}

testLogin()