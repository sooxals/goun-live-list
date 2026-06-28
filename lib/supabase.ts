import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// 일반 화면(브라우저)에서 에러가 나지 않도록 값이 없을 때를 대비합니다.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 1. 일반 팬들이 조회할 때 쓰는 일반 클라이언트 (기존 코드와 동일)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. 관리자가 곡을 추가/삭제할 때 권한을 뚫고 들어갈 마스터 클라이언트 (새로 추가)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);