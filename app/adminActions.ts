'use server' // 서버 전용 방 선언

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function submitSongServer(songData: { id?: number; artist: string; title: string; genre: string; isEdit: boolean }) {
  if (songData.isEdit && songData.id) {
    const { data, error } = await supabaseAdmin
      .from('LIVE LIST')
      .update({ artist: songData.artist, title: songData.title, genre: songData.genre })
      .eq('id', songData.id);
      
    if (error) throw error;
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
    return data;
  }
}