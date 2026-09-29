import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, ClassRecord, Teacher, OptionItem } from '../lib/supabase';
import SchoolStructureManager from '../components/SchoolStructureManager';
import {
  Shield, BookOpen, Users, Calendar, Search, RefreshCw,
  ChevronDown, LogOut, Download, Upload, UserPlus, Filter,
  BarChart2, TrendingUp, AlertCircle, Trash2, Clock, Mail,
  FileText, Pencil, Check, X, Plus, Tag, GraduationCap, Layers,
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Tab = 'records' | 'analytics' | 'teachers' | 'structure' | 'backup';
type TeacherSubTab = 'teachers' | 'roles' | 'classes' | 'subjects';
type TimeFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type ViewMode = 'all' | 'by-grade' | 'by-teacher';
type Props = { onLogout: () => void };

export default function SuperAdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('records');
  const [teacherSubTab, setTeacherSubTab] = useState<TeacherSubTab>('teachers');
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [roles, setRoles] = useState<OptionItem[]>([]);
  const [gradeOptions, setGradeOptions] = useState<OptionItem[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
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
  const [filterTeacher, setFilterTeacher] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Teacher form
  const [newTeacher, setNewTeacher] = useState({ name: '', role: '', grade: '', subject: '', contact: '', pin: '', is_class_teacher: false, is_lead_teacher: false, assigned_lead_id: '' });
  const [teacherMsg, setTeacherMsg] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Teacher>>({});

  // Backup
  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoring, setRestoring] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: recs },
      { data: teas },
      { data: r },
      { data: g },
      { data: s },
    ] = await Promise.all([
      supabase.from('class_records').select('*').order('record_date', { ascending: false }),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('teacher_roles').select('*').order('sort_order'),
      supabase.from('grade_levels').select('*').order('sort_order'),
      supabase.from('subjects').select('*').order('sort_order'),
    ]);
    if (recs) setRecords(recs as ClassRecord[]);
    if (teas) setTeachers(teas as Teacher[]);
    if (r) setRoles(r as OptionItem[]);
    if (g) setGradeOptions(g as OptionItem[]);
    if (s) setSubjectOptions(s as OptionItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grades = [...new Set(records.map(r => r.grade))].sort();
  const subjects = [...new Set(records.map(r => r.subject))].sort();
  const teacherNames = [...new Set(records.map(r => r.teacher_name))].sort();
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
      (!q || r.teacher_name?.toLowerCase().includes(q) || r.grade?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q) || r.remarks?.toLowerCase().includes(q) || r.exit_note?.toLowerCase().includes(q)) &&
      (!filterGrade || r.grade === filterGrade) &&
      (!filterSubject || r.subject === filterSubject) &&
      (!filterDay || r.day_of_week === filterDay) &&
      (!filterTeacher || r.teacher_name === filterTeacher) &&
      applyTime(r)
    );
  });

  const byGrade = grades.reduce<Record<string, ClassRecord[]>>((acc, g) => {
    const recs = filtered.filter(r => r.grade === g);
    if (recs.length) acc[g] = recs;
    return acc;
  }, {});

  const byTeacher = teacherNames.reduce<Record<string, ClassRecord[]>>((acc, t) => {
    const recs = filtered.filter(r => r.teacher_name === t);
    if (recs.length) acc[t] = recs;
    return acc;
  }, {});

  const toggle = (id: string) => setExpandedRows(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Analytics
  const gradeStats = grades.map(g => ({ label: g, count: filtered.filter(r => r.grade === g).length })).sort((a, b) => b.count - a.count).slice(0, 10);
  const subjectStats = subjects.map(s => ({ label: s, count: filtered.filter(r => r.subject === s).length })).sort((a, b) => b.count - a.count).slice(0, 10);
  const teacherStats = teacherNames.map(t => ({ label: t, count: filtered.filter(r => r.teacher_name === t).length })).sort((a, b) => b.count - a.count).slice(0, 10);
  const dayStats = DAYS.map(d => ({ label: d, count: filtered.filter(r => r.day_of_week === d).length }));

  // Record delete
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    await supabase.from('class_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // Backup
  const handleBackup = () => {
    const blob = new Blob([JSON.stringify({ records, teachers, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `class-records-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true); setRestoreMsg('');
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.records)) throw new Error('Invalid backup format.');
      let inserted = 0;
      for (const r of payload.records as ClassRecord[]) {
        const { error } = await supabase.from('class_records').insert([{
          id: r.id, record_date: r.record_date, record_time: r.record_time,
          day_of_week: r.day_of_week, grade: r.grade, subject: r.subject,
          teacher_name: r.teacher_name, teacher_role: r.teacher_role,
          contact_detail: r.contact_detail, exit_note: r.exit_note,
          remarks: r.remarks, class_status: r.class_status,
          submitted_at: r.submitted_at, total_students: r.total_students,
          students_present: r.students_present, students_absent: r.students_absent,
          topic: r.topic, class_period: r.class_period,
          lesson_objectives: r.lesson_objectives, activities_conducted: r.activities_conducted,
          homework_assigned: r.homework_assigned,
        }]);
        if (!error) inserted++;
      }
      setRestoreMsg(`Restored ${inserted} of ${payload.records.length} records.`);
      fetchAll();
    } catch (err) {
      setRestoreMsg('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setRestoring(false); e.target.value = '';
  };

  // Teacher CRUD
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault(); setTeacherMsg('');
    if (!newTeacher.name.trim()) { setTeacherMsg('Name is required.'); return; }
    setSavingTeacher(true);
    const { error } = await supabase.from('teachers').insert([{
      name: newTeacher.name.trim(), role: newTeacher.role,
      grade: newTeacher.grade, subject: newTeacher.subject, contact: newTeacher.contact.trim(),
      pin: newTeacher.pin.trim() || null, is_class_teacher: newTeacher.is_class_teacher, is_lead_teacher: newTeacher.is_lead_teacher,
      assigned_lead_id: newTeacher.assigned_lead_id || null,
    }]);
    setSavingTeacher(false);
    if (error) { setTeacherMsg('Failed to add teacher.'); return; }
    setTeacherMsg('Teacher added successfully!');
    setNewTeacher({ name: '', role: '', grade: '', subject: '', contact: '', pin: '', is_class_teacher: false, is_lead_teacher: false, assigned_lead_id: '' });
    fetchAll();
  };

  const startEditTeacher = (t: Teacher) => {
    setEditingTeacher(t.id);
    setEditValues({ name: t.name, role: t.role, grade: t.grade, subject: t.subject, contact: t.contact, pin: t.pin, is_class_teacher: t.is_class_teacher, is_lead_teacher: t.is_lead_teacher, assigned_lead_id: t.assigned_lead_id ?? '' });
  };

  const handleSaveTeacher = async (id: string) => {
    if (!editValues.name?.trim()) return;
    const { error } = await supabase.from('teachers').update({
      name: editValues.name.trim(), role: editValues.role,
      grade: editValues.grade, subject: editValues.subject, contact: editValues.contact?.trim(),
      pin: editValues.pin?.trim() || null, is_class_teacher: editValues.is_class_teacher ?? false, is_lead_teacher: editValues.is_lead_teacher ?? false,
      assigned_lead_id: (editValues as Teacher & { assigned_lead_id?: string }).assigned_lead_id || null,
    }).eq('id', id);
    if (!error) {
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...editValues } as Teacher : t));
      setEditingTeacher(null);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Delete this teacher?')) return;
    await supabase.from('teachers').delete().eq('id', id);
    setTeachers(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#eef0f8] pb-24">
      <header className="bg-[#1a3a6c] text-white sticky top-0 z-10 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Super Admin Dashboard</h1>
              <p className="text-xs text-blue-300">Full access — First Semester 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="text-blue-300 hover:text-white transition-colors p-1">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-0.5 overflow-x-auto scrollbar-none">
          {([
            { id: 'records', label: 'Records', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { id: 'teachers', label: 'Teachers', icon: <UserPlus className="w-3.5 h-3.5" /> },
            { id: 'structure', label: 'Structure', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'backup', label: 'Backup', icon: <Download className="w-3.5 h-3.5" /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap
                ${tab === t.id ? 'bg-[#eef0f8] text-[#1a3a6c]' : 'text-blue-300 hover:text-white'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Records', val: records.length, icon: <FileText className="w-4 h-4" />, c: 'bg-blue-50 text-blue-600' },
            { label: 'Classes', val: [...new Set(records.map(r => r.grade))].length, icon: <BookOpen className="w-4 h-4" />, c: 'bg-emerald-50 text-emerald-600' },
            { label: 'Teachers', val: teachers.length, icon: <Users className="w-4 h-4" />, c: 'bg-amber-50 text-amber-600' },
            { label: 'Subjects', val: [...new Set(records.map(r => r.subject))].length, icon: <TrendingUp className="w-4 h-4" />, c: 'bg-rose-50 text-rose-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.c}`}>{s.icon}</div>
              <div className="text-2xl font-bold text-slate-800">{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── RECORDS TAB ── */}
        {tab === 'records' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search teacher, class, subject..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]" />
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-1 bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {(['all','by-grade','by-teacher'] as const).map(v => (
                      <button key={v} onClick={() => setViewMode(v)}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${viewMode === v ? 'bg-white shadow text-[#1a3a6c]' : 'text-slate-500'}`}>
                        {v === 'all' ? 'All' : v === 'by-grade' ? 'By Class' : 'By Teacher'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${showFilters ? 'bg-[#1a3a6c] text-white border-[#1a3a6c]' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                    <Filter className="w-3.5 h-3.5" /> Filters
                  </button>
                </div>
              </div>
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
                  {timeFilter === 'daily' && <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />}
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
                    }} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                  )}
                  {(timeFilter === 'monthly' || timeFilter === 'yearly') && (
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                      <option value="">Year</option>
                      {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                  )}
                  {timeFilter === 'monthly' && (
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                      <option value="">Month</option>
                      {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                    </select>
                  )}
                </div>
              )}
              {showFilters && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                    <option value="">All Classes</option>
                    {grades.map(g => <option key={g}>{g}</option>)}
                  </select>
                  <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                    <option value="">All Days</option>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                    <option value="">All Teachers</option>
                    {teacherNames.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
            {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState /> :
              viewMode === 'by-grade' ? <GroupView groups={byGrade} expandedRows={expandedRows} toggle={toggle} onDelete={handleDeleteRecord} /> :
              viewMode === 'by-teacher' ? <GroupView groups={byTeacher} expandedRows={expandedRows} toggle={toggle} onDelete={handleDeleteRecord} /> : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-sm">All Records</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} of {records.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filtered.map((r, i) => <RecordRow key={r.id} record={r} index={i} expanded={expandedRows.has(r.id)} toggle={() => toggle(r.id)} onDelete={handleDeleteRecord} />)}
                  </div>
                </div>
              )
            }
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard label="Filtered Records" value={filtered.length} sub="matching current view" />
              <SummaryCard label="Active Classes" value={[...new Set(filtered.map(r => r.grade))].length} sub="unique classes" />
              <SummaryCard label="Active Teachers" value={[...new Set(filtered.map(r => r.teacher_name))].length} sub="unique teachers" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Records by Class" icon={<BookOpen className="w-4 h-4 text-blue-500" />}>
                {gradeStats.map(s => <Bar key={s.label} label={s.label} count={s.count} max={Math.max(...gradeStats.map(x => x.count))} color="bg-[#1a3a6c]" />)}
              </ChartCard>
              <ChartCard title="Records by Subject" icon={<Calendar className="w-4 h-4 text-amber-500" />}>
                {subjectStats.map(s => <Bar key={s.label} label={s.label} count={s.count} max={Math.max(...subjectStats.map(x => x.count))} color="bg-amber-500" />)}
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Records by Teacher" icon={<Users className="w-4 h-4 text-emerald-500" />}>
                {teacherStats.map(s => <Bar key={s.label} label={s.label} count={s.count} max={Math.max(...teacherStats.map(x => x.count))} color="bg-emerald-500" />)}
              </ChartCard>
              <ChartCard title="Records by Day of Week" icon={<TrendingUp className="w-4 h-4 text-rose-500" />}>
                {dayStats.filter(s => s.count > 0).map(s => <Bar key={s.label} label={s.label} count={s.count} max={Math.max(...dayStats.map(x => x.count), 1)} color="bg-rose-400" />)}
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── TEACHERS TAB ── */}
        {tab === 'teachers' && (
          <div className="space-y-4">
            {/* Sub-tab bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 grid grid-cols-4 gap-1">
              {([
                { id: 'teachers', label: 'Teachers', icon: <Users className="w-3.5 h-3.5" />, count: teachers.length },
                { id: 'roles', label: 'Roles', icon: <Tag className="w-3.5 h-3.5" />, count: roles.length },
                { id: 'classes', label: 'Classes', icon: <GraduationCap className="w-3.5 h-3.5" />, count: gradeOptions.length },
                { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-3.5 h-3.5" />, count: subjectOptions.length },
              ] as const).map(s => (
                <button key={s.id} onClick={() => setTeacherSubTab(s.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2.5 px-1 sm:px-3 rounded-xl text-xs font-semibold transition-all
                    ${teacherSubTab === s.id ? 'bg-[#1a3a6c] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                  {s.icon}
                  <span className="hidden xs:inline sm:inline">{s.label}</span>
                  <span className="sm:hidden text-[10px]">{s.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${teacherSubTab === s.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.count}</span>
                </button>
              ))}
            </div>

            {/* Teachers sub-tab */}
            {teacherSubTab === 'teachers' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Add form */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-[#1a3a6c]" /> Add New Teacher
                  </h3>
                  <form onSubmit={handleAddTeacher} className="space-y-3">
                    <Field label="Full Name *">
                      <input type="text" placeholder="Teacher's full name" value={newTeacher.name}
                        onChange={e => setNewTeacher(t => ({ ...t, name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]" />
                    </Field>
                    <Field label="Contact (email/phone)">
                      <input type="text" placeholder="Email or phone number" value={newTeacher.contact}
                        onChange={e => setNewTeacher(t => ({ ...t, contact: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]" />
                    </Field>
                    <Field label="Role">
                      <select value={newTeacher.role} onChange={e => setNewTeacher(t => ({ ...t, role: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]">
                        <option value="">— Select Role —</option>
                        {roles.map(r => <option key={r.id}>{r.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Default Class">
                      <AdminComboField
                        value={newTeacher.grade}
                        options={gradeOptions.map(g => g.name)}
                        placeholder="Select or type class..."
                        onChange={v => setNewTeacher(t => ({ ...t, grade: v }))}
                      />
                    </Field>
                    <Field label="Default Subject">
                      <AdminComboField
                        value={newTeacher.subject}
                        options={subjectOptions.map(s => s.name)}
                        placeholder="Select or type subject..."
                        onChange={v => setNewTeacher(t => ({ ...t, subject: v }))}
                      />
                    </Field>
                    <Field label="Login PIN">
                      <input type="text" placeholder="Set a PIN for portal access" value={newTeacher.pin}
                        onChange={e => setNewTeacher(t => ({ ...t, pin: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]" />
                    </Field>
                    <Field label="Assigned Lead Teacher">
                      <select value={newTeacher.assigned_lead_id} onChange={e => setNewTeacher(t => ({ ...t, assigned_lead_id: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]">
                        <option value="">— None —</option>
                        {teachers.filter(t => t.is_lead_teacher).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Access Level">
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={newTeacher.is_class_teacher}
                            onChange={e => setNewTeacher(t => ({ ...t, is_class_teacher: e.target.checked }))}
                            className="w-4 h-4 rounded accent-teal-700"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Class Teacher</p>
                            <p className="text-xs text-slate-400">Reviews & corrects records for their class</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={newTeacher.is_lead_teacher}
                            onChange={e => setNewTeacher(t => ({ ...t, is_lead_teacher: e.target.checked }))}
                            className="w-4 h-4 rounded accent-[#1a3a6c]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Lead Teacher</p>
                            <p className="text-xs text-slate-400">Can give final approval on records</p>
                          </div>
                        </label>
                      </div>
                    </Field>
                    {teacherMsg && (
                      <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${teacherMsg.includes('!') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {teacherMsg}
                      </div>
                    )}
                    <button type="submit" disabled={savingTeacher}
                      className="w-full bg-[#1a3a6c] hover:bg-[#14305a] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> {savingTeacher ? 'Saving...' : 'Add Teacher'}
                    </button>
                  </form>
                </div>

                {/* Teacher list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Users className="w-4 h-4 text-[#1a3a6c]" /> Registered Teachers</h3>
                    <span className="text-xs font-bold text-[#1a3a6c] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">{teachers.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {teachers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                        <p className="text-sm text-slate-400">No teachers yet. Add one above.</p>
                      </div>
                    ) : teachers.map(t => (
                      <div key={t.id} className={`transition-colors ${editingTeacher === t.id ? 'bg-[#eef0f8]' : 'hover:bg-slate-50'}`}>
                        {editingTeacher === t.id ? (
                          <div className="px-4 py-4 space-y-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-[#1a3a6c] uppercase tracking-wide">Editing Teacher</p>
                              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                              <input value={editValues.name ?? ''} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact</label>
                              <input value={editValues.contact ?? ''} onChange={e => setEditValues(v => ({ ...v, contact: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Role</label>
                              <select value={editValues.role ?? ''} onChange={e => setEditValues(v => ({ ...v, role: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]">
                                <option value="">— No role —</option>
                                {roles.map(r => <option key={r.id}>{r.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Default Class</label>
                              <AdminComboField
                                value={editValues.grade ?? ''}
                                options={gradeOptions.map(g => g.name)}
                                placeholder="Select or type class..."
                                onChange={v => setEditValues(ev => ({ ...ev, grade: v }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Default Subject</label>
                              <AdminComboField
                                value={editValues.subject ?? ''}
                                options={subjectOptions.map(s => s.name)}
                                placeholder="Select or type subject..."
                                onChange={v => setEditValues(ev => ({ ...ev, subject: v }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Login PIN</label>
                              <input
                                value={editValues.pin ?? ''}
                                onChange={e => setEditValues(v => ({ ...v, pin: e.target.value }))}
                                placeholder="Portal login PIN"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Lead Teacher</label>
                              <select
                                value={(editValues as Teacher & { assigned_lead_id?: string }).assigned_lead_id ?? ''}
                                onChange={e => setEditValues(v => ({ ...v, assigned_lead_id: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]">
                                <option value="">— None —</option>
                                {teachers.filter(t => t.is_lead_teacher).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editValues.is_class_teacher ?? false}
                                  onChange={e => setEditValues(v => ({ ...v, is_class_teacher: e.target.checked }))}
                                  className="w-4 h-4 rounded accent-teal-700"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">Class Teacher access</p>
                                  <p className="text-xs text-slate-400">Reviews records for their class</p>
                                </div>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editValues.is_lead_teacher ?? false}
                                  onChange={e => setEditValues(v => ({ ...v, is_lead_teacher: e.target.checked }))}
                                  className="w-4 h-4 rounded accent-[#1a3a6c]"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">Lead Teacher access</p>
                                  <p className="text-xs text-slate-400">Can give final approval on records</p>
                                </div>
                              </label>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => handleSaveTeacher(t.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1a3a6c] text-white text-xs font-bold hover:bg-[#14305a] transition-colors">
                                <Check className="w-3.5 h-3.5" /> Save Changes
                              </button>
                              <button onClick={() => setEditingTeacher(null)}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-3.5">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#1a3a6c] flex items-center justify-center flex-shrink-0 shadow-sm">
                                <span className="text-sm font-bold text-white">{t.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                {t.contact && <p className="text-xs text-slate-400 mt-0.5">{t.contact}</p>}
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={() => startEditTeacher(t)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1a3a6c] bg-[#eef0f8] hover:bg-blue-100 border border-blue-100 transition-colors">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={() => handleDeleteTeacher(t.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2.5 ml-12">
                              {t.role
                                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Tag className="w-3 h-3" />{t.role}</span>
                                : <span className="text-xs text-slate-300 border border-dashed border-slate-200 px-2.5 py-1 rounded-full">No role</span>}
                              {t.grade
                                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1a3a6c] border border-blue-200"><GraduationCap className="w-3 h-3" />{t.grade}</span>
                                : <span className="text-xs text-slate-300 border border-dashed border-slate-200 px-2.5 py-1 rounded-full">No class</span>}
                              {t.subject
                                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><BookOpen className="w-3 h-3" />{t.subject}</span>
                                : <span className="text-xs text-slate-300 border border-dashed border-slate-200 px-2.5 py-1 rounded-full">No subject</span>}
                              {t.pin
                                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">PIN set</span>
                                : <span className="text-xs text-slate-300 border border-dashed border-slate-200 px-2.5 py-1 rounded-full">No PIN</span>}
                              {t.is_class_teacher && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">Class Teacher</span>
                              )}
                              {t.assigned_lead_id && (() => {
                                const lead = teachers.find(l => l.id === t.assigned_lead_id);
                                return lead ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">→ {lead.name}</span>
                                ) : null;
                              })()}
                              {t.is_lead_teacher && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-800/10 text-emerald-800 border border-emerald-800/20">Lead Teacher</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Roles sub-tab */}
            {teacherSubTab === 'roles' && (
              <OptionManager
                title="Teacher Roles"
                description="These roles appear in the teacher form and public submission form."
                icon={<Tag className="w-4 h-4 text-amber-600" />}
                iconBg="bg-amber-50"
                items={roles}
                table="teacher_roles"
                onUpdate={setRoles}
              />
            )}

            {/* Classes sub-tab */}
            {teacherSubTab === 'classes' && (
              <OptionManager
                title="Class / Grade Levels"
                description="These classes appear in the teacher form and public submission form."
                icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
                iconBg="bg-blue-50"
                items={gradeOptions}
                table="grade_levels"
                onUpdate={setGradeOptions}
              />
            )}

            {/* Subjects sub-tab */}
            {teacherSubTab === 'subjects' && (
              <OptionManager
                title="Subjects"
                description="These subjects appear in the teacher form and public submission form."
                icon={<BookOpen className="w-4 h-4 text-emerald-600" />}
                iconBg="bg-emerald-50"
                items={subjectOptions}
                table="subjects"
                onUpdate={setSubjectOptions}
              />
            )}
          </div>
        )}

        {/* ── STRUCTURE TAB ── */}
        {tab === 'structure' && (
          <SchoolStructureManager teachers={teachers} gradeOptions={gradeOptions} subjectOptions={subjectOptions} />
        )}

        {/* ── BACKUP TAB ── */}
        {tab === 'backup' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Backup Data</h3>
              <p className="text-sm text-slate-500 mb-5">Download a full JSON backup of all class records and teacher profiles.</p>
              <button onClick={handleBackup}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download Backup
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Restore Data</h3>
              <p className="text-sm text-slate-500 mb-5">Upload a backup JSON file. Records with the same ID will be skipped.</p>
              <label className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors border-2 border-dashed ${restoring ? 'opacity-60 cursor-not-allowed border-slate-200 text-slate-400' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                <Upload className="w-4 h-4" /> {restoring ? 'Restoring...' : 'Upload Backup File'}
                <input type="file" accept=".json" onChange={handleRestore} disabled={restoring} className="hidden" />
              </label>
              {restoreMsg && (
                <div className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${restoreMsg.startsWith('Restored') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {restoreMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── OptionManager ─────────────────────────────────────────────────────────────

function OptionManager({ title, description, icon, iconBg, items, table, onUpdate }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  items: OptionItem[];
  table: string;
  onUpdate: (items: OptionItem[]) => void;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [msg, setMsg] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true); setMsg('');
    const maxOrder = items.length ? Math.max(...items.map(i => i.sort_order)) : 0;
    const { data, error } = await supabase.from(table).insert([{ name, sort_order: maxOrder + 1 }]).select().maybeSingle();
    setAdding(false);
    if (error) { setMsg('Failed to add: ' + error.message); return; }
    if (data) { onUpdate([...items, data as OptionItem]); setNewName(''); }
  };

  const startEdit = (item: OptionItem) => { setEditingId(item.id); setEditName(item.name); };

  const handleSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from(table).update({ name }).eq('id', id);
    if (!error) {
      onUpdate(items.map(i => i.id === id ? { ...i, name } : i));
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) onUpdate(items.filter(i => i.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Add new */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
          <div>
            <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`New ${title.toLowerCase().replace(/s$/, '')} name...`}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]"
          />
          <button type="submit" disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a3a6c] text-white text-sm font-bold hover:bg-[#14305a] disabled:opacity-50 transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
        {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h3 className="font-bold text-slate-700 text-sm">{title} List</h3>
          <span className="text-xs font-bold text-[#1a3a6c] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400">No {title.toLowerCase()} yet.</p>
            </div>
          ) : items.map((item, idx) => (
            <div key={item.id} className={`px-4 py-3 flex items-center gap-3 transition-colors ${editingId === item.id ? 'bg-[#eef0f8]' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60'}`}>
              {editingId === item.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave(item.id)}
                    autoFocus
                    className="flex-1 border border-[#1a3a6c]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 bg-white"
                  />
                  <button onClick={() => handleSave(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a3a6c] text-white text-xs font-bold hover:bg-[#14305a] transition-colors">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-700">{item.name}</span>
                  <button onClick={() => startEdit(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1a3a6c] bg-[#eef0f8] hover:bg-blue-100 border border-blue-100 transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared subcomponents ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

function GroupView({ groups, expandedRows, toggle, onDelete }: {
  groups: Record<string, ClassRecord[]>;
  expandedRows: Set<string>;
  toggle: (id: string) => void;
  onDelete: (id: string) => void;
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
                <p className="text-xs text-slate-400">{recs.length} record{recs.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openGroups.has(key) ? 'rotate-180' : ''}`} />
          </button>
          {openGroups.has(key) && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {recs.map((r, i) => <RecordRow key={r.id} record={r} index={i} expanded={expandedRows.has(r.id)} toggle={() => toggle(r.id)} onDelete={onDelete} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ROW_COLORS = [
  { base: 'bg-white', hover: 'hover:bg-blue-50', detail: 'bg-blue-50/60', left: 'border-l-4 border-[#1a3a6c]' },
  { base: 'bg-emerald-50/40', hover: 'hover:bg-emerald-50', detail: 'bg-emerald-50/80', left: 'border-l-4 border-emerald-500' },
  { base: 'bg-amber-50/40', hover: 'hover:bg-amber-50', detail: 'bg-amber-50/80', left: 'border-l-4 border-amber-500' },
  { base: 'bg-rose-50/40', hover: 'hover:bg-rose-50', detail: 'bg-rose-50/80', left: 'border-l-4 border-rose-500' },
  { base: 'bg-cyan-50/40', hover: 'hover:bg-cyan-50', detail: 'bg-cyan-50/80', left: 'border-l-4 border-cyan-500' },
];

function RecordRow({ record: r, expanded, toggle, onDelete, index }: {
  record: ClassRecord; expanded: boolean; toggle: () => void; onDelete: (id: string) => void; index: number;
}) {
  const colors = ROW_COLORS[index % ROW_COLORS.length];
  return (
    <div className={`${colors.base} ${colors.hover} ${colors.left} transition-colors`}>
      <button onClick={toggle} className="w-full text-left px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="font-semibold text-slate-800 text-sm">{r.teacher_name}</span>
              {r.teacher_role && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{r.teacher_role}</span>}
              <span className="text-xs font-medium text-[#1a3a6c] bg-blue-50 px-1.5 py-0.5 rounded-full">{r.grade}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{r.subject}</span>
              <ApprovalBadge status={r.approval_status} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.record_date} &mdash; {r.day_of_week}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.record_time}</span>
              {r.contact_detail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.contact_detail}</span>}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className={`px-5 pb-5 ${colors.detail} border-t border-slate-100`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <DetailItem label="Date" value={`${r.record_date} (${r.day_of_week})`} />
            <DetailItem label="Teacher" value={`${r.teacher_name}${r.teacher_role ? ` — ${r.teacher_role}` : ''}`} />
            <DetailItem label="Class" value={r.grade} />
            <DetailItem label="Subject" value={r.subject} />
            {r.contact_detail && <DetailItem label="Email" value={r.contact_detail} />}
            {r.remarks && <DetailItem label="Content Details" value={r.remarks} full />}
            {r.exit_note && <DetailItem label="Exit — Student Details" value={r.exit_note} full />}
            <DetailItem label="Submitted at" value={r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
            <button onClick={e => { e.stopPropagation(); onDelete(r.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 text-center">
      <div className="text-3xl font-black text-[#1a3a6c] mb-1">{value}</div>
      <p className="font-semibold text-slate-700 text-sm">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">{icon} {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Bar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-4 text-right">{count}</span>
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

function ApprovalBadge({ status }: { status: string }) {
  if (!status || status === 'approved') return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Approved</span>
  );
  if (status === 'pending') return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
  );
  if (status === 'class_approved') return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Class Approved</span>
  );
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Rejected</span>
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
      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold text-slate-500">No records found</p>
      <p className="text-sm mt-1">Adjust filters or submit a new form record</p>
    </div>
  );
}

function AdminComboField({ value, options, placeholder, onChange }: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white pr-9 focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c]"
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onMouseDown={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#eef0f8] transition-colors text-sm text-slate-800 border-b border-slate-50 last:border-0"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
