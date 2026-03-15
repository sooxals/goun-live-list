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
  const [showTopBtn, setShowTopBtn] = useState(false);

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

  useEffect(() => { 
    fetchSongs();
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const downloadCSV = () => {
    const headers = ['가수', '제목', '장르', '등록일'];
    const rows = songs.map(s => [s.artist, s.title, s.genre, s.created_at]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `고운_백업_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const resetNewTags = async () => {
    if (!confirm('현재 떠 있는 모든 NEW 표시를 제거할까요?')) return;
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 31);
    const { error } = await supabase.from('LIVE LIST').update({ created_at: oneMonthAgo.toISOString() }).neq('id', 0);
    if (error) alert('초기화 중 오류가 발생했습니다.');
    else { alert('모든 NEW 표시가 제거되었습니다.'); fetchSongs(); }
  };

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
      await supabase.from('LIVE LIST').insert([{ artist: formArtist, title: formTitle, genre: formGenre, created_at: new Date().toISOString() }]);
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

  const isNew = (dateStr: string) => {
    if (!dateStr) return false;
    const created = new Date(dateStr);
    const now = new Date();
    return now.getTime() - created.getTime() < 30 * 24 * 60 * 60 * 1000;
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-sans">목록을 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FD] text-[#1D1D1F] pb-10 font-sans relative">
      
      {/* 상단 고정 영역 */}
      <div className="sticky top-0 z-40 bg-[#F8F9FD]/95 backdrop-blur-md pt-5 pb-2 px-4 shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-center mb-4 px-1">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-gray-900 drop-shadow-sm">
              🎧 고운이 LIVE LIST
            </h1>
            <div className="flex items-center gap-2">
              {isAdminMode && (
                <>
                  <button onClick={resetNewTags} className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200">NEW 초기화</button>
                  <button onClick={downloadCSV} className="text-[10px] bg-gray-200 px-2 py-1 rounded font-bold">CSV</button>
                </>
              )}
              <button onClick={handleAdminToggle} className="text-gray-300 hover:text-indigo-500 transition-all text-base">{isAdminMode ? '✕' : '⚙️'}</button>
            </div>
          </header>

          <div className="relative mb-2">
            <input 
              className="w-full p-2.5 pl-10 rounded-xl border-none shadow-md outline-none text-sm md:text-base focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="찾고 싶은 노래나 가수를 입력하세요" 
              value={searchTerm} 
              onChange={e=>setSearchTerm(e.target.value)} 
            />
            <span className="absolute left-4 top-2.5 text-base md:text-lg opacity-30">🔍</span>
          </div>
          
          {/* 카테고리: 글자 두께를 font-semibold 정도로 부드럽게 조정 */}
          <div className="flex flex-col gap-1.5 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <div className="flex overflow-x-auto gap-1 no-scrollbar">
              {initials.map(init => (
                <button 
                  key={init} 
                  onClick={() => setSelectedInitial(init)} 
                  className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs md:text-sm font-semibold transition-all ${selectedInitial === init ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  {init}
                </button>
              ))}
            </div>
            <div className="flex overflow-x-auto gap-1.5 no-scrollbar border-t border-gray-50 pt-1.5">
              {genres.map(genre => (
                <button 
                  key={genre} 
                  onClick={() => setSelectedGenre(genre)} 
                  className={`flex-shrink-0 px-3 py-1 rounded-md text-xs md:text-sm font-bold transition-all ${selectedGenre === genre ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {isAdminMode && (
          <div className="mb-6 bg-white p-5 rounded-2xl shadow-lg border border-indigo-50">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="p-3 bg-gray-50 rounded-xl text-sm outline-none" placeholder="가수명" value={formArtist} onChange={e=>setFormArtist(e.target.value)} />
                <input className="p-3 bg-gray-50 rounded-xl text-sm outline-none" placeholder="노래제목" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
                <select className="p-3 bg-gray-50 rounded-xl text-sm outline-none" value={formGenre} onChange={e=>setFormGenre(e.target.value)}>
                  {genres.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button className="bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm">곡 저장하기</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filtered.map((song) => (
            <div key={song.id} className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-indigo-100 transition-all">
              <div className="overflow-hidden flex-1 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  {isNew(song.created_at) && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded shrink-0 animate-pulse">NEW</span>}
                  <h3 className="font-extrabold text-[16px] md:text-[18px] truncate text-gray-950 tracking-tight leading-tight">{song.artist}</h3>
                  <span className="text-[11px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-400 font-bold uppercase shrink-0">{song.genre}</span>
                </div>
                <p className="text-gray-600 font-semibold text-[14px] md:text-[16px] truncate ml-0.5">{song.title}</p>
              </div>
              {isAdminMode && (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setEditingSong(song); setFormArtist(song.artist); setFormTitle(song.title); setFormGenre(song.genre); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-indigo-400 bg-indigo-50 rounded-xl">✏️</button>
                  <button onClick={async () => { if(confirm('삭제할까요?')) { await supabase.from('LIVE LIST').delete().eq('id', song.id); fetchSongs(); } }} className="p-2 text-red-400 bg-red-50 rounded-lg">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showTopBtn && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center font-black text-xs z-50 animate-bounce">TOP</button>
      )}
    </main>
  );
}