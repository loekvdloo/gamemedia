import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eaeyhedxuirvabsfduux.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZXloZWR4dWlydmFic2ZkdXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NDgyOTYsImV4cCI6MjA2NDUyNDI5Nn0.Ov65PqZ7jhkOEAJgbqlQYy2HgBIjax4OPARWcciyjUc';

export const supabase = createClient(supabaseUrl, supabaseKey);
