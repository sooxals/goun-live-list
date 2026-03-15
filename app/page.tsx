'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Song {
  id: number;
  title: string;
  artist: string;
  genre: string;
  created_at: string;
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitial, setSelectedInitial] = useState('전체');
  const [selectedGenre, setSelectedGenre] = useState('전체');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [formArtist, setFormArtist] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formGenre, setFormGenre] = useState('가요');

  const genres = ['전체', '가요', '트로트', 'POP', 'J-POP', '뮤지컬'];
  const initials = ['전체', '0-9', 'A-Z', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  const getInitialSound = (text: string) => {
    if (!text) return '?';
    const char = text.trim()[0];
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const icons = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
      const idx = Math.floor((code - 0xac00) / 588);
      const simpleIcons: {[key: string]: string} = {'ㄲ':'ㄱ', 'ㄸ':'ㄷ', 'ㅃ':'ㅂ', 'ㅆ':'ㅅ', 'ㅉ':'ㅈ'};
      return simpleIcons[icons[idx]] || icons[idx];
    }
    if (/[0-9]/.test(char)) return '0-9';
    if (/[a-zA-Z]/.test(char)) return 'A-Z';
    return char.toUpperCase();
  };

  const fetchSongs = async () => {
    const { data } = await supabase.from('LIVE LIST').select('*').order('artist', { ascending: true });
    if (data) setSongs(data as Song[]);
    setLoading(false);
  };

  useEffect(() => { fetchSongs(); }, []);

  const handleAdminToggle = () => {
    if (isAdminMode) { setIsAdminMode(false); setEditingSong(null); }
    else {
      const pw = prompt("관리자 인증이 필요합니다.");
      if (pw === (localStorage.getItem('admin_pw') || "1234")) setIsAdminMode(true);
      else if (pw !== null) alert("권한이 없습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArtist || !formTitle) return alert('입력란을 확인해주세요.');
    if (editingSong) {
      await supabase.from('LIVE LIST').update({ artist: formArtist, title: formTitle, genre: formGenre }).eq('id', editingSong.id);
    } else {
      await supabase.from('LIVE LIST').insert([{ artist: formArtist, title: formTitle, genre: formGenre }]);
    }
    setFormArtist(''); setFormTitle(''); setEditingSong(null); fetchSongs();
  };

  const filtered = songs.filter(s => {
    const isInitialMatch = selectedInitial === '전체' || getInitialSound(s.artist) === selectedInitial;
    const isGenreMatch = selectedGenre === '전체' || s.genre === selectedGenre;
    const cleanSearch = searchTerm.replace(/\s+/g, '').toLowerCase();
    const isSearchMatch = !cleanSearch || (s.artist+s.title).replace(/\s+/g, '').toLowerCase().includes(cleanSearch);
    return isInitialMatch && isGenreMatch && isSearchMatch;
  });

  if (loading) return <div className="p-10 text-center text-gray-400 font-medium font-sans">목록을 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FD] text-[#1D1D1F] pb-20 font-sans">
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <header className="flex justify-between items-start mb-10 px-2">
          <div>
            <h1 className="text-3xl font-black mb-2 tracking-tighter">🎧 고운이 LIVE LIST 🎧</h1>
            <p className="text-gray-400 text-sm font-medium">총 <span className="text-indigo-600 font-bold">{songs.length}곡</span>의 리스트가 있습니다.</p>
          </div>
          <button onClick={handleAdminToggle} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-gray-300 hover:text-indigo-500 transition-all">
            {isAdminMode ? '✕' : '⚙️'}
          </button>
        </header>

        {isAdminMode && (
          <div className="mb-10 bg-white p-7 rounded-[2.5rem] shadow-xl shadow-indigo-100/40 border border-indigo-50 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-indigo-600">{editingSong ? '곡 정보 수정' : '새로운 곡 추가'}</h2>
              <button onClick={() => {
                const n = prompt("새 암호");
                if(n) { localStorage.setItem('admin_pw', n); alert("변경완료!"); }
              }} className="text-xs font-bold text-gray-300 hover:text-indigo-400 underline underline-offset-4">암호변경</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input className="p-4 bg-gray-50 rounded-2xl outline-none" placeholder="가수명" value={formArtist} onChange={e=>setFormArtist(e.target.value)} />
                <input className="p-4 bg-gray-50 rounded-2xl outline-none" placeholder="노래제목" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
                <select className="p-4 bg-gray-50 rounded-2xl outline-none appearance-none" value={formGenre} onChange={e=>setFormGenre(e.target.value)}>
                  {genres.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-indigo-200">
                {editingSong ? '수정 내용 저장' : '리스트에 추가'}
              </button>
            </form>
          </div>
        )}

        <div className="sticky top-4 z-30 space-y-4 mb-10">
          <div className="relative">
            <input 
              className="w-full p-5 pl-14 rounded-3xl border-none shadow-xl shadow-gray-200/40 outline-none text-lg focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="찾고 싶은 노래나 가수를 입력하세요" 
              value={searchTerm} 
              onChange={e=>setSearchTerm(e.target.value)} 
            />
            <span className="absolute left-6 top-5.5 text-xl opacity-30">🔍</span>
          </div>
          
          <div className="flex flex-col gap-3 bg-white/60 backdrop-blur-lg p-3 rounded-3xl shadow-inner border border-white/50">
            <div className="flex overflow-x-auto pb-1.5 gap-1.5 no-scrollbar">
              {initials.map(init => (
                <button key={init} onClick={() => setSelectedInitial(init)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedInitial === init ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-400'}`}>
                  {init}
                </button>
              ))}
            </div>
            <div className="flex overflow-x-auto gap-2 no-scrollbar">
              {genres.map(genre => (
                <button key={genre} onClick={() => setSelectedGenre(genre)} className={`flex-shrink-0 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${selectedGenre === genre ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((song) => (
            <div key={song.id} className="bg-white p-6 md:p-7 rounded-[2.5rem] shadow-sm flex items-center justify-between border border-white hover:border-indigo-50 hover:shadow-2xl transition-all duration-300">
              <div className="overflow-hidden flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  {/* 가수명: 모바일 18px(text-lg), PC 24px(text-2xl) */}
                  <h3 className="font-black text-lg md:text-2xl truncate text-gray-950 tracking-tight">{song.artist}</h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] md:text-[10px] font-black rounded-lg uppercase tracking-tighter shrink-0">
                    {song.genre}
                  </span>
                </div>
                {/* 노래제목: 모바일 14px(text-sm), PC 16px(text-base) */}
                <p className="text-gray-400 font-semibold text-sm md:text-base truncate ml-0.5">{song.title}</p>
              </div>
              
              {isAdminMode && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => { setEditingSong(song); setFormArtist(song.artist); setFormTitle(song.title); setFormGenre(song.genre); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-indigo-400 bg-indigo-50 rounded-xl">✏️</button>
                  <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('LIVE LIST').delete().eq('id', song.id); fetchSongs(); } }} className="p-2 text-red-400 bg-red-50 rounded-xl">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filtered.length === 0 && <div className="text-center py-40 text-gray-300 font-bold italic text-xl">No songs found...</div>}
      </div>
    </main>
  );
}