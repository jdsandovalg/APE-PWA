import { supabase } from './src/services/supabase.js';

(async () => {
  try {
    const { data, error } = await supabase
      .from('readings')
      .select('meter_id, date, consumption, production, credit')
      .limit(10)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Ejemplo de readings:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();