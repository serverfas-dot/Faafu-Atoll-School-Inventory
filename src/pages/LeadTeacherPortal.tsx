import { useState, useEffect, useCallback } from 'react';
import { supabase, ClassRecord, Teacher, KeyStage, KeyStageClass } from '../lib/supabase';
import {
  Star, LogOut, CheckCircle, XCircle, ChevronDown,
  Calendar, Clock, AlertCircle, RefreshCw, Shield,
} from 'lucide-react';

type AuthState = 'login' | 'portal';
type Tab = 'review' | 'all';

export default function LeadTeacherPortal() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [allRecords, setAllRecords] = useState<ClassRecord[]>([]);
  const [stageGradeNames, setStageGradeNames] = useState<string[]>([]);
  const [keyStageName, setKeyStageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('review');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    supabase.from('teachers').select('id,name,role,grade,pin,is_lead_teacher')
      .eq('is_lead_teacher', true).order('name')
      .then(({ data }) => { if (data) setTeachers(data as Teacher[]); });
  }, []);

  const lookupKeyStage = useCallback(async (leadTeacherId: string): Promise<{ stageName: string; gradeNames: string[] }> => {
    const { data: stage } = await supabase
      .from('key_stages')
      .select('id,name')
      .eq('lead_teacher_id', leadTeacherId)
      .maybeSingle();
    if (!stage) return { stageName: '', gradeNames: [] };
    const ks = stage as KeyStage;
    const { data: classes } = await supabase
      .from('key_stage_classes')
      .select('grade_name')
      .eq('key_stage_id', ks.id)
      .order('sort_order');
    return { stageName: ks.name, gradeNames: (classes as KeyStageClass[])?.map(c => c.grade_name) || [] };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const t = teachers.find(t => t.name === selectedName);
    if (!t) { setLoginError('Please select your name from the list.'); setLoggingIn(false); return; }
    if (!t.is_lead_teacher) { setLoginError('This account does not have Lead Teacher access.'); setLoggingIn(false); return; }
    if (!t.pin) { setLoginError('No PIN configured for your account. Contact the admin.'); setLoggingIn(false); return; }
    if (t.pin !== pin.trim()) { setLoginError('Incorrect PIN. Please try again.'); setLoggingIn(false); return; }
    setTeacher(t);

    const { stageName, gradeNames } = await lookupKeyStage(t.id);
    setKeyStageName(stageName);
    setStageGradeNames(gradeNames);

    setAuthState('portal');
    await fetchAll(gradeNames);
    setLoggingIn(false);
  };

  const fetchAll = useCallback(async (gradeNames: string[]) => {
    setLoading(true);
    if (gradeNames.length === 0) {
      setAllRecords([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('class_records')
      .select('*')
      .in('grade', gradeNames)
      .order('submitted_at', { ascending: false });
    if (data) setAllRecords(data as ClassRecord[]);
    setLoading(false);
  }, []);

  const forReview = allRecords.filter(r => r.approval_status === 'class_approved');
  const displayed = tab === 'review' ? forReview : allRecords;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from('class_records').update({
      approval_status: 'approved',
      lead_approved_by: teacher!.name,
      lead_approved_at: new Date().toISOString(),
    }).eq('id', id);
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === id
        ? { ...r, approval_status: 'approved' as const, lead_approved_by: teacher!.name, lead_approved_at: new Date().toISOString() }
        : r));
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!rejectNote.trim()) return;
    setProcessingId(id);
    const { error } = await supabase.from('class_records').update({
      approval_status: 'rejected',
      rejection_note: rejectNote.trim(),
    }).eq('id', id);
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === id
        ? { ...r, approval_status: 'rejected' as const, rejection_note: rejectNote.trim() }
        : r));
      setRejectingId(null);
      setRejectNote('');
    }
    setProcessingId(null);
  };

  const handleLogout = () => {
    setAuthState('login');
    setTeacher(null);
    setSelectedName('');
    setPin('');
    setAllRecords([]);
    setStageGradeNames([]);
    setKeyStageName('');
    setLoginError('');
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Lead Teacher Portal</h1>
            <p className="text-sm text-slate-500 mt-1">Final approval — your key stage classes</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Name</label>
                <div className="relative">
                  <select value={selectedName} onChange={e => setSelectedName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700">
                    <option value="">— Select your name —</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">PIN</label>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
                </div>
              )}
              <button type="submit" disabled={loggingIn || !selectedName || !pin}
                className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {loggingIn ? 'Verifying...' : 'Login'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">Lead Teacher access required for this portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef0f8] pb-24">
      <header className="bg-emerald-800 text-white sticky top-0 z-10 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Lead Teacher Review</h1>
              <p className="text-xs text-emerald-200">
                {teacher?.name}
                {keyStageName && <> · {keyStageName}</>}
                {stageGradeNames.length > 0 && <> · {stageGradeNames.length} classes</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAll(stageGradeNames)} className="text-emerald-200 hover:text-white p-1 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-0 flex gap-1">
          <TabBtn active={tab === 'review'} onClick={() => setTab('review')}>
            For Review
            {forReview.length > 0 && (
              <span className="ml-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{forReview.length}</span>
            )}
          </TabBtn>
          <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>
            All Records
            <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{allRecords.length}</span>
          </TabBtn>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {stageGradeNames.length === 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No key stage assigned</p>
              <p className="text-xs text-amber-600 mt-0.5">You are not assigned as the lead teacher for any key stage. Ask the admin to assign you to a key stage in the Structure tab.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-24">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
            <p className="font-semibold text-slate-600">
              {tab === 'review' ? 'Nothing to review!' : 'No records yet'}
            </p>
            <p className="text-sm mt-1 text-slate-400">
              {tab === 'review' ? 'No records awaiting final approval' : 'No submissions found for your key stage classes'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(r => (
              <RecordCard
                key={r.id}
                record={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(id => id === r.id ? null : r.id)}
                onApprove={() => handleApprove(r.id)}
                isRejecting={rejectingId === r.id}
                rejectNote={rejectNote}
                setRejectNote={setRejectNote}
                onStartReject={() => { setRejectingId(r.id); setExpandedId(r.id); }}
                onConfirmReject={() => handleReject(r.id)}
                onCancelReject={() => { setRejectingId(null); setRejectNote(''); }}
                processing={processingId === r.id}
                showActions={r.approval_status === 'class_approved'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center px-4 py-2.5 text-xs transition-colors ${active ? 'border-b-2 border-white text-white font-bold' : 'text-white/60 hover:text-white/80'}`}>
      {children}
    </button>
  );
}

function RecordCard({
  record: r, expanded, onToggle, onApprove, isRejecting, rejectNote, setRejectNote,
  onStartReject, onConfirmReject, onCancelReject, processing, showActions,
}: {
  record: ClassRecord; expanded: boolean; onToggle: () => void;
  onApprove: () => void; isRejecting: boolean; rejectNote: string;
  setRejectNote: (v: string) => void; onStartReject: () => void;
  onConfirmReject: () => void; onCancelReject: () => void;
  processing: boolean; showActions: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-semibold text-slate-800 text-sm">{r.teacher_name}</span>
              {r.teacher_role && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{r.teacher_role}</span>}
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">{r.grade}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.subject}</span>
              <StatusBadge status={r.approval_status} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.record_date} — {r.day_of_week}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.record_time}</span>
              {r.class_approved_by && (
                <span className="flex items-center gap-1 text-teal-600">
                  <Shield className="w-3 h-3" /> {r.class_approved_by}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-4 bg-slate-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DItem label="Date" value={`${r.record_date} (${r.day_of_week})`} />
            <DItem label="Time" value={r.record_time} />
            <DItem label="Teacher" value={`${r.teacher_name}${r.teacher_role ? ` — ${r.teacher_role}` : ''}`} />
            <DItem label="Subject" value={r.subject} />
            {r.topic && <DItem label="Topic" value={r.topic} />}
            {r.remarks && <DItem label="Content Details" value={r.remarks} full />}
            {r.exit_note && <DItem label="Exit Note" value={r.exit_note} full />}
            {r.class_approved_by && (
              <DItem label="Class Approved By" value={`${r.class_approved_by}${r.class_approved_at ? ` · ${new Date(r.class_approved_at).toLocaleString()}` : ''}`} full />
            )}
            {r.lead_approved_by && (
              <DItem label="Final Approved By" value={`${r.lead_approved_by}${r.lead_approved_at ? ` · ${new Date(r.lead_approved_at).toLocaleString()}` : ''}`} full />
            )}
            {r.rejection_note && <DItem label="Rejection Reason" value={r.rejection_note} full />}
          </div>
        </div>
      )}

      {showActions && (
        isRejecting ? (
          <div className="border-t border-slate-100 px-5 py-4 bg-red-50/50 space-y-3">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Rejection Reason (required)</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
              placeholder="Explain why this record is being rejected..."
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 bg-white resize-none" />
            <div className="flex gap-2">
              <button onClick={onConfirmReject} disabled={!rejectNote.trim() || processing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-colors">
                <XCircle className="w-3.5 h-3.5" /> {processing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button onClick={onCancelReject} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-100 px-5 py-3 flex gap-2 justify-end bg-slate-50/30">
            <button onClick={onStartReject} disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button onClick={onApprove} disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> {processing ? 'Approving...' : 'Final Approve'}
            </button>
          </div>
        )
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (!status || status === 'approved') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Approved</span>;
  if (status === 'pending') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
  if (status === 'class_approved') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Class Approved</span>;
  return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Rejected</span>;
}

function DItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{value || '—'}</p>
    </div>
  );
}
