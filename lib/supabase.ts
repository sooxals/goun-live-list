import { createClient } from '@supabase/supabase-js'

// process.env 뒤의 이름이 위 .env.local의 이름과 100% 같아야 합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)