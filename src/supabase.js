// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://beewsgpchkciyodukluy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZXdzZ3BjaGtjaXlvZHVrbHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgzNjg5NzYsImV4cCI6MjAzMzk0NDk3Nn0.qnuqANWVH-dJO8Y4rIV1S_YnhAsSN7dgV4deCpfhWcQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

