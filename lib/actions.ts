'use server' // 이 파일의 모든 기능은 브라우저가 아닌 '서버'에서만 실행하겠다는 선언입니다!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 환경에서만 안전하게 마스터 키 클라이언트를 생성합니다.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 1. 곡 추가를 서버에서 대신 처리해주는 함수
export async function addSongServer(songData: any) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST') // 테이블 이름이 'LIVE LIST'인지 'songs'인지 기존 코드와 맞춰주세요!
    .insert([songData]);
    
  if (error) throw error;
  return data;
}

// 2. 곡 삭제를 서버에서 대신 처리해주는 함수
export async function deleteSongServer(songId: any) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST')
    .delete()
    .eq('id', songId);
    
  if (error) throw error;
  return data;
}