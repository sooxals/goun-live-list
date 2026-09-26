'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { submitSongServer, deleteSongServer, checkAdminPasswordServer } from './adminActions';

interface LiveHistoryItem {
  date: string;
  url: string;
}

interface Song {
  id: number;
  title: string;
  artist: string;
  genre: string;
  created_at: string;
  history?: LiveHistoryItem[];
}

export default function Home() {
  const router = useRouter();
  
  const [showList, setShowList] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitial, setSelectedInitial] = useState('전체');
  const [selectedGenre, setSelectedGenre] = useState('전체');

  // 특수 필터 상태 관리 ('all' | 'new' | 'top100')
  const [specialFilter, setSpecialFilter] = useState<'all' | 'new' | 'top100'>('all');

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showTopBtn, setShowTopBtn] = useState(false);

  // 📝 곡 등록/수정 폼 State
  const [formArtist, setFormArtist] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formGenre, setFormGenre] = useState('가요');
  const [formHistory, setFormHistory] = useState<LiveHistoryItem[]>([]);

  // 📋 복사기능용 State
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copyModalText, setCopyModalText] = useState<string | null>(null);
  const [isModalSelected, setIsModalSelected] = useState(false);

  // 🎵 곡 상세 보기 모달 State
  const [selectedSongDetail, setSelectedSongDetail] = useState<Song | null>(null);

  // 🎲 랜덤 노래 모달 State (대상 범위 & 장르 선택)
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomTarget, setRandomTarget] = useState<'all' | 'new' | 'top100'>('all');
  const [randomGenre, setRandomGenre] = useState('전체');
  const [pickedSong, setPickedSong] = useState<Song | null>(null);

  const genres = ['전체', '가요', '트로트', 'POP', 'J-POP', '뮤지컬'];
  const initials = ['전체', '0-9', 'A-Z', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  // 💡 초성/장르 클릭 시 특수 필터를 해제하고 검색하는 핸들러
  const handleInitialClick = (init: string) => {
    setSpecialFilter('all');
    setSelectedInitial(init);
    setSelectedGenre('전체');
  };

  const handleGenreClick = (genre: string) => {
    setSpecialFilter('all');
    setSelectedGenre(genre);
    setSelectedInitial('전체');
  };

  const handleCopySong = async (song: Song) => {
    const textToCopy = `${song.artist} - ${song.title}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedId(song.id);
        setTimeout(() => setCopiedId(null), 1500);
        return;
      }
    } catch (err) {
      console.log('SOOP iframe 보안 차단 감지 -> 수동 선택 모달 전환');
    }

    setIsModalSelected(false);
    setCopyModalText(textToCopy);
  };

  const handleSelectText = () => {
    const inputEl = document.getElementById('copy-input-element') as HTMLInputElement;
    if (inputEl) {
      inputEl.focus();
      inputEl.setSelectionRange(0, 9999);
      inputEl.select();
      setIsModalSelected(true);
      
      try {
        document.execCommand('copy');
      } catch (e) {}
    }
  };

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
      resetForm();
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

  // 📝 관리자 히스토리 동적 추가/수정 관련 함수
  const resetForm = () => {
    setFormArtist('');
    setFormTitle('');
    setFormGenre('가요');
    setFormHistory([]);
    setEditingSong(null);
  };

  const handleAddHistoryRow = () => {
    setFormHistory([...formHistory, { date: '', url: '' }]);
  };

  const handleHistoryChange = (index: number, field: 'date' | 'url', value: string) => {
    const updated = [...formHistory];
    updated[index][field] = value;
    setFormHistory(updated);
  };

  const handleRemoveHistoryRow = (index: number) => {
    setFormHistory(formHistory.filter((_, i) => i !== index));
  };

  // ↕️ 히스토리 순서 위/아래 이동 함수
  const handleMoveHistoryRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formHistory.length) return;
    
    const updated = [...formHistory];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormHistory(updated);
  };

  const handleStartEdit = (song: Song) => {
    setEditingSong(song);
    setFormArtist(song.artist);
    setFormTitle(song.title);
    setFormGenre(song.genre);
    setFormHistory(song.history || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArtist || !formTitle) return alert('입력란을 확인해주세요.');

    // 빈 항목 필터링
    const cleanHistory = formHistory.filter(item => item.date.trim() || item.url.trim());

    try {
      if (editingSong) {
        await submitSongServer({
          id: editingSong.id,
          artist: formArtist,
          title: formTitle,
          genre: formGenre,
          history: cleanHistory,
          isEdit: true
        });
      } else {
        await submitSongServer({
          artist: formArtist,
          title: formTitle,
          genre: formGenre,
          history: cleanHistory,
          isEdit: false
        });
      }

      resetForm();
      fetchSongs();
      alert('성공적으로 반영되었습니다!');
    } catch (error) {
      console.error(error);
      alert('작업 중 오류가 발생했습니다.');
    }
  };

  const isNew = (dateStr: string) => {
    if (!dateStr) return false;
    const created = new Date(dateStr);
    const now = new Date();
    return now.getTime() - created.getTime() < 30 * 24 * 60 * 60 * 1000;
  };

  // 필터링 & 정렬 로직
  const filtered = songs.filter(s => {
    if (specialFilter === 'new') {
      if (!isNew(s.created_at)) return false;
    } else if (specialFilter === 'top100') {
      const validHistoryCount = s.history?.filter(h => h.url && h.url.trim() !== '').length || 0;
      if (validHistoryCount === 0) return false;
    } else {
      const isInitialMatch = selectedInitial === '전체' || getInitialSound(s.artist) === selectedInitial;
      const isGenreMatch = selectedGenre === '전체' || s.genre === selectedGenre;
      if (!isInitialMatch || !isGenreMatch) return false;
    }

    const cleanSearch = searchTerm.replace(/\s+/g, '').toLowerCase();
    const isSearchMatch = !cleanSearch || (s.artist + s.title).replace(/\s+/g, '').toLowerCase().includes(cleanSearch);
    return isSearchMatch;
  }).sort((a, b) => {
    if (specialFilter === 'top100') {
      const countA = a.history?.filter(h => h.url && h.url.trim() !== '').length || 0;
      const countB = b.history?.filter(h => h.url && h.url.trim() !== '').length || 0;
      if (countA !== countB) {
        return countB - countA;
      }
    }

    const artistCompare = a.artist.localeCompare(b.artist, 'ko');
    if (artistCompare !== 0) return artistCompare;
    return a.title.localeCompare(b.title, 'ko');
  }).slice(0, specialFilter === 'top100' ? 100 : undefined);

  // 🎲 랜덤 노래 뽑기 로직 (선택한 대상 범위 및 장르 반영)
  const handlePickRandomSong = () => {
    let pool = songs;

    // 1. 모달에서 선택한 대상 (전체 노래 / NEW / TOP 100) 필터링
    if (randomTarget === 'new') {
      pool = pool.filter(s => isNew(s.created_at));
    } else if (randomTarget === 'top100') {
      pool = pool
        .filter(s => (s.history?.filter(h => h.url && h.url.trim() !== '').length || 0) > 0)
        .sort((a, b) => {
          const countA = a.history?.filter(h => h.url && h.url.trim() !== '').length || 0;
          const countB = b.history?.filter(h => h.url && h.url.trim() !== '').length || 0;
          return countB - countA;
        })
        .slice(0, 100);
    }

    // 2. 모달에서 선택한 장르 필터링
    if (randomGenre !== '전체') {
      pool = pool.filter(s => s.genre === randomGenre);
    }

    if (pool.length === 0) {
      alert('조건에 해당하는 곡이 없습니다!');
      setPickedSong(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    setPickedSong(pool[randomIndex]);
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-sans">목록을 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FD] text-[#1D1D1F] pb-10 font-sans relative">
      
      {/* 1. 메인 랜딩 화면 */}
      {!showList ? (
        <section className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-4xl md:max-w-5xl mx-auto">
          <div className="mb-6 space-y-4 flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
              <span>🎧</span>
              <span>고운이 LIVE LIST</span>
            </h1>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <a
                href="https://www.sooplive.com/station/kjnw7643"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-sm"
              >
                <img src="/soop-icon.png" alt="SOOP" className="h-5 w-auto object-contain shrink-0" />
                <span className="text-gray-900 font-bold text-sm sm:text-base">SOOP</span>
              </a>

              <a
                href="https://www.youtube.com/@Singer_LGU"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-sm"
              >
                <svg className="w-5 h-5 fill-[#FF0000] shrink-0" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-gray-900 font-bold text-sm sm:text-base">YouTube</span>
              </a>
            </div>
          </div>

          <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 mb-8 bg-white group">
            <img src="/hero-pc.png" alt="가수 고운 메인 (PC)" className="hidden sm:block w-full h-auto max-h-[550px] object-cover transform group-hover:scale-[1.01] transition-transform duration-500" />
            <img src="/hero-mobile.png" alt="가수 고운 메인 (모바일)" className="block sm:hidden w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500" />
          </div>

          <button
            onClick={() => setShowList(true)}
            className="w-full sm:w-auto px-10 py-4 bg-indigo-100/80 hover:bg-indigo-200/90 text-indigo-950 font-extrabold rounded-2xl border border-indigo-200/60 shadow-lg shadow-indigo-100/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base md:text-xl flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span className="text-xl">🎵</span>
            <span>전체 노래 리스트 둘러보기</span>
          </button>
        </section>
      ) : (

        /* 2. 노래 리스트 화면 */
        <>
          <div className="sticky top-0 z-40 bg-[#F8F9FD]/95 backdrop-blur-md pt-5 pb-2 px-4 shadow-sm border-b border-gray-100">
            <div className="max-w-5xl mx-auto">
              <header className="flex justify-between items-center mb-4">
                <div 
                  onClick={() => {
                    setSearchTerm('');          
                    resetForm();
                    setSelectedInitial('전체'); 
                    setSelectedGenre('전체');
                    setSpecialFilter('all');
                    setShowList(false);
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
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                {/* 🌟 상단 특수 필터 (NEW / TOP 100 바로 오른쪽에 🎲 랜덤 노래 버튼 추가) */}
                <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSpecialFilter(prev => prev === 'new' ? 'all' : 'new')}
                    className={`px-3 py-1 rounded-lg text-xs md:text-sm font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      specialFilter === 'new'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    <span>✨ NEW</span>
                  </button>
                  <button
                    onClick={() => setSpecialFilter(prev => prev === 'top100' ? 'all' : 'top100')}
                    className={`px-3 py-1 rounded-lg text-xs md:text-sm font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      specialFilter === 'top100'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <span>🔥 TOP 100</span>
                  </button>

                  {/* 🎲 NEW, TOP 100 바로 오른쪽에 노출 */}
                  <button
                    onClick={() => {
                      setRandomTarget(specialFilter); // 현재 활성화된 메인 필터 상태를 모달 기본값으로 연동
                      setRandomGenre('전체');
                      setPickedSong(null);
                      setShowRandomModal(true);
                    }}
                    className="px-3 py-1 rounded-lg text-xs md:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                  >
                    <span>🎲 랜덤 노래</span>
                  </button>
                </div>

                {/* 초성 필터 (클릭 시 자동으로 전체 노래 모드로 전환하며 작동) */}
                <div className="flex overflow-x-auto gap-1 no-scrollbar">
                  {initials.map(init => (
                    <button 
                      key={init} 
                      onClick={() => handleInitialClick(init)} 
                      className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs md:text-sm font-semibold cursor-pointer ${
                        specialFilter === 'all' && selectedInitial === init
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {init}
                    </button>
                  ))}
                </div>

                {/* 장르 필터 (클릭 시 자동으로 전체 노래 모드로 전환하며 작동) */}
                <div className="flex overflow-x-auto gap-1.5 no-scrollbar border-t border-gray-50 pt-1.5">
                  {genres.map(genre => (
                    <button 
                      key={genre} 
                      onClick={() => handleGenreClick(genre)} 
                      className={`flex-shrink-0 px-3 py-1 rounded-md text-xs md:text-sm font-bold cursor-pointer ${
                        specialFilter === 'all' && selectedGenre === genre 
                          ? 'bg-black text-white' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 mt-6">
            {/* 🛠️ 관리자 모드 등록/수정 폼 */}
            {isAdminMode && (
              <div className="mb-6 bg-white p-5 rounded-2xl shadow-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-sm">
                    {editingSong ? '✏️ 곡 정보 수정 중' : '➕ 새 노래 추가하기'}
                  </h3>
                  {editingSong && (
                    <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">
                      수정 취소
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100 focus:border-indigo-500" placeholder="가수명" value={formArtist} onChange={e=>setFormArtist(e.target.value)} />
                    <input className="p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100 focus:border-indigo-500" placeholder="노래제목" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
                    <select className="p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100" value={formGenre} onChange={e=>setFormGenre(e.target.value)}>
                      {genres.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* 📺 동적 라이브 히스토리 입력 영역 */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-900">📺 방송 라이브 날짜 & 영상 링크</span>
                      <button 
                        type="button" 
                        onClick={handleAddHistoryRow}
                        className="text-xs bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        + 날짜 추가
                      </button>
                    </div>

                    {formHistory.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">등록된 라이브 영상 링크가 없습니다. [+ 날짜 추가]를 눌러보세요.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {formHistory.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="예: 2026-06-15" 
                              value={item.date} 
                              onChange={e => handleHistoryChange(idx, 'date', e.target.value)}
                              className="w-1/3 p-2 bg-white rounded-lg text-xs border border-gray-200 outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="영상/다시보기 URL (https://...)" 
                              value={item.url} 
                              onChange={e => handleHistoryChange(idx, 'url', e.target.value)}
                              className="flex-1 p-2 bg-white rounded-lg text-xs border border-gray-200 outline-none"
                            />
                            
                            {/* ↕️ 위로/아래로 이동 버튼 */}
                            <div className="flex flex-col shrink-0">
                              <button 
                                type="button" 
                                onClick={() => handleMoveHistoryRow(idx, 'up')}
                                disabled={idx === 0}
                                className={`text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 font-bold ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'}`}
                                title="위로"
                              >
                                ▲
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleMoveHistoryRow(idx, 'down')}
                                disabled={idx === formHistory.length - 1}
                                className={`text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 font-bold mt-0.5 ${idx === formHistory.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'}`}
                                title="아래로"
                              >
                                ▼
                              </button>
                            </div>

                            <button 
                              type="button" 
                              onClick={() => handleRemoveHistoryRow(idx)} 
                              className="text-xs text-red-500 font-bold px-2 py-2 bg-red-50 rounded-lg hover:bg-red-100 shrink-0"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm transition-colors mt-1">
                    {editingSong ? '수정 완료하기' : '곡 저장하기'}
                  </button>
                </form>
              </div>
            )}

            {/* 노래 카드 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filtered.length === 0 ? (
                <div className="col-span-full bg-white p-10 rounded-2xl text-center text-gray-400 font-bold">
                  조건에 맞는 곡이 없습니다.
                </div>
              ) : (
                filtered.map((song, index) => {
                  const validHistoryCount = song.history?.filter(h => h.url && h.url.trim() !== '').length || 0;

                  return (
                    <div 
                      key={song.id} 
                      className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-indigo-100 transition-all gap-2"
                    >
                      {/* 🎵 노래 정보 (클릭 시 상세 모달 열림) */}
                      <div 
                        onClick={() => setSelectedSongDetail(song)}
                        className="overflow-hidden flex-1 min-w-0 pr-1 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {/* 🔥 TOP 100 탭 선택 시 순위 뱃지 */}
                          {specialFilter === 'top100' && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded shrink-0">
                              {index + 1}위
                            </span>
                          )}

                          {/* ✨ NEW 뱃지 */}
                          {isNew(song.created_at) && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded shrink-0 animate-pulse">
                              NEW
                            </span>
                          )}

                          <h3 className="font-extrabold text-[16px] md:text-[18px] truncate text-gray-950 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                            {song.artist}
                          </h3>
                          <span className="text-[11px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-400 font-bold uppercase shrink-0">
                            {song.genre}
                          </span>

                          {/* 🎬 바로가기 영상 수 표시 */}
                          {validHistoryCount > 0 && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                              🎬 {validHistoryCount}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 font-semibold text-[14px] md:text-[16px] truncate ml-0.5 group-hover:text-indigo-900 transition-colors">
                          {song.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopySong(song)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            copiedId === song.id
                              ? 'bg-indigo-600 text-white shadow-sm scale-95'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:scale-95'
                          }`}
                        >
                          {copiedId === song.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                              <span>복사됨!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 fill-current opacity-70" viewBox="0 0 24 24">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                              </svg>
                              <span>복사</span>
                            </>
                          )}
                        </button>

                        {isAdminMode && (
                          <div className="flex gap-1 pl-1 border-l border-gray-100">
                            <button onClick={() => handleStartEdit(song)} className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-lg text-xs">✏️</button>
                            <button onClick={async () => { if (confirm('삭제할까요?')) { await deleteSongServer(song.id); await fetchSongs(); router.refresh(); } }} className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 rounded-lg text-xs">🗑️</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {showList && showTopBtn && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center font-black text-xs z-50 animate-bounce">TOP</button>
      )}

      {/* 🎲 랜덤 노래 뽑기 모달 (대상 범위 + 장르 선택) */}
      {showRandomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 relative">
            <button 
              onClick={() => setShowRandomModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-sm w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-gray-900 mb-4 text-center flex items-center justify-center gap-1.5">
              <span>🎲</span>
              <span>랜덤 노래 추천</span>
            </h3>

            {/* 1. 모달 내부 - 대상 노래 선택 버튼 (전체 노래 / NEW / TOP 100) */}
            <div className="mb-4">
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5 ml-1">추첨 대상</label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => setRandomTarget('all')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    randomTarget === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🎵 전체 노래
                </button>
                <button
                  type="button"
                  onClick={() => setRandomTarget('new')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    randomTarget === 'new'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  ✨ NEW
                </button>
                <button
                  type="button"
                  onClick={() => setRandomTarget('top100')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    randomTarget === 'top100'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🔥 TOP 100
                </button>
              </div>
            </div>

            {/* 2. 모달 내부 - 장르 선택 드롭다운 (우측 화살표 표시) */}
            <div className="mb-4">
              <label className="block text-xs font-extrabold text-gray-700 mb-1.5 ml-1">장르</label>
              <div className="relative">
                <select
                  value={randomGenre}
                  onChange={(e) => setRandomGenre(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer pr-10"
                >
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* 3. 추첨된 결과 화면 */}
            {pickedSong && (
              <div className="bg-indigo-50/80 p-4 rounded-xl border border-indigo-100 my-4 text-center animate-fadeIn">
                <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {pickedSong.genre}
                </span>
                <h4 className="text-lg font-black text-gray-900 mt-2 tracking-tight">{pickedSong.title}</h4>
                <p className="text-sm font-bold text-indigo-700 mt-0.5">{pickedSong.artist}</p>
              </div>
            )}

            <button
              onClick={handlePickRandomSong}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer mt-2"
            >
              {pickedSong ? '🔄 다시 뽑기' : '🎲 랜덤 노래 뽑기'}
            </button>
          </div>
        </div>
      )}

      {/* 🎬 노래 상세 보기 및 라이브 영상 이동 모달 */}
      {selectedSongDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 text-center relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedSongDetail(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-sm w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"
            >
              ✕
            </button>

            <div className="shrink-0 mb-3 pt-1">
              <span className="text-[11px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase">
                {selectedSongDetail.genre}
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-2 tracking-tight">{selectedSongDetail.title}</h3>
              <p className="text-sm font-bold text-gray-500">{selectedSongDetail.artist}</p>
            </div>

            <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2 no-scrollbar text-left">
              <p className="text-xs font-bold text-gray-400 px-1 mb-1">
                🎤 방송 라이브 히스토리 ({selectedSongDetail.history?.length || 0}회)
              </p>

              {!selectedSongDetail.history || selectedSongDetail.history.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <p className="text-xs text-gray-400 font-semibold">아직 등록된 방송 다시보기 링크가 없습니다.</p>
                </div>
              ) : (
                selectedSongDetail.history.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100 hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500 font-bold text-xs">📅</span>
                      <span className="text-xs font-extrabold text-gray-800">
                        {item.date || '날짜 미지정'}
                      </span>
                    </div>

                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm shrink-0"
                      >
                        <span>영상 보기</span>
                        <span className="text-[10px]">➔</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-bold">링크 없음</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedSongDetail(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-xs mt-3 shrink-0"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 📋 SOOP iframe 차단 대응 복사 모달 */}
      {copyModalText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-gray-100 text-center">
            <h3 className="text-base font-black text-gray-900 mb-1">📋 신청곡 복사</h3>
            <p className="text-xs text-gray-500 mb-3">
              [전체 선택 & 복사] 버튼을 누르면<br />
              즉시 클립보드에 복사됩니다!
            </p>
            
            <input
              id="copy-input-element"
              type="text"
              readOnly
              value={copyModalText}
              onClick={handleSelectText}
              className="w-full p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold rounded-xl text-center text-sm outline-none mb-3 focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setCopyModalText(null)} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                닫기
              </button>
              <button 
                onClick={handleSelectText} 
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isModalSelected
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isModalSelected ? '✓ 복사 완료!' : '전체 선택 & 복사'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 관리자 로그인 모달 */}
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
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-xl font-bold text-sm">취소</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}