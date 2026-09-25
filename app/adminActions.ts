'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 🎵 방송 라이브 기록 아이템 타입
export interface LiveHistoryItem {
  date: string;
  url: string;
}

// 1. 곡 추가 및 수정 서버 함수 (history 항목 추가)
export async function submitSongServer(songData: { 
  id?: number; 
  artist: string; 
  title: string; 
  genre: string; 
  history?: LiveHistoryItem[]; 
  isEdit: boolean 
}) {
  const { id, artist, title, genre, history = [], isEdit } = songData;

  if (isEdit && id) {
    const { data, error } = await supabaseAdmin
      .from('LIVE LIST')
      .update({ 
        artist, 
        title, 
        genre,
        history // 🌟 history 컬럼 추가 업데이트
      })
      .eq('id', id);
      
    if (error) throw error;
    revalidatePath('/'); // 메인 화면 캐시 즉시 갱신
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('LIVE LIST')
      .insert([{ 
        artist, 
        title, 
        genre, 
        history, // 🌟 history 컬럼 추가 저장
        created_at: new Date().toISOString() 
      }]);
      
    if (error) throw error;
    revalidatePath('/');
    return data;
  }
}

// 2. 곡 삭제 서버 함수
export async function deleteSongServer(songId: number) {
  const { data, error } = await supabaseAdmin
    .from('LIVE LIST')
    .delete()
    .eq('id', songId);
    
  if (error) {
    console.error('서버 삭제 에러:', error);
    throw error;
  }
  
  revalidatePath('/'); // 삭제된 데이터가 화면에 남지 않도록 강제 캐시 삭제
  return data;
}

// 3. 관리자 비밀번호를 서버에서 안전하게 확인하는 함수 (한/영 오타 자동 변환 지원)
export async function checkAdminPasswordServer(inputPw: string) {
  const { data, error } = await supabaseAdmin
    .from('ADMIN_CONFIG')
    .select('value')
    .eq('id', 'admin_pw')
    .single();

  if (error || !data) {
    console.error('비밀번호 조회 에러:', error);
    return false;
  }

  const realPw = data.value;

  // 1) 정확한 입력 비교
  if (inputPw === realPw) return true;

  // 2) 한/영 키 잘못 눌렀을 때 입력된 한글을 영문 키로 자동 변환하여 비교
  const convertedPw = convertKorToEng(inputPw);
  return convertedPw === realPw;
}

// 💡 한글 영타 변환 헬퍼 함수 (한/영 키 오입력 처리)
function convertKorToEng(korText: string): string {
  const korInitials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const korVowels = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const korFinals = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const mapKorToEngKey: { [key: string]: string } = {
    'ㄱ':'r', 'ㄲ':'R', 'ㄴ':'s', 'ㄷ':'e', 'ㄸ':'E', 'ㄹ':'f', 'ㅁ':'a', 'ㅂ':'q', 'ㅃ':'Q', 'ㅅ':'t', 'ㅆ':'T',
    'ㅇ':'d', 'ㅈ':'w', 'ㅉ':'W', 'ㅊ':'c', 'ㅋ':'z', 'ㅌ':'x', 'ㅍ':'v', 'ㅎ':'g',
    'ㅏ':'k', 'ㅐ':'o', 'ㅑ':'i', 'ㅒ':'O', 'ㅓ':'j', 'ㅔ':'p', 'ㅕ':'n', 'ㅖ':'P', 'ㅗ':'h', 'ㅘ':'hk', 'ㅙ':'ho',
    'ㅚ':'hl', 'ㅛ':'y', 'ㅜ':'n', 'ㅝ':'nj', 'ㅞ':'np', 'ㅟ':'nl', 'ㅠ':'b', 'ㅡ':'m', 'ㅢ':'ml', 'ㅣ':'l'
  };

  let result = '';
  for (let i = 0; i < korText.length; i++) {
    const char = korText[i];
    const code = char.charCodeAt(0);

    if (code >= 0xac00 && code <= 0xd7a3) {
      const uniIndex = code - 0xac00;
      const initialIdx = Math.floor(uniIndex / 588);
      const vowelIdx = Math.floor((uniIndex % 588) / 28);
      const finalIdx = uniIndex % 28;

      result += mapKorToEngKey[korInitials[initialIdx]] || '';
      result += mapKorToEngKey[korVowels[vowelIdx]] || '';
      if (finalIdx > 0) {
        result += mapKorToEngKey[korFinals[finalIdx]] || '';
      }
    } else {
      result += mapKorToEngKey[char] || char;
    }
  }
  return result;
}