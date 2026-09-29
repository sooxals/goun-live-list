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
  
  // 1️⃣ 새로고침 시 기존 리스트 화면 유지 (sessionStorage 감지)
  const [showList, setShowList] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('showList') === 'true';
    }
    return false;
  });

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
  const [isRandomCopied, setIsRandomCopied] = useState(false); // 🎲 랜덤모달 전용 복사 상태
  const [copyModalText, setCopyModalText] = useState<string | null>(null);
  const [isModalSelected, setIsModalSelected] = useState(false);

  // 🎵 곡 상세 보기 모달 State
  const [selectedSongDetail, setSelectedSongDetail] = useState<Song | null>(null);

  // 🎲 랜덤 노래 모달 State
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomTarget, setRandomTarget] = useState<'all' | 'new' | 'top100'>('all');
  const [randomGenre, setRandomGenre] = useState('전체');
  const [pickedSong, setPickedSong] = useState<Song | null>(null);

  const genres = ['전체', '가요', '트로트', 'POP', 'J-POP', '뮤지컬'];
  const initials = ['전체', '0-9', 'A-Z', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  // showList 변경 시 sessionStorage 업데이트
  const handleSetShowList = (val: boolean) => {
    setShowList(val);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('showList', String(val));
    }
  };

  // 3️⃣ 모달이 열려 있을 때 배경 스크롤 차단 (PC & 모바일 터치 슬라이드 대응)
  useEffect(() => {
    const isModalOpen = showRandomModal || selectedSongDetail !== null || copyModalText !== null || showLoginModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showRandomModal, selectedSongDetail, copyModalText, showLoginModal]);

  // 🌐 모바일 전용 외부 브라우저(Safari/Chrome) 강제 이동 함수
  const handleOpenExternal = () => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const userAgent = navigator.userAgent || navigator.vendor;

    if (/android/i.test(userAgent)) {
      const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert('주소가 복사되었습니다! Safari나 Chrome 앱을 열고 주소창에 붙여넣어 주세요.');
      }).catch(() => {
        alert('Safari나 Chrome 브라우저 주소창에 현재 주소를 복사해 접속해주세요.');
      });
      return;
    }

    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

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

  const handleCopySong = async (song: Song, isFromRandom = false) => {
    const textToCopy = `${song.artist} - ${song.title}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        if (isFromRandom) {
          setIsRandomCopied(true);
          setTimeout(() => setIsRandomCopied(false), 1500);
        } else {
          setCopiedId(song.id);
          setTimeout(() => setCopiedId(null), 1500);
        }
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

    const artistA = a.artist.trim();
    const artistB = b.artist.trim();
    const artistCompare = artistA.localeCompare(artistB, 'ko', { sensitivity: 'base' });
    
    if (artistCompare !== 0) return artistCompare;

    const titleA = a.title.trim();
    const titleB = b.title.trim();
    return titleA.localeCompare(titleB, 'ko', { sensitivity: 'base' });
  }).slice(0, specialFilter === 'top100' ? 100 : undefined);

  const handlePickRandomSong = () => {
    let pool = songs;

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
    setIsRandomCopied(false);
  };

  if (loading) return <div className="p-10 text-center text-zinc-400 font-sans bg-[#0F0F12] min-h-screen flex items-center justify-center">목록을 불러오는 중...</div>;

  return (
    <main className="min-h-screen bg-[#0F0F12] text-[#F3F4F6] pb-10 font-sans relative">
      
      {/* 1. 메인 랜딩 화면 */}
      {!showList ? (
        <section className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-4xl md:max-w-5xl mx-auto">
          {/* 🌐 모바일 랜딩 화면 상단: 다른 브라우저로 열기 버튼 */}
          <div className="w-full flex justify-end mb-2 sm:hidden">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-full border border-zinc-700/80 shadow-md transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>다른 브라우저로 열기</span>
            </button>
          </div>

          <div className="mb-6 space-y-4 flex flex-col items-center">
            <div className="max-w-[320px] sm:max-w-[450px] w-full px-2">
              <img 
                src="/main-title-logo.png" 
                alt="고운이 LIVE LIST" 
                className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
              />
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <a
                href="https://www.sooplive.com/station/kjnw7643"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-700/80 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md"
              >
                <img src="/soop-icon.png" alt="SOOP" className="h-5 w-auto object-contain shrink-0" />
                <span className="text-zinc-100 font-bold text-sm sm:text-base">SOOP</span>
              </a>

              <a
                href="https://www.youtube.com/@Singer_LGU"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-700/80 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md"
              >
                <img src="/youtube-icon.png" alt="YouTube" className="h-5 w-auto object-contain shrink-0" />
                <span className="text-zinc-100 font-bold text-sm sm:text-base">YouTube</span>
              </a>
            </div>
          </div>

          <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 mb-8 bg-zinc-900 group">
            <img src="/hero-pc.png" alt="가수 고운 메인 (PC)" className="hidden sm:block w-full h-auto max-h-[550px] object-cover transform group-hover:scale-[1.01] transition-transform duration-500" />
            <img src="/hero-mobile.png" alt="가수 고운 메인 (모바일)" className="block sm:hidden w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500" />
          </div>

          <button
            onClick={() => handleSetShowList(true)}
            className="w-full sm:w-auto px-9 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-100 font-semibold rounded-2xl border border-white/15 backdrop-blur-md shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base md:text-lg flex items-center justify-center cursor-pointer tracking-tight hover:border-white/30 hover:text-white"
          >
            <span>전체 노래 리스트 둘러보기</span>
          </button>
        </section>
      ) : (

        /* 2. 노래 리스트 화면 */
        <>
          {/* 상단 컨트롤 영역 */}
          <div className="pt-3 px-4 max-w-5xl mx-auto">
            
            {/* 메인 이동 버튼 & 관리자 설정 & 모바일 전용 다른 브라우저로 열기 */}
            <div className="flex justify-between items-center mb-2 px-0.5">
              <button 
                onClick={() => {
                  setSearchTerm('');          
                  resetForm();
                  setSelectedInitial('전체'); 
                  setSelectedGenre('전체');
                  setSpecialFilter('all');
                  handleSetShowList(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 font-bold text-xs md:text-sm rounded-xl transition-all active:scale-95 cursor-pointer shadow-md backdrop-blur-md"
                title="처음 화면으로 이동"
              >
                <span>←</span>
                <span>메인</span>
              </button>

              <div className="flex items-center gap-2">
                {/* 🌐 노래 리스트 상단: 모바일 전용 다른 브라우저로 열기 버튼 */}
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-md backdrop-blur-md sm:hidden"
                  title="다른 브라우저로 열기"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>다른 브라우저로 열기</span>
                </button>

                {isAdminMode && (
                  <>
                    <button onClick={changePassword} className="text-[10px] bg-zinc-800/80 text-zinc-300 border border-zinc-700 px-2 py-1 rounded font-bold">비번 변경</button>
                    <button onClick={resetNewTags} className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-1 rounded font-bold">NEW 초기화</button>
                    <button onClick={downloadCSV} className="text-[10px] bg-zinc-800/80 text-zinc-300 border border-zinc-700 px-2 py-1 rounded font-bold">CSV</button>
                  </>
                )}
                <button 
                  onClick={handleAdminToggle} 
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-all text-base rounded-lg hover:bg-zinc-800/80"
                  title="관리자 설정"
                >
                  {isAdminMode ? '✕' : '⚙️'}
                </button>
              </div>
            </div>

            {/* 타이틀 이미지 배너 */}
            <div className="w-full mb-3 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-900">
              <img 
                src="/title-banner.png" 
                alt="치명적인 보이스 치명적인 매력 이고운" 
                className="w-full h-auto object-cover block"
              />
            </div>

          </div>

          {/* NEW/TOP100 ➔ 초성 ➔ 장르 ➔ 검색창 고정 영역 */}
          <div className="sticky top-0 z-40 bg-[#0F0F12]/95 backdrop-blur-md py-2 px-4 shadow-xl border-b border-zinc-800/80">
            <div className="max-w-5xl mx-auto flex flex-col gap-2">
              
              <div className="flex flex-col gap-2 bg-zinc-900/90 p-2.5 rounded-xl shadow-md border border-zinc-800">
                
                {/* 1️⃣ NEW / TOP100 / 랜덤 버튼 행 */}
                <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-800/80 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSpecialFilter(prev => prev === 'new' ? 'all' : 'new')}
                    className={`px-3 py-1 rounded-lg text-xs md:text-sm font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      specialFilter === 'new'
                        ? 'bg-[#F8B195]/20 border border-[#F8B195]/50 text-[#F8B195] shadow-md backdrop-blur-md'
                        : 'bg-[#F8B195]/10 border border-[#F8B195]/20 text-[#F8B195]/70 hover:bg-[#F8B195]/20 hover:text-[#F8B195]'
                    }`}
                  >
                    <span>✨ NEW</span>
                  </button>
                  <button
                    onClick={() => setSpecialFilter(prev => prev === 'top100' ? 'all' : 'top100')}
                    className={`px-3 py-1 rounded-lg text-xs md:text-sm font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      specialFilter === 'top100'
                        ? 'bg-[#F6D55C]/20 border border-[#F6D55C]/50 text-[#F6D55C] shadow-md backdrop-blur-md'
                        : 'bg-[#F6D55C]/10 border border-[#F6D55C]/20 text-[#F6D55C]/70 hover:bg-[#F6D55C]/20 hover:text-[#F6D55C]'
                    }`}
                  >
                    <span>🔥 TOP 100</span>
                  </button>

                  <button
                    onClick={() => {
                      setRandomTarget(specialFilter);
                      setRandomGenre('전체');
                      setPickedSong(null);
                      setIsRandomCopied(false);
                      setShowRandomModal(true);
                    }}
                    className="px-3 py-1 rounded-lg text-xs md:text-sm font-bold bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/80 text-zinc-200 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 backdrop-blur-md"
                  >
                    <span>🎲 랜덤 노래</span>
                  </button>
                </div>

                {/* 2️⃣ 초성 필터 */}
                <div className="flex overflow-x-auto gap-1 no-scrollbar border-b border-zinc-800/80 pb-1">
                  {initials.map(init => (
                    <button 
                      key={init} 
                      onClick={() => handleInitialClick(init)} 
                      className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all ${
                        specialFilter === 'all' && selectedInitial === init
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold backdrop-blur-md shadow-sm' 
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {init}
                    </button>
                  ))}
                </div>

                {/* 3️⃣ 장르 필터 */}
                <div className="flex overflow-x-auto gap-1.5 no-scrollbar pt-0.5">
                  {genres.map(genre => (
                    <button 
                      key={genre} 
                      onClick={() => handleGenreClick(genre)} 
                      className={`flex-shrink-0 px-3 py-1 rounded-md text-xs md:text-sm font-semibold cursor-pointer transition-all ${
                        specialFilter === 'all' && selectedGenre === genre 
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold backdrop-blur-md shadow-sm' 
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4️⃣ 🔍 검색창 */}
              <div className="relative">
                <input 
                  className="w-full p-2.5 pl-10 pr-10 rounded-xl bg-zinc-900/90 border border-zinc-800 focus:border-zinc-600 text-zinc-100 placeholder-zinc-400 shadow-inner outline-none text-sm md:text-base transition-colors backdrop-blur-md" 
                  placeholder="찾고 싶은 노래나 가수를 입력하세요" 
                  value={searchTerm} 
                  onChange={e => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    if (val) {
                      setSelectedInitial('전체');
                      setSelectedGenre('전체');
                      setSpecialFilter('all');
                    }
                  }} 
                />
                <span className="absolute left-3.5 top-2.5 text-base md:text-lg opacity-60">🔍</span>

                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* 🎵 노래 카드 목록 */}
          <div className="max-w-5xl mx-auto px-4 mt-4">
            {/* 🛠️ 관리자 모드 폼 */}
            {isAdminMode && (
              <div className="mb-6 bg-zinc-900/90 p-5 rounded-2xl shadow-xl border border-zinc-700/80 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-zinc-200 text-sm">
                    {editingSong ? '✏️ 곡 정보 수정 중' : '➕ 새 노래 추가하기'}
                  </h3>
                  {editingSong && (
                    <button onClick={resetForm} className="text-xs text-rose-400 font-bold hover:underline">
                      수정 취소
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="p-3 bg-zinc-800/80 rounded-xl text-sm outline-none border border-zinc-700 text-zinc-100 focus:border-zinc-500" placeholder="가수명" value={formArtist} onChange={e=>setFormArtist(e.target.value)} />
                    <input className="p-3 bg-zinc-800/80 rounded-xl text-sm outline-none border border-zinc-700 text-zinc-100 focus:border-zinc-500" placeholder="노래제목" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
                    <select className="p-3 bg-zinc-800/80 rounded-xl text-sm outline-none border border-zinc-700 text-zinc-100" value={formGenre} onChange={e=>setFormGenre(e.target.value)}>
                      {genres.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300">📺 방송 라이브 날짜 & 영상 링크</span>
                      <button 
                        type="button" 
                        onClick={handleAddHistoryRow}
                        className="text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 font-bold px-2.5 py-1 rounded-lg transition-colors"
                      >
                        + 날짜 추가
                      </button>
                    </div>

                    {formHistory.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-2">등록된 라이브 영상 링크가 없습니다.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {formHistory.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="예: 2026-06-15" 
                              value={item.date} 
                              onChange={e => handleHistoryChange(idx, 'date', e.target.value)}
                              className="w-1/3 p-2 bg-zinc-900/90 text-zinc-100 rounded-lg text-xs border border-zinc-700 outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="영상 URL" 
                              value={item.url} 
                              onChange={e => handleHistoryChange(idx, 'url', e.target.value)}
                              className="flex-1 p-2 bg-zinc-900/90 text-zinc-100 rounded-lg text-xs border border-zinc-700 outline-none"
                            />
                            
                            <div className="flex flex-col shrink-0">
                              <button 
                                type="button" 
                                onClick={() => handleMoveHistoryRow(idx, 'up')}
                                disabled={idx === 0}
                                className={`text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700 font-bold ${idx === 0 ? 'opacity-30' : 'hover:bg-zinc-700'}`}
                              >
                                ▲
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleMoveHistoryRow(idx, 'down')}
                                disabled={idx === formHistory.length - 1}
                                className={`text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700 font-bold mt-0.5 ${idx === formHistory.length - 1 ? 'opacity-30' : 'hover:bg-zinc-700'}`}
                              >
                                ▼
                              </button>
                            </div>

                            <button 
                              type="button" 
                              onClick={() => handleRemoveHistoryRow(idx)} 
                              className="text-xs text-rose-400 font-bold px-2 py-2 bg-rose-950/50 rounded-lg hover:bg-rose-900/50 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 text-zinc-200 p-3 rounded-xl font-bold text-sm transition-colors mt-1 cursor-pointer">
                    {editingSong ? '수정 완료하기' : '곡 저장하기'}
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filtered.length === 0 ? (
                <div className="col-span-full bg-zinc-900/90 p-10 rounded-2xl text-center text-zinc-500 font-bold border border-zinc-800">
                  조건에 맞는 곡이 없습니다.
                </div>
              ) : (
                filtered.map((song, index) => {
                  const validHistoryCount = song.history?.filter(h => h.url && h.url.trim() !== '').length || 0;

                  return (
                    <div 
                      key={song.id} 
                      className="bg-zinc-900/90 px-4 py-3 rounded-xl shadow-md flex items-center justify-between border border-zinc-800/80 hover:border-zinc-700 transition-all gap-2 group"
                    >
                      <div 
                        onClick={() => setSelectedSongDetail(song)}
                        className="overflow-hidden flex-1 min-w-0 pr-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          {specialFilter === 'top100' && (
                            <span className="px-1.5 py-0.5 bg-[#F6D55C]/20 border border-[#F6D55C]/30 text-[#F6D55C] text-[10px] font-extrabold rounded shrink-0">
                              {index + 1}위
                            </span>
                          )}

                          {isNew(song.created_at) && (
                            <span className="px-1.5 py-0.5 bg-[#F8B195]/20 border border-[#F8B195]/40 text-[#F8B195] text-[10px] font-extrabold rounded shrink-0 animate-pulse">
                              NEW
                            </span>
                          )}

                          <h3 className="font-bold text-[16px] md:text-[18px] truncate text-[#F4F4F6] tracking-tight leading-tight transition-colors">
                            {song.artist}
                            {isNew(song.created_at) && (
                              <span className="inline-block ml-1 text-[#F8B195] text-[12px] opacity-75 animate-pulse drop-shadow-[0_0_4px_rgba(248,177,149,0.3)]">
                                ✨
                              </span>
                            )}
                          </h3>
                          <span className="text-[11px] bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-400 font-bold uppercase shrink-0">
                            {song.genre}
                          </span>

                          {validHistoryCount > 0 && (
                            <span className="text-[10px] bg-zinc-800/80 border border-zinc-700 text-zinc-300 font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                              🎬 {validHistoryCount}
                            </span>
                          )}
                        </div>

                        <p className="text-zinc-300 font-semibold text-[14px] md:text-[16px] truncate ml-0.5 group-hover:text-zinc-100 transition-colors">
                          {song.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopySong(song)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            copiedId === song.id
                              ? 'bg-zinc-700 border border-zinc-500 text-zinc-100 shadow-sm scale-95'
                              : 'bg-zinc-800/80 border border-zinc-700/80 hover:bg-zinc-700/80 text-zinc-200 active:scale-95'
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
                          <div className="flex gap-1 pl-1 border-l border-zinc-800">
                            <button onClick={() => handleStartEdit(song)} className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg text-xs">✏️</button>
                            <button onClick={async () => { if (confirm('삭제할까요?')) { await deleteSongServer(song.id); await fetchSongs(); router.refresh(); } }} className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 rounded-lg text-xs">🗑️</button>
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
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 w-12 h-12 bg-zinc-800/80 border border-zinc-600 text-zinc-200 rounded-full shadow-2xl backdrop-blur-md flex items-center justify-center font-bold text-xs z-50 animate-bounce cursor-pointer">TOP</button>
      )}

      {/* 🎲 2️⃣ 랜턴 노래 모달 (복사 버튼 추가됨) */}
      {showRandomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 relative backdrop-blur-md">
            <button 
              onClick={() => setShowRandomModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 font-bold text-sm w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-zinc-100 mb-4 text-center flex items-center justify-center gap-1.5">
              <span>🎲</span>
              <span>랜덤 노래 추천</span>
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 ml-1">추첨 대상</label>
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRandomTarget('all')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    randomTarget === 'all'
                      ? 'bg-zinc-700/50 border border-zinc-500 text-zinc-100 font-bold shadow-sm backdrop-blur-md'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  🎵 전체 노래
                </button>
                <button
                  type="button"
                  onClick={() => setRandomTarget('new')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    randomTarget === 'new'
                      ? 'bg-[#F8B195]/20 text-[#F8B195] border border-[#F8B195]/40 font-bold shadow-sm backdrop-blur-md'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  ✨ NEW
                </button>
                <button
                  type="button"
                  onClick={() => setRandomTarget('top100')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    randomTarget === 'top100'
                      ? 'bg-[#F6D55C]/20 text-[#F6D55C] border border-[#F6D55C]/40 font-bold shadow-sm backdrop-blur-md'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  🔥 TOP 100
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 ml-1">장르</label>
              <div className="relative">
                <select
                  value={randomGenre}
                  onChange={(e) => setRandomGenre(e.target.value)}
                  className="w-full p-3 bg-zinc-950/80 border border-zinc-800 text-zinc-100 font-medium rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-zinc-600 cursor-pointer pr-10"
                >
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {pickedSong && (
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-700/80 my-4 text-center flex flex-col items-center">
                <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold px-2 py-0.5 rounded-full uppercase">
                  {pickedSong.genre}
                </span>
                <p className="text-xs font-semibold text-zinc-400 mt-2">{pickedSong.artist}</p>
                <h4 className="text-base font-bold text-zinc-100 mt-0.5 tracking-tight">{pickedSong.title}</h4>

                {/* 📋 추첨된 노래 전용 복사 버튼 (기존 동일 스타일) */}
                <button
                  onClick={() => handleCopySong(pickedSong, true)}
                  className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isRandomCopied
                      ? 'bg-zinc-700 border border-zinc-500 text-zinc-100 shadow-sm scale-95'
                      : 'bg-zinc-800/80 border border-zinc-700/80 hover:bg-zinc-700/80 text-zinc-200 active:scale-95'
                  }`}
                >
                  {isRandomCopied ? (
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
              </div>
            )}

            <button
              onClick={handlePickRandomSong}
              className="w-full bg-zinc-800/80 border border-zinc-600 hover:bg-zinc-700/80 text-zinc-200 py-3 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer mt-2 backdrop-blur-md"
            >
              {pickedSong ? '🔄 다시 뽑기' : '🎲 랜덤 노래 뽑기'}
            </button>
          </div>
        </div>
      )}

      {/* 🎬 3️⃣ 히스토리 모달 */}
{selectedSongDetail && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div className="bg-zinc-900/90 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 text-center relative max-h-[90vh] flex flex-col backdrop-blur-md">
      <button 
        onClick={() => setSelectedSongDetail(null)}
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 font-bold text-sm w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center"
      >
        ✕
      </button>

      {/* 🎵 노래 정보 */}
      <div className="shrink-0 mb-3 pt-1">
        <span className="text-[11px] bg-zinc-800/80 text-zinc-300 border border-zinc-700 font-bold px-2.5 py-1 rounded-full uppercase">
          {selectedSongDetail.genre}
        </span>
        <p className="text-sm font-semibold text-zinc-400 mt-2.5">{selectedSongDetail.artist}</p>
        <h3 className="text-lg font-bold text-zinc-100 mt-0.5 tracking-tight">{selectedSongDetail.title}</h3>
      </div>

      {/* 💡 영상보기 링크 안내 박스 */}
      <div className="bg-zinc-950/90 p-3 rounded-xl border border-zinc-800/80 text-left mb-3 shrink-0">
        <div className="mb-1.5 pb-1 border-b border-zinc-800/60 flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-amber-400/90 flex items-center gap-1">
            <span>💡</span>
            <span>영상보기 링크 안내</span>
          </p>
          <p className="text-[12px] text-zinc-400 font-normal">
            ※ 2026-06-01 기점 다시보기 보존 기준 변경
          </p>
        </div>

        <ul className="text-[12px] text-zinc-300 space-y-0.5 pl-0.5">
          <li>• <span className="font-semibold text-zinc-100">2026.06.01 이전:</span> LIVE 방송 다시보기</li>
          <li>• <span className="font-semibold text-zinc-100">2026.06.01 이후:</span> 해당 노래 클립</li>
        </ul>
      </div>

      {/* 🎤 방송 라이브 히스토리 리스트 */}
      <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2 no-scrollbar text-left">
        <p className="text-xs font-bold text-zinc-400 px-1 mb-1">
          🎤 방송 라이브 히스토리 ({selectedSongDetail.history?.length || 0}회)
        </p>

        {!selectedSongDetail.history || selectedSongDetail.history.length === 0 ? (
          <div className="bg-zinc-950/80 p-6 rounded-xl text-center border border-zinc-800">
            <p className="text-xs text-zinc-500 font-semibold">아직 등록된 방송 다시보기 링크가 없습니다.</p>
          </div>
        ) : (
          selectedSongDetail.history.map((item, idx) => (
            <div key={idx} className="bg-zinc-950/80 p-3 rounded-xl flex items-center justify-between border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-bold text-sm">📅</span>
                <span className="text-sm font-bold text-zinc-200">
                  {item.date || '날짜 미지정'}
                </span>
              </div>

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700/80 text-zinc-200 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm shrink-0 backdrop-blur-md"
                >
                  <span>영상 보기</span>
                  <span className="text-[10px]">➔</span>
                </a>
              ) : (
                <span className="text-[11px] text-zinc-500 font-bold">링크 없음</span>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setSelectedSongDetail(null)}
        className="w-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 py-2.5 rounded-xl font-bold text-xs mt-3 shrink-0"
      >
        닫기
      </button>
    </div>
  </div>
)}

      {/* 📋 SOOP iframe 차단 대응 복사 모달 */}
      {copyModalText && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-zinc-800 text-center backdrop-blur-md">
            <h3 className="text-base font-bold text-zinc-200 mb-1">📋 신청곡 복사</h3>
            <p className="text-xs text-zinc-400 mb-3">
              [전체 선택 & 복사] 버튼을 누르면<br />
              즉시 클립보드에 복사됩니다!
            </p>
            
            <input
              id="copy-input-element"
              type="text"
              readOnly
              value={copyModalText}
              onClick={handleSelectText}
              className="w-full p-3 bg-zinc-950/80 border border-zinc-800 text-zinc-200 font-bold rounded-xl text-center text-sm outline-none mb-3 focus:ring-2 focus:ring-zinc-600"
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setCopyModalText(null)} 
                className="flex-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                닫기
              </button>
              <button 
                onClick={handleSelectText} 
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isModalSelected
                    ? 'bg-emerald-500/80 text-emerald-100'
                    : 'bg-zinc-800/80 border border-zinc-600 text-zinc-200 hover:bg-zinc-700/80'
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800 backdrop-blur-md">
            <h3 className="text-base font-bold text-zinc-200 mb-2">🔐 관리자 로그인</h3>
            <p className="text-xs text-zinc-400 mb-4">관리자 비밀번호를 입력해주세요.</p>
            
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              <input 
                type="password" 
                className="p-3 bg-zinc-950/80 border border-zinc-800 text-zinc-100 rounded-xl text-sm outline-none focus:border-zinc-600" 
                placeholder="비밀번호" 
                value={inputPassword} 
                onChange={e => setInputPassword(e.target.value)} 
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 bg-zinc-800/80 text-zinc-300 p-3 rounded-xl font-bold text-sm">취소</button>
                <button type="submit" className="flex-1 bg-zinc-800/80 border border-zinc-600 text-zinc-200 p-3 rounded-xl font-bold text-sm hover:bg-zinc-700/80">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}