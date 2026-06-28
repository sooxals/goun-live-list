import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Vercel에 새로 등록한 마스터 키를 가져옵니다.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 1. 일반 팬들이 조회할 때 쓰는 일반 클라이언트 (기존 코드와 동일)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. 관리자가 곡을 추가/삭제할 때 권한을 뚫고 들어갈 마스터 클라이언트 (새로 추가)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);