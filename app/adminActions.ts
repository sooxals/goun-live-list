'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 1. 곡 추가 및 수정 서버 함수
export async function submitSongServer(songData: { id?: number; artist: string; title: string; genre: string; isEdit: boolean }) {
  if (songData.isEdit && songData.id) {
    const { data, error } = await supabaseAdmin
      .from('LIVE LIST')
      .update({ artist: songData.artist, title: songData.title, genre: songData.genre })
      .eq('id', songData.id);
      
    if (error) throw error;
    revalidatePath('/'); // 메인 화면 캐시 즉시 갱신
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('LIVE LIST')
      .insert([{ 
        artist: songData.artist, 
        title: songData.title, 
        genre: songData.genre, 
        created_at: new Date().toISOString() 
      }]);
      
    if (error) throw error;
    revalidatePath('/');
    return data;
  }
}

// 2. 곡 삭제 서버 함수 (데이터 삭제 후 웹사이트 캐시를 강제로 비우는 조치 추가)
export async function deleteSongServer(songId: number) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST')
    .delete()
    .eq('id', songId);
    
  if (error) {
    console.error('서버 삭제 에러:', error);
    throw error;
  }
  
  revalidatePath('/'); // 중요: 삭제된 데이터가 화면에 계속 남아있지 못하도록 강제 캐시 삭제!
  return data;
}