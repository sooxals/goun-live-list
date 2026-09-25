'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { submitSongServer, deleteSongServer, checkAdminPasswordServer } from './adminActions';

interface Song {
  id: number;
  title: string;
  artist: string;
  genre: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  
  // 🌟 첫 접속 시 메인 랜딩 화면을 먼저 보여주는 상태값
  const [showList, setShowList] = useState(false);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitial, setSelectedInitial] = useState('전체');
  const [selectedGenre, setSelectedGenre] = useState('전체');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
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
    const { data, error } = await supabase.from('LIVE LIST').select('*').order('artist', { ascending: true });
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
    if (!confirm('모든 NEW 표시를 지금 즉시 제거할까요?')) return;
    const oldDate = new Date('2000-01-01').toISOString();
    const { error } = await supabaseAdmin
      .from('LIVE LIST')
      .update({ created_at: oldDate })
      .not('id', 'eq', 0);

    if (error) {
      console.error(error);
      alert('오류가 발생했습니다.');
    } else {
      alert('모든 NEW 표시가 제거되었습니다!');
      await fetchSongs();
    }
  };

  const handleAdminToggle = () => {
    if (isAdminMode) { 
      setIsAdminMode(false); 
      setEditingSong(null); 
    } else {
      setInputPassword('');
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = await checkAdminPasswordServer(inputPassword);

    if (isCorrect) {
      setIsAdminMode(true);
      setShowLoginModal(false);
      setInputPassword('');
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const changePassword = async () => {
    const newPw = prompt("새로운 비밀번호를 입력하세요.");
    if (!newPw) return;
    const { error } = await supabaseAdmin.from('ADMIN_CONFIG').update({ value: newPw }).eq('id', 'admin_pw');
    if (error) alert("변경 실패");
    else alert("비밀번호가 변경되었습니다.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArtist || !formTitle) return alert('입력란을 확인해주세요.');

    try {
      if (editingSong) {
        await submitSongServer({
          id: editingSong.id,
          artist: formArtist,
          title: formTitle,
          genre: formGenre,
          isEdit: true
        });
      } else {
        await submitSongServer({
          artist: formArtist,
          title: formTitle,
          genre: formGenre,
          isEdit: false
        });
      }

      setFormArtist('');
      setFormTitle('');
      setEditingSong(null);
      fetchSongs();
      alert('성공적으로 반영되었습니다!');
    } catch (error) {
      console.error(error);
      alert('작업 중 오류가 발생했습니다.');
    }
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
      
      {/* ================= 1. 기본 웰컴 랜딩 화면 (PC 시원하게 확장 버전) ================= */}
      {!showList ? (
        <section className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-4xl md:max-w-5xl mx-auto">
          {/* 타이틀 및 소셜 링크 버튼 (YouTube & SOOP) */}
          <div className="mb-6 space-y-4 flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
              <span>🎧</span>
              <span>고운이 LIVE LIST</span>
            </h1>

           {/* 소셜 링크 버튼 영역 (SOOP & YouTube) */}
          <div className="flex items-center justify-center gap-2.5 pt-1">
            {/* 1. SOOP 이동 링크 버튼 (앞으로 이동) */}
            <a
              href="https://www.sooplive.com/station/kjnw7643"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-sm"
            >
              {/* SOOP 공식 심볼 아이콘 */}
              <svg className="w-5 h-5 fill-[#0080FF] shrink-0" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.2 13.5c-2.1 0-3.7-1.2-3.7-3.2 0-2.3 2.1-3.1 3.9-3.7 1.4-.5 2.1-.8 2.1-1.5 0-.7-.6-1.1-1.6-1.1-1.2 0-2.3.6-3.1 1.3l-1.2-1.6c1.2-1.1 2.8-1.7 4.5-1.7 2.3 0 3.8 1.1 3.8 3.1 0 2.1-1.8 2.9-3.7 3.5-1.5.5-2.2.9-2.2 1.6 0 .8.8 1.2 1.8 1.2 1.4 0 2.7-.8 3.5-1.6l1.2 1.5c-1.2 1.3-2.9 2.2-4.9 2.2z"/>
              </svg>
              <span className="text-gray-900 font-bold text-sm sm:text-base">SOOP</span>
            </a>

            {/* 2. YouTube 이동 링크 버튼 */}
            <a
              href="https://www.youtube.com/@Singer_LGU"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-sm"
            >
              {/* 유튜브 아이콘 */}
              <svg className="w-5 h-5 fill-[#FF0000] shrink-0" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-gray-900 font-bold text-sm sm:text-base">YouTube</span>
            </a>
          </div>
          </div>

          {/* 메인 이미지 히어로 카드 */}
          <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 mb-8 bg-white group">
            <img
              src="/hero-pc.png"
              alt="가수 고운 메인 (PC)"
              className="hidden sm:block w-full h-auto max-h-[550px] object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
            />
            <img
              src="/hero-mobile.png"
              alt="가수 고운 메인 (모바일)"
              className="block sm:hidden w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
            />
          </div>

          {/* 리스트 입장 버튼 */}
          <button
            onClick={() => setShowList(true)}
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-200 transition-all transform hover:-translate-y-1 active:translate-y-0 text-base md:text-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎵 전체 노래 리스트 둘러보기</span>
          </button>
        </section>
      ) : (

        /* ================= 2. 기존 노래 리스트 화면 (버튼 클릭 시 노출) ================= */
        <>
          <div className="sticky top-0 z-40 bg-[#F8F9FD]/95 backdrop-blur-md pt-5 pb-2 px-4 shadow-sm border-b border-gray-100">
            <div className="max-w-5xl mx-auto">
              <header className="flex justify-between items-center mb-4">
                
                {/* 메인 랜딩으로 돌아가는 버튼 역할 포함 */}
                <div 
                  onClick={() => {
                    setSearchTerm('');          
                    setEditingSong(null);       
                    setSelectedInitial('전체'); 
                    setSelectedGenre('전체');   
                    setShowList(false); // 메인 랜딩 카드 화면으로 되돌아가기
                  }}
                  className="cursor-pointer select-none group flex items-center gap-2"
                  title="처음 화면으로 이동"
                >
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    ← 메인
                  </span>
                  <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight group-hover:opacity-80 transition-opacity whitespace-nowrap">
                    🎧 고운이 LIVE LIST
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {isAdminMode && (
                    <>
                      <button onClick={changePassword} className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded font-bold">비번 변경</button>
                      <button onClick={resetNewTags} className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">NEW 초기화</button>
                      <button onClick={downloadCSV} className="text-[10px] bg-gray-200 px-2 py-1 rounded font-bold">CSV</button>
                    </>
                  )}
                  <button onClick={handleAdminToggle} className="text-gray-300 hover:text-indigo-500 transition-all text-base">
                    {isAdminMode ? '✕' : '⚙️'}
                  </button>
                </div>
              </header>

              <div className="relative mb-2">
                <input 
                  className="w-full p-2.5 pl-10 pr-10 rounded-xl border-none shadow-md outline-none text-sm md:text-base" 
                  placeholder="찾고 싶은 노래나 가수를 입력하세요" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
                <span className="absolute left-4 top-2.5 text-base md:text-lg opacity-30">🔍</span>

                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    title="검색어 지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                {/* 초성 필터 */}
                <div className="flex overflow-x-auto gap-1 no-scrollbar">
                  {initials.map(init => (
                    <button 
                      key={init} 
                      onClick={() => {
                        setSelectedInitial(init);
                        setSelectedGenre('전체'); 
                      }} 
                      className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs md:text-sm font-semibold ${selectedInitial === init ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                    >
                      {init}
                    </button>
                  ))}
                </div>
                {/* 장르 필터 */}
                <div className="flex overflow-x-auto gap-1.5 no-scrollbar border-t border-gray-50 pt-1.5">
                  {genres.map(genre => (
                    <button 
                      key={genre} 
                      onClick={() => {
                        setSelectedGenre(genre);
                        setSelectedInitial('전체'); 
                      }} 
                      className={`flex-shrink-0 px-3 py-1 rounded-md text-xs md:text-sm font-bold ${selectedGenre === genre ? 'bg-black text-white' : 'text-gray-400'}`}
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
                      <button onClick={() => { setEditingSong(song); setFormArtist(song.artist); setFormTitle(song.title); }} className="p-2 text-gray-400 bg-gray-50 rounded-lg">
                        ✏️
                      </button>
                      <button 
                        onClick={async () => { 
                          if (confirm('삭제할까요?')) { 
                            try {
                              await deleteSongServer(song.id); 
                              await fetchSongs(); 
                              router.refresh(); 
                              alert('삭제되었습니다!');
                            } catch (error) {
                              console.error(error);
                              alert('삭제 중 오류가 발생했습니다.');
                            }
                          } 
                        }}
                        className="p-2 text-red-400 bg-red-50 rounded-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TOP 버튼 */}
      {showList && showTopBtn && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center font-black text-xs z-50 animate-bounce">TOP</button>
      )}

      {/* 관리자 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-2">🔐 관리자 로그인</h3>
            <p className="text-xs text-gray-500 mb-4">관리자 비밀번호를 입력해주세요.</p>
            
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              <input 
                type="password" 
                className="p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-200 focus:border-indigo-600" 
                placeholder="비밀번호" 
                value={inputPassword} 
                onChange={e => setInputPassword(e.target.value)} 
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(false)} 
                  className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-xl font-bold text-sm"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm"
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}