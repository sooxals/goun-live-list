'use server' // 이 파일의 코드는 일반 팬들 브라우저가 아니라 '서버 컴퓨터'에서만 돌아갑니다!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 환경이므로 안전하게 마스터 키 클라이언트를 만듭니다.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 1. 곡 추가 기능
export async function addSongServer(songData: any) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST') // ⚠️ 혹시 Supabase 테이블 이름이 'songs'라면 'songs'로 바꿔주세요!
    .insert([songData]);
    
  if (error) throw error;
  return data;
}

// 2. 곡 삭제 기능
export async function deleteSongServer(songId: any) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST') // ⚠️ 테이블 이름 확인!
    .delete()
    .eq('id', songId);
    
  if (error) throw error;
  return data;
}