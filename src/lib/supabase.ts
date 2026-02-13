import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unkqgfqrnlkzpbicwopd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3FnZnFybmxrenBiaWN3b3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDAyMDUsImV4cCI6MjA4NjUxNjIwNX0.vfO_vJt9pjpEESrRj6S3JcRt_tV91TDXcZJM_AOWEAM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'pos-auth-session',
  },
});
