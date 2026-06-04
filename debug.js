const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://behsdfsodflwgeoauwgx.supabase.co', 'sb_publishable_YISrTKjCLqK1VJndGAiWzQ_Y87HnVct');

async function run() {
  const { data, error } = await supabase.from('sales').select('*');
  if (error) console.error(error);
  console.log("SALES:", data);
}
run();
