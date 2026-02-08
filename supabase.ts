
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oswzosryqxbgufdmduvs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zd3pvc3J5cXhiZ3VmZG1kdXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzY2MjksImV4cCI6MjA4NjE1MjYyOX0.tu793Hf39q_petjrRtwbIwDr8C8M8TWDmsEUKxTJFkg';

export const supabase = createClient(supabaseUrl, supabaseKey);
