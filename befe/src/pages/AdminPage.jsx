import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import AdminGameForm from '../components/admin/AdminGameForm';
import AdminGamesTable from '../components/admin/AdminGamesTable';
import AdminReviewList from '../components/admin/AdminReviewList';

export default function AdminPage() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [apiBase, setApiBase] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ…');
  const [messageType, setMessageType] = useState('');
  const [toast, setToast] = useState(null);
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', genre: '', platform: '', year: new Date().getFullYear(), image: '', store_name: '', store_url: '', description: '' });
  const toastTimer = useRef(null);

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session?.access_token || ''}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'ทำรายการไม่สำเร็จ');
    return data;
  }, [apiBase, session]);

  const showMessage = (text, type = '') => {
    setMessage(text); setMessageType(type);
    if (type === 'success' || type === 'error') {
      setToast({ text, type, visible: true }); clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setToast(current => current ? { ...current, visible: false } : null);
        toastTimer.current = setTimeout(() => setToast(null), 650);
      }, 2800);
    }
  };

  const loadGames = useCallback(async () => { setGamesLoading(true); try { const data = await api('/api/admin/games'); setGames(data.games || []); } finally { setGamesLoading(false); } }, [api]);
  const loadReviews = useCallback(async () => { setReviewsLoading(true); try { const data = await api('/api/admin/reviews'); setReviews(data.reviews || []); } finally { setReviewsLoading(false); } }, [api]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/config'); const config = await response.json();
        if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey) throw new Error(config.error || 'ยังไม่ได้ตั้งค่า Supabase');
        if (!window.supabase?.createClient) throw new Error('โหลด Supabase Auth ไม่สำเร็จ');
        const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        const auth = await supabase.auth.getSession();
        if (auth.error) throw auth.error;
        if (!active) return;
        setClient(supabase); setSession(auth.data.session); setApiBase(config.apiBase || '');
        supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
      } catch (error) { if (active) showMessage(error.message, 'error'); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) { showMessage('ต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลก่อน', 'error'); return; }
    (async () => {
      try {
        await api('/api/admin/me');
        setMessage(''); setMessageType('');
        await Promise.all([loadGames(), loadReviews()]);
      } catch (error) { showMessage(error.message, 'error'); }
    })();
  }, [ready, session, api, loadGames, loadReviews]);

  const setField = event => setForm(current => ({ ...current, [event.target.name]: event.target.name === 'year' ? event.target.value : event.target.value }));
  const resetForm = () => { setForm({ title: '', genre: '', platform: '', year: new Date().getFullYear(), image: '', store_name: '', store_url: '', description: '' }); setEditingId(null); };
  const editGame = game => {
    setEditingId(game.id); setForm({ title: game.title, genre: game.genre, platform: game.platform, year: game.year, image: game.image, store_name: game.store_name || '', store_url: game.store_url || '', description: game.description });
    document.getElementById('gameFormTitle')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const saveGame = async event => {
    event.preventDefault(); setBusy(true);
    const data = { ...form, year: Number(form.year) };
    try {
      await api(editingId ? `/api/admin/games/${editingId}` : '/api/admin/games', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(data) });
      showMessage(editingId ? 'บันทึกการแก้ไขเกมแล้ว' : 'เพิ่มเกมใหม่เรียบร้อยแล้ว', 'success'); resetForm(); await loadGames();
    } catch (error) { showMessage(error.message, 'error'); }
    finally { setBusy(false); }
  };
  const deleteGame = async game => {
    if (!window.confirm(`ลบ ${game.title} และคะแนน รีวิว และเกมโปรดที่เกี่ยวข้องทั้งหมดหรือไม่?`)) return;
    try { await api(`/api/admin/games/${game.id}`, { method: 'DELETE' }); await Promise.all([loadGames(), loadReviews()]); showMessage('ลบเกมแล้ว', 'success'); }
    catch (error) { showMessage(error.message, 'error'); }
  };
  const deleteReview = async review => {
    if (!window.confirm('นำรีวิวนี้ออกจากหน้าเว็บไซต์หรือไม่?')) return;
    try { await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: 'DELETE' }); await loadReviews(); showMessage('นำรีวิวออกแล้ว', 'success'); }
    catch (error) { showMessage(error.message, 'error'); }
  };

  return (
    <>
      <AdminHeader
        email={session?.user?.email}
        onLogout={async () => { await client?.auth.signOut(); navigate('/'); }}
      />
      <main className="admin-main admin-page-enter">
        <div className="eyebrow muted">PLAYLOG CONTROL ROOM</div>
        <h1>จัดการระบบ<span className="accent">.</span></h1>
        <p className="admin-intro">เพิ่มและแก้ไขข้อมูลเกม พร้อมตรวจสอบหรือนำรีวิวที่ไม่เหมาะสมออก</p>
        {message && <div className={`admin-message ${messageType}`}>{message}</div>}
        {session && messageType !== 'error' && (
          <div className="admin-workspace">
            <section className="admin-panel">
              <AdminGameForm editingId={editingId} form={form} setField={setField} saveGame={saveGame} busy={busy} resetForm={resetForm} />
              <AdminGamesTable games={games} gamesLoading={gamesLoading} editGame={editGame} deleteGame={deleteGame} />
            </section>
            <AdminReviewList reviews={reviews} reviewsLoading={reviewsLoading} deleteReview={deleteReview} />
          </div>
        )}
      </main>
      {toast && <div className={`admin-toast ${toast.type} ${toast.visible ? 'visible' : 'is-hiding'}`} role="status" aria-live="polite">{toast.text}</div>}
    </>
  );
}


