import { useState, useEffect, useCallback } from 'react';
import { supabase, ClassRecord } from '../lib/supabase';
import {
  LayoutDashboard, BookOpen, Users, Calendar, Search,
  RefreshCw, ChevronDown, Filter, Clock, Mail, FileText,
  CheckCircle, Star, GraduationCap,
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type TimeFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type ViewMode = 'all' | 'by-grade' | 'by-teacher';

export default function AdminDashboard() {
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Only fetch fully approved records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('class_records')
      .select('*')
      .eq('approval_status', 'approved')
      .order('record_date', { ascending: false });
    if (data) setRecords(data as ClassRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const grades = [...new Set(records.map(r => r.grade))].sort();
  const subjects = [...new Set(records.map(r => r.subject))].sort();
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const years = [...new Set(records.map(r => r.record_date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  const applyTime = (r: ClassRecord) => {
    if (timeFilter === 'daily' && filterDate) return r.record_date === filterDate;
    if (timeFilter === 'weekly' && filterWeek) {
      const [ws, we] = filterWeek.split('/');
      return r.record_date >= ws && r.record_date <= we;
    }
    if (timeFilter === 'monthly' && filterMonth && filterYear) return r.record_date?.startsWith(`${filterYear}-${filterMonth}`);
    if (timeFilter === 'yearly' && filterYear) return r.record_date?.startsWith(filterYear);
    return true;
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      (!q || r.teacher_name?.toLowerCase().includes(q) || r.grade?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q) || r.class_approved_by?.toLowerCase().includes(q) || r.lead_approved_by?.toLowerCase().includes(q) || r.remarks?.toLowerCase().includes(q)) &&
      (!filterGrade || r.grade === filterGrade) &&
      (!filterSubject || r.subject === filterSubject) &&
      (!filterDay || r.day_of_week === filterDay) &&
      applyTime(r)
    );
  });

  const byGrade = grades.reduce<Record<string, ClassRecord[]>>((acc, g) => {
    const recs = filtered.filter(r => r.grade === g);
    if (recs.length) acc[g] = recs;
    return acc;
  }, {});

  const byTeacher = [...new Set(filtered.map(r => r.teacher_name))].reduce<Record<string, ClassRecord[]>>((acc, t) => {
    acc[t] = filtered.filter(r => r.teacher_name === t);
    return acc;
  }, {});

  const toggle = (id: string) => setExpandedRows(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const uniqueClasses = [...new Set(records.map(r => r.grade))].length;
  const uniqueTeachers = [...new Set(records.map(r => r.teacher_name))].length;
  const uniqueSubjects = [...new Set(records.map(r => r.subject))].length;

  return (
    <div className="min-h-screen bg-[#eef0f8] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a3a6c] rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Fully Approved Class Records — First Semester 2026</p>
            </div>
          </div>
          <button onClick={fetchRecords} className="flex items-center gap-1.5 text-slate-400 hover:text-[#1a3a6c] text-xs font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Approved Records', val: records.length, icon: <FileText className="w-4 h-4" />, c: 'bg-green-50 text-green-600' },
            { label: 'Classes', val: uniqueClasses, icon: <GraduationCap className="w-4 h-4" />, c: 'bg-blue-50 text-blue-600' },
            { label: 'Teachers', val: uniqueTeachers, icon: <Users className="w-4 h-4" />, c: 'bg-amber-50 text-amber-600' },
            { label: 'Subjects', val: uniqueSubjects, icon: <BookOpen className="w-4 h-4" />, c: 'bg-violet-50 text-violet-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.c}`}>{s.icon}</div>
              <div className="text-2xl font-bold text-slate-800">{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher, class, subject, approver..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {(['all','by-grade','by-teacher'] as const).map(v => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${viewMode === v ? 'bg-white shadow text-[#1a3a6c]' : 'text-slate-500 hover:text-slate-700'}`}>
                    {v === 'all' ? 'All' : v === 'by-grade' ? 'By Class' : 'By Teacher'}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${showFilters ? 'bg-[#1a3a6c] text-white border-[#1a3a6c]' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            </div>
          </div>

          {/* Time filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all','daily','weekly','monthly','yearly'] as const).map(t => (
              <button key={t} onClick={() => setTimeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${timeFilter === t ? 'bg-[#1a3a6c] text-white border-[#1a3a6c]' : 'border-slate-200 text-slate-500 hover:border-[#1a3a6c]'}`}>
                {t === 'all' ? 'All Time' : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {timeFilter !== 'all' && (
            <div className="flex flex-wrap gap-2">
              {timeFilter === 'daily' && (
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30" />
              )}
              {timeFilter === 'weekly' && (
                <input type="week" value={filterWeek} onChange={e => {
                  const v = e.target.value;
                  if (!v) { setFilterWeek(''); return; }
                  const [year, w] = v.split('-W');
                  const weekNum = parseInt(w);
                  const jan1 = new Date(parseInt(year), 0, 1);
                  const dayOfWeek = jan1.getDay() || 7;
                  const weekStart = new Date(jan1);
                  weekStart.setDate(jan1.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setFilterWeek(`${fmt(weekStart)}/${fmt(weekEnd)}`);
                }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30" />
              )}
              {(timeFilter === 'monthly' || timeFilter === 'yearly') && (
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30">
                  <option value="">Year</option>
                  {years.map(y => <option key={y}>{y}</option>)}
                </select>
              )}
              {timeFilter === 'monthly' && (
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
              )}
            </div>
          )}

          {showFilters && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30">
                <option value="">All Classes</option>
                {grades.map(g => <option key={g}>{g}</option>)}
              </select>
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30">
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterDay} onChange={e => setFilterDay(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30">
                <option value="">All Days</option>
                {days.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Records */}
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'by-grade' ? (
          <GroupView groups={byGrade} expandedRows={expandedRows} toggle={toggle} groupLabel="Class" />
        ) : viewMode === 'by-teacher' ? (
          <GroupView groups={byTeacher} expandedRows={expandedRows} toggle={toggle} groupLabel="Teacher" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">Approved Records</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} of {records.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map((r, i) => <RecordRow key={r.id} record={r} index={i} expanded={expandedRows.has(r.id)} toggle={() => toggle(r.id)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupView({ groups, expandedRows, toggle, groupLabel }: {
  groups: Record<string, ClassRecord[]>;
  expandedRows: Set<string>;
  toggle: (id: string) => void;
  groupLabel: string;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(Object.keys(groups).slice(0, 1)));
  const toggleGroup = (g: string) => setOpenGroups(s => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([key, recs]) => (
        <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={() => toggleGroup(key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#eef0f8] rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#1a3a6c]" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">{key}</p>
                <p className="text-xs text-slate-400">{recs.length} record{recs.length !== 1 ? 's' : ''} · {groupLabel}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openGroups.has(key) ? 'rotate-180' : ''}`} />
          </button>
          {openGroups.has(key) && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {recs.map((r, i) => <RecordRow key={r.id} record={r} index={i} expanded={expandedRows.has(r.id)} toggle={() => toggle(r.id)} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ROW_COLORS = [
  { base: 'bg-white', hover: 'hover:bg-green-50/40', detail: 'bg-green-50/40', left: 'border-l-4 border-[#1a3a6c]' },
  { base: 'bg-green-50/20', hover: 'hover:bg-green-50/60', detail: 'bg-green-50/60', left: 'border-l-4 border-emerald-500' },
  { base: 'bg-teal-50/20', hover: 'hover:bg-teal-50/50', detail: 'bg-teal-50/50', left: 'border-l-4 border-teal-500' },
  { base: 'bg-cyan-50/20', hover: 'hover:bg-cyan-50/50', detail: 'bg-cyan-50/50', left: 'border-l-4 border-cyan-500' },
  { base: 'bg-blue-50/20', hover: 'hover:bg-blue-50/50', detail: 'bg-blue-50/50', left: 'border-l-4 border-blue-400' },
];

function RecordRow({ record: r, expanded, toggle, index }: { record: ClassRecord; expanded: boolean; toggle: () => void; index: number }) {
  const colors = ROW_COLORS[index % ROW_COLORS.length];
  return (
    <div className={`${colors.base} ${colors.hover} ${colors.left} transition-colors`}>
      <button onClick={toggle} className="w-full text-left px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Row 1: teacher + class + subject + approved badge */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="font-semibold text-slate-800 text-sm">{r.teacher_name}</span>
              {r.teacher_role && (
                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{r.teacher_role}</span>
              )}
              <span className="text-xs font-medium text-[#1a3a6c] bg-blue-50 px-1.5 py-0.5 rounded-full">{r.grade}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{r.subject}</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Approved
              </span>
            </div>
            {/* Row 2: date/time */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-1.5">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.record_date} — {r.day_of_week}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.record_time}</span>
              {r.contact_detail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.contact_detail}</span>}
            </div>
            {/* Row 3: approval chain */}
            <div className="flex flex-wrap gap-3 text-xs">
              {r.class_approved_by && (
                <span className="flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle className="w-3 h-3" /> Checked by: {r.class_approved_by}
                </span>
              )}
              {r.lead_approved_by && (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  <Star className="w-3 h-3" /> Approved by: {r.lead_approved_by}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className={`px-5 pb-5 ${colors.detail} border-t border-slate-100`}>
          {/* Approval chain banner */}
          {(r.class_approved_by || r.lead_approved_by) ? (
            <div className="mt-4 mb-4 flex flex-wrap gap-3 p-3 bg-white rounded-xl border border-green-200">
              <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-700" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Checked By (Class Teacher)</p>
                  <p className="text-sm font-semibold text-teal-700">{r.class_approved_by || '—'}</p>
                  {r.class_approved_at && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(r.class_approved_at).toLocaleString()}</p>}
                </div>
              </div>
              <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Approved By (Lead Teacher)</p>
                  <p className="text-sm font-semibold text-emerald-700">{r.lead_approved_by || '—'}</p>
                  {r.lead_approved_at && <p className="text-[10px] text-slate-400 mt-0.5">{new Date(r.lead_approved_at).toLocaleString()}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 mb-4 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">Legacy record — approved before workflow tracking was enabled</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem label="Date" value={`${r.record_date} (${r.day_of_week})`} />
            <DetailItem label="Teacher" value={`${r.teacher_name}${r.teacher_role ? ` — ${r.teacher_role}` : ''}`} />
            <DetailItem label="Class" value={r.grade} />
            <DetailItem label="Subject" value={r.subject} />
            {r.topic && <DetailItem label="Topic" value={r.topic} />}
            {r.contact_detail && <DetailItem label="Contact" value={r.contact_detail} />}
            {r.remarks && <DetailItem label="Content Details" value={r.remarks} full />}
            {r.exit_note && <DetailItem label="Exit — Student Details" value={r.exit_note} full />}
            <DetailItem label="Submitted" value={r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-[#1a3a6c] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24 text-slate-400">
      <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold text-slate-500">No approved records yet</p>
      <p className="text-sm mt-1">Records appear here after lead teacher final approval</p>
    </div>
  );
}
