import { useState, useEffect, useCallback } from 'react';
import { supabase, ClassRecord, Teacher, KeyStage, KeyStageClass } from '../lib/supabase';
import {
  ClipboardCheck, LogOut, CheckCircle, Circle, ChevronDown,
  Calendar, Clock, AlertCircle, RefreshCw, ArrowRight, RotateCcw,
} from 'lucide-react';

type AuthState = 'login' | 'portal';
type Tab = 'pending' | 'all';

export default function ClassTeacherPortal() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [leadTeacherName, setLeadTeacherName] = useState('');
  const [leadTeacherId, setLeadTeacherId] = useState<string | null>(null);
  const [keyStageName, setKeyStageName] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [allRecords, setAllRecords] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('teachers').select('id,name,role,grade,pin,is_class_teacher,is_lead_teacher,assigned_lead_id')
      .eq('is_class_teacher', true).order('name')
      .then(({ data }) => { if (data) setTeachers(data as Teacher[]); });
  }, []);

  const lookupKeyStageLead = useCallback(async (grade: string): Promise<{ leadId: string | null; leadName: string; stageName: string }> => {
    const { data: ksc } = await supabase
      .from('key_stage_classes')
      .select('key_stage_id')
      .eq('grade_name', grade)
      .maybeSingle();
    if (!ksc) return { leadId: null, leadName: '', stageName: '' };
    const { data: stage } = await supabase
      .from('key_stages')
      .select('id,name,lead_teacher_id')
      .eq('id', (ksc as KeyStageClass).key_stage_id)
      .maybeSingle();
    if (!stage) return { leadId: null, leadName: '', stageName: '' };
    const ks = stage as KeyStage;
    if (!ks.lead_teacher_id) return { leadId: null, leadName: '', stageName: ks.name };
    const { data: lead } = await supabase
      .from('teachers')
      .select('name')
      .eq('id', ks.lead_teacher_id)
      .maybeSingle();
    return { leadId: ks.lead_teacher_id, leadName: lead?.name || '', stageName: ks.name };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const t = teachers.find(t => t.name === selectedName);
    if (!t) { setLoginError('Please select your name from the list.'); setLoggingIn(false); return; }
    if (!t.pin) { setLoginError('No PIN configured for your account. Contact the admin.'); setLoggingIn(false); return; }
    if (t.pin !== pin.trim()) { setLoginError('Incorrect PIN. Please try again.'); setLoggingIn(false); return; }
    if (!t.grade) { setLoginError('No class assigned to your account. Contact the admin.'); setLoggingIn(false); return; }
    setTeacher(t);

    const { leadId, leadName, stageName } = await lookupKeyStageLead(t.grade);
    setLeadTeacherId(leadId);
    setLeadTeacherName(leadName);
    setKeyStageName(stageName);

    setAuthState('portal');
    await fetchAll(t);
    setLoggingIn(false);
  };

  const fetchAll = useCallback(async (t: Teacher) => {
    setLoading(true);
    const { data } = await supabase
      .from('class_records')
      .select('*')
      .eq('grade', t.grade)
      .order('submitted_at', { ascending: false });
    if (data) setAllRecords(data as ClassRecord[]);
    setLoading(false);
  }, []);

  const pending = allRecords.filter(r => r.approval_status === 'pending');
  const displayed = tab === 'pending' ? pending : allRecords;

  // Check = forward record to the key stage's lead teacher
  const handleForward = async (record: ClassRecord) => {
    if (!leadTeacherId) return;
    setProcessingId(record.id);
    const now = new Date().toISOString();
    const { error } = await supabase.from('class_records').update({
      approval_status: 'class_approved',
      class_approved_by: teacher!.name,
      class_approved_at: now,
      assigned_lead_id: leadTeacherId,
    }).eq('id', record.id);
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === record.id
        ? { ...r, approval_status: 'class_approved' as const, class_approved_by: teacher!.name, class_approved_at: now, assigned_lead_id: leadTeacherId }
        : r));
    }
    setProcessingId(null);
  };

  // Uncheck = return record to pending
  const handleUnforward = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from('class_records').update({
      approval_status: 'pending',
      class_approved_by: null,
      class_approved_at: null,
      assigned_lead_id: null,
    }).eq('id', id);
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === id
        ? { ...r, approval_status: 'pending' as const, class_approved_by: '', class_approved_at: '', assigned_lead_id: null }
        : r));
    }
    setProcessingId(null);
  };

  const handleLogout = () => {
    setAuthState('login');
    setTeacher(null);
    setLeadTeacherName('');
    setLeadTeacherId(null);
    setKeyStageName('');
    setSelectedName('');
    setPin('');
    setAllRecords([]);
    setLoginError('');
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-200">
              <ClipboardCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Class Teacher Portal</h1>
            <p className="text-sm text-slate-500 mt-1">Review &amp; forward records for your class</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Name</label>
                <div className="relative">
                  <select value={selectedName} onChange={e => setSelectedName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600">
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600" />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
                </div>
              )}
              <button type="submit" disabled={loggingIn || !selectedName || !pin}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {loggingIn ? 'Verifying...' : 'Login'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">Contact admin if you need a PIN set up</p>
        </div>
      </div>
    );
  }

  const noLeadAssigned = !leadTeacherId;

  return (
    <div className="min-h-screen bg-[#eef0f8] pb-24">
      <header className="bg-teal-700 text-white sticky top-0 z-10 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Class Teacher Review</h1>
              <p className="text-xs text-teal-200">
                {teacher?.name} · Class {teacher?.grade}
                {keyStageName && <> · {keyStageName}</>}
                {leadTeacherName && <> · <ArrowRight className="w-3 h-3 inline mx-0.5" />{leadTeacherName}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => teacher && fetchAll(teacher)} className="text-teal-200 hover:text-white p-1 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-0 flex gap-1">
          <button onClick={() => setTab('pending')}
            className={`flex items-center px-4 py-2.5 text-xs transition-colors ${tab === 'pending' ? 'border-b-2 border-white text-white font-bold' : 'text-white/60 hover:text-white/80'}`}>
            Pending
            {pending.length > 0 && <span className="ml-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>}
          </button>
          <button onClick={() => setTab('all')}
            className={`flex items-center px-4 py-2.5 text-xs transition-colors ${tab === 'all' ? 'border-b-2 border-white text-white font-bold' : 'text-white/60 hover:text-white/80'}`}>
            All Records
            <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{allRecords.length}</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Warning when no lead teacher assigned to the key stage */}
        {noLeadAssigned && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No lead teacher assigned to {keyStageName || 'your key stage'}</p>
              <p className="text-xs text-amber-600 mt-0.5">Ask the admin to assign a lead teacher to your key stage. You cannot forward records until this is set.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-24">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-teal-300" />
            <p className="font-semibold text-slate-600">{tab === 'pending' ? 'All caught up!' : 'No records yet'}</p>
            <p className="text-sm mt-1 text-slate-400">
              {tab === 'pending' ? `No pending records for Class ${teacher?.grade}` : `No submissions found for Class ${teacher?.grade}`}
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
                onForward={() => handleForward(r)}
                onUnforward={() => handleUnforward(r.id)}
                processing={processingId === r.id}
                leadTeacherName={leadTeacherName}
                canForward={!noLeadAssigned}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordCard({
  record: r, expanded, onToggle, onForward, onUnforward,
  processing, leadTeacherName, canForward,
}: {
  record: ClassRecord; expanded: boolean; onToggle: () => void;
  onForward: () => void; onUnforward: () => void;
  processing: boolean; leadTeacherName: string; canForward: boolean;
}) {
  const isForwarded = r.approval_status === 'class_approved';
  const isTerminal = r.approval_status === 'approved' || r.approval_status === 'rejected';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-semibold text-slate-800 text-sm">{r.teacher_name}</span>
              {r.teacher_role && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{r.teacher_role}</span>}
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">{r.grade}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.subject}</span>
              <StatusBadge status={r.approval_status} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.record_date} — {r.day_of_week}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.record_time}</span>
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
            {r.class_approved_by && <DItem label="Forwarded By" value={r.class_approved_by} />}
            {r.lead_approved_by && <DItem label="Lead Approved By" value={r.lead_approved_by} />}
            {r.rejection_note && <DItem label="Rejection Reason" value={r.rejection_note} full />}
          </div>
        </div>
      )}

      {/* Forward / Unforward toggle — only for pending or class_approved records */}
      {!isTerminal && (
        <div className={`border-t px-5 py-3 flex items-center justify-between gap-3 ${isForwarded ? 'bg-teal-50/60 border-teal-100' : 'bg-slate-50/30 border-slate-100'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            {isForwarded
              ? <><CheckCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /><span className="text-teal-700 font-medium truncate">Forwarded to {leadTeacherName || 'Lead Teacher'}</span></>
              : <><Circle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate">Forward to {leadTeacherName || 'Lead Teacher'}</span></>
            }
          </div>
          {isForwarded ? (
            <button
              onClick={onUnforward}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" /> {processing ? '...' : 'Undo'}
            </button>
          ) : (
            <button
              onClick={onForward}
              disabled={processing || !canForward}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <CheckCircle className="w-3.5 h-3.5" /> {processing ? '...' : 'Check & Forward'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (!status || status === 'approved') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Approved</span>;
  if (status === 'pending') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
  if (status === 'class_approved') return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Forwarded</span>;
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
