import { useState } from 'react';
import PublicForm from './pages/PublicForm';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ClassTeacherPortal from './pages/ClassTeacherPortal';
import LeadTeacherPortal from './pages/LeadTeacherPortal';
import { BookOpen, LayoutDashboard, Shield, ClipboardCheck, Star } from 'lucide-react';

type Page = 'form' | 'class-review' | 'lead-review' | 'admin' | 'super-login' | 'super-admin';

export default function App() {
  const [page, setPage] = useState<Page>('form');
  const [superLoggedIn, setSuperLoggedIn] = useState(false);

  const goTo = (p: Page) => {
    if (p === 'super-admin' && !superLoggedIn) { setPage('super-login'); return; }
    setPage(p);
  };

  const handleSuperLogin = () => { setSuperLoggedIn(true); setPage('super-admin'); };
  const handleSuperLogout = () => { setSuperLoggedIn(false); setPage('form'); };

  const showNav = page !== 'super-login';

  return (
    <div className="min-h-screen">
      <div className={showNav ? 'pb-20' : ''}>
        {page === 'form' && <PublicForm />}
        {page === 'class-review' && <ClassTeacherPortal />}
        {page === 'lead-review' && <LeadTeacherPortal />}
        {page === 'admin' && <AdminDashboard />}
        {page === 'super-login' && <SuperAdminLogin onLogin={handleSuperLogin} />}
        {page === 'super-admin' && superLoggedIn && <SuperAdminDashboard onLogout={handleSuperLogout} />}
      </div>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
          <div className="max-w-xl mx-auto flex items-center">
            <NavBtn active={page === 'form'} onClick={() => goTo('form')}
              icon={<BookOpen className="w-4 h-4" />} label="Form" />
            <NavBtn active={page === 'class-review'} onClick={() => goTo('class-review')}
              icon={<ClipboardCheck className="w-4 h-4" />} label="Class" color="teal" />
            <NavBtn active={page === 'lead-review'} onClick={() => goTo('lead-review')}
              icon={<Star className="w-4 h-4" />} label="Lead" color="emerald" />
            <NavBtn active={page === 'admin'} onClick={() => goTo('admin')}
              icon={<LayoutDashboard className="w-4 h-4" />} label="Admin" />
            <div className="w-px h-8 bg-slate-200 flex-shrink-0" />
            <NavBtn active={page === 'super-admin'} onClick={() => goTo('super-admin')}
              icon={<Shield className="w-4 h-4" />} label="Super" accent />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavBtn({
  active, onClick, icon, label, accent, color,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean; color?: 'teal' | 'emerald';
}) {
  if (accent) {
    return (
      <button onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 px-2 text-[10px] font-bold transition-all duration-200 ${
          active ? 'text-[#1a3a6c] bg-[#eef0f8]' : 'text-slate-400 hover:text-[#1a3a6c] hover:bg-[#eef0f8]/60'}`}>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-[#1a3a6c] text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
          {icon}
        </span>
        <span className={active ? 'text-[#1a3a6c]' : ''}>{label}</span>
      </button>
    );
  }

  const activeColors = color === 'teal'
    ? 'text-teal-700 bg-teal-50/60'
    : color === 'emerald'
    ? 'text-emerald-800 bg-emerald-50/60'
    : 'text-blue-600 bg-blue-50/60';
  const activeBubble = color === 'teal'
    ? 'bg-teal-700 text-white shadow-md shadow-teal-200'
    : color === 'emerald'
    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-200'
    : 'bg-blue-600 text-white shadow-md shadow-blue-200';

  return (
    <button onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 px-2 text-[10px] font-semibold transition-all duration-200 ${
        active ? activeColors : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${active ? activeBubble : 'bg-slate-100 text-slate-400'}`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
