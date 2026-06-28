import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 1. 팬들이 조회할 때 쓰는 일반 클라이언트 (안전함)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. 관리자용 마스터 클라이언트 (브라우저 에러 방지용 격리 조치)
const supabaseServiceKey = typeof window === 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : '';

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : supabase; // 브라우저 환경일 때는 에러 방지를 위해 일반 클라이언트를 임시로 대입합니다.