import { useState, useEffect, useRef } from 'react';
import { supabase, Teacher, OptionItem } from '../lib/supabase';
import { CheckCircle, ChevronDown, Search } from 'lucide-react';

function useTransparentLogo(src: string) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230) d[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL());
    };
    img.src = src;
  }, [src]);
  return dataUrl;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getDayOfWeek = (dateStr: string) => {
  if (!dateStr) return '';
  const d = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return d[new Date(dateStr + 'T00:00:00').getDay()];
};

const today = new Date().toISOString().split('T')[0];

export default function PublicForm() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [email, setEmail] = useState('');
  const [recordDate, setRecordDate] = useState(today);
  const [day, setDay] = useState(getDayOfWeek(today));
  const [teacherName, setTeacherName] = useState('');
  const [teacherRole, setTeacherRole] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [contentDetails, setContentDetails] = useState('');
  const [exitNote, setExitNote] = useState('');
  const [additionalClassType, setAdditionalClassType] = useState('');
  const [additionalGrade, setAdditionalGrade] = useState('');
  const [additionalSubject, setAdditionalSubject] = useState('');
  const [additionalTeacher, setAdditionalTeacher] = useState('');
  const [additionalStudents, setAdditionalStudents] = useState('');
  const [additionalContact, setAdditionalContact] = useState('');
  const [additionalDate, setAdditionalDate] = useState('');
  const [additionalTime, setAdditionalTime] = useState('');
  const [additionalDuration, setAdditionalDuration] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      supabase.from('teachers').select('*').order('name'),
      supabase.from('grade_levels').select('*').order('sort_order'),
      supabase.from('subjects').select('*').order('sort_order'),
    ]).then(([{ data: t }, { data: g }, { data: s }]) => {
      if (t) setTeachers(t as Teacher[]);
      if (g) setGrades(g as OptionItem[]);
      if (s) setSubjects(s as OptionItem[]);
    });
  }, []);

  useEffect(() => { setDay(getDayOfWeek(recordDate)); }, [recordDate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!recordDate) e.date = 'Required';
    if (!day) e.day = 'Required';
    if (!teacherName.trim()) e.teacher = 'Required';
    if (!grade) e.grade = 'Required';
    if (!subject) e.subject = 'Required';
    if (!contentDetails.trim()) e.content = 'Required';
    if (!exitNote.trim()) e.exit = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const nowTime = new Date().toTimeString().slice(0, 5);
    await supabase.from('class_records').insert([{
      record_date: recordDate,
      record_time: nowTime,
      day_of_week: day,
      grade, subject,
      teacher_name: teacherName.trim(),
      teacher_role: teacherRole,
      contact_detail: email,
      exit_note: exitNote,
      remarks: contentDetails,
      total_students: 0, students_present: 0, students_absent: 0,
      class_status: 'completed', class_period: '', topic: '',
      lesson_objectives: '', activities_conducted: '', homework_assigned: '',
      approval_status: 'pending',
      additional_class_type: additionalClassType || null,
      additional_grade: additionalClassType ? (additionalGrade || null) : null,
      additional_subject: additionalClassType ? (additionalSubject || null) : null,
      additional_teacher: additionalClassType ? (additionalTeacher || null) : null,
      additional_no_of_students: additionalClassType && additionalStudents ? parseInt(additionalStudents) : null,
      additional_contact: additionalClassType ? (additionalContact || null) : null,
      additional_date: additionalClassType ? (additionalDate || null) : null,
      additional_time: additionalClassType ? (additionalTime || null) : null,
      additional_duration: additionalClassType ? (additionalDuration || null) : null,
    }]);
    setSubmitting(false);
    setSubmitted(true);
  };

  const reset = () => {
    setEmail(''); setRecordDate(today); setDay(getDayOfWeek(today));
    setTeacherName(''); setTeacherRole(''); setGrade(''); setSubject('');
    setContentDetails(''); setExitNote('');
    setAdditionalClassType(''); setAdditionalGrade(''); setAdditionalSubject('');
    setAdditionalTeacher(''); setAdditionalStudents(''); setAdditionalContact('');
    setAdditionalDate(''); setAdditionalTime(''); setAdditionalDuration('');
    setErrors({});
    setSubmitted(false);
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Bg>
        <Header />
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Response Recorded</h2>
          <p className="text-sm text-slate-500 mb-2">Your class record has been submitted successfully.</p>
          <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
            <p className="text-xs text-amber-700 font-medium">Pending class teacher approval</p>
          </div>
          <button onClick={reset}
            className="text-sm text-[#5b6ec8] hover:underline font-medium">
            Submit another response
          </button>
        </div>
      </Bg>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <Bg>
      <Header />

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 space-y-5">

          {/* Email */}
          <FormField label="Email" hint="Optional — included with your response">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#5b6ec8] focus:ring-2 focus:ring-[#5b6ec8]/10 transition-all"
            />
          </FormField>

          {/* Date */}
          <FormField label="Date" required error={errors.date}>
            <input
              type="date"
              value={recordDate}
              onChange={e => { setRecordDate(e.target.value); setErrors(er => ({ ...er, date: '' })); }}
              className={fieldCls(!!errors.date)}
            />
          </FormField>

          {/* Day */}
          <FormField label="Day" required error={errors.day}>
            <div className="relative">
              <select
                value={day}
                onChange={e => { setDay(e.target.value); setErrors(er => ({ ...er, day: '' })); }}
                className={`${fieldCls(!!errors.day)} appearance-none pr-9`}
              >
                <option value="">Select day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </FormField>

          {/* Teacher */}
          <FormField label="Teacher" required error={errors.teacher}>
            <TeacherPicker
              teachers={teachers}
              value={teacherName}
              hasError={!!errors.teacher}
              onSelect={t => {
                setTeacherName(t.name);
                setTeacherRole(t.role);
                if (t.contact) setEmail(t.contact);
                if (t.grade) setGrade(t.grade);
                if (t.subject) setSubject(t.subject);
                setErrors(er => ({ ...er, teacher: '' }));
              }}
            />
          </FormField>

          {/* Class */}
          <FormField label="Class" required error={errors.grade}>
            <ComboField
              value={grade}
              options={grades.map(g => g.name)}
              placeholder="Select or type class..."
              hasError={!!errors.grade}
              onChange={v => { setGrade(v); setErrors(er => ({ ...er, grade: '' })); }}
            />
          </FormField>

          {/* Subject */}
          <FormField label="Subject" required error={errors.subject}>
            <ComboField
              value={subject}
              options={subjects.map(s => s.name)}
              placeholder="Select or type subject..."
              hasError={!!errors.subject}
              onChange={v => { setSubject(v); setErrors(er => ({ ...er, subject: '' })); }}
            />
          </FormField>

          {/* Content Details */}
          <FormField label="Content Details" required error={errors.content}>
            <textarea
              value={contentDetails}
              onChange={e => { setContentDetails(e.target.value); setErrors(er => ({ ...er, content: '' })); }}
              placeholder="Describe the lesson content covered in this session..."
              rows={3}
              className={`${fieldCls(!!errors.content)} resize-none`}
            />
          </FormField>

          {/* Exit (students detail) */}
          <FormField label="Exit (students detail)" required error={errors.exit}>
            <textarea
              value={exitNote}
              onChange={e => { setExitNote(e.target.value); setErrors(er => ({ ...er, exit: '' })); }}
              placeholder="Note any students who exited early or special observations..."
              rows={3}
              className={`${fieldCls(!!errors.exit)} resize-none`}
            />
          </FormField>

          {/* Additional Class — optional */}
          <div className="pt-1">
            <div className="border-t border-slate-200 pt-4">
              <FormField label="Additional Class" hint="Optional — select if an extra session was conducted">
                <div className="relative">
                  <select
                    value={additionalClassType}
                    onChange={e => {
                      setAdditionalClassType(e.target.value);
                      if (!e.target.value) {
                        setAdditionalGrade(''); setAdditionalSubject(''); setAdditionalTeacher('');
                        setAdditionalStudents(''); setAdditionalContact('');
                        setAdditionalDate(''); setAdditionalTime(''); setAdditionalDuration('');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-[#5b6ec8] focus:ring-2 focus:ring-[#5b6ec8]/10 transition-all appearance-none bg-white pr-9"
                  >
                    <option value="">— None —</option>
                    <option value="Extra Class">Extra Class</option>
                    <option value="Remedial Class">Remedial Class</option>
                    <option value="Enrichment Class">Enrichment Class</option>
                    <option value="Missed Class">Missed Class</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </FormField>

              {additionalClassType && (
                <div className="mt-3 bg-white border border-[#5b6ec8]/20 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5b6ec8]" />
                    <p className="text-xs font-bold text-[#5b6ec8] uppercase tracking-wider">{additionalClassType} Details</p>
                    <p className="text-xs text-slate-400 ml-auto">All fields optional</p>
                  </div>

                  {/* Grade */}
                  <FormField label="Grade">
                    <ComboField
                      value={additionalGrade}
                      options={grades.map(g => g.name)}
                      placeholder="Select or type grade..."
                      hasError={false}
                      onChange={setAdditionalGrade}
                    />
                  </FormField>

                  {/* Subject */}
                  <FormField label="Subject">
                    <ComboField
                      value={additionalSubject}
                      options={subjects.map(s => s.name)}
                      placeholder="Select or type subject..."
                      hasError={false}
                      onChange={setAdditionalSubject}
                    />
                  </FormField>

                  {/* Teacher */}
                  <FormField label="Teacher">
                    <input
                      type="text"
                      value={additionalTeacher}
                      onChange={e => setAdditionalTeacher(e.target.value)}
                      placeholder="Enter teacher name..."
                      className={fieldCls(false)}
                    />
                  </FormField>

                  {/* No of Students */}
                  <FormField label="No of Students">
                    <input
                      type="number"
                      min="0"
                      value={additionalStudents}
                      onChange={e => setAdditionalStudents(e.target.value)}
                      placeholder="0"
                      className={fieldCls(false)}
                    />
                  </FormField>

                  {/* Contact Detail */}
                  <FormField label="Contact Detail">
                    <input
                      type="text"
                      value={additionalContact}
                      onChange={e => setAdditionalContact(e.target.value)}
                      placeholder="Email or phone number..."
                      className={fieldCls(false)}
                    />
                  </FormField>

                  {/* Date + Time in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Date">
                      <input
                        type="date"
                        value={additionalDate}
                        onChange={e => setAdditionalDate(e.target.value)}
                        className={fieldCls(false)}
                      />
                    </FormField>
                    <FormField label="Time">
                      <input
                        type="time"
                        value={additionalTime}
                        onChange={e => setAdditionalTime(e.target.value)}
                        className={fieldCls(false)}
                      />
                    </FormField>
                  </div>

                  {/* Duration */}
                  <FormField label="Duration">
                    <div className="relative">
                      <select
                        value={additionalDuration}
                        onChange={e => setAdditionalDuration(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-[#5b6ec8] focus:ring-2 focus:ring-[#5b6ec8]/10 transition-all appearance-none bg-white pr-9"
                      >
                        <option value="">Select duration</option>
                        <option value="35 Minutes">35 Minutes</option>
                        <option value="70 Minutes">70 Minutes</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#5b6ec8] hover:bg-[#4a5db7] active:bg-[#3d4fa8] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors shadow-sm mt-1"
          >
            {submitting ? 'Submitting…' : 'Submit Record'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your record will be reviewed by the admin staff.
        </p>
      </form>
    </Bg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fieldCls = (err: boolean) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 placeholder-slate-400 outline-none transition-all bg-white
  ${err
    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/10'
    : 'border-slate-300 focus:border-[#5b6ec8] focus:ring-2 focus:ring-[#5b6ec8]/10'}`;

function Bg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef0f8] py-6 px-3 sm:px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {children}
      </div>
    </div>
  );
}

function Header() {
  const logoSrc = useTransparentLogo('/School-logo.png');
  return (
    <div className="text-center py-2">
      {logoSrc
        ? <img src={logoSrc} alt="Faafu Atoll School" className="w-20 h-20 mx-auto mb-3 drop-shadow-md" />
        : <div className="w-20 h-20 mx-auto mb-3" />}
      <h1 className="text-xl font-bold text-slate-800">Class Records</h1>
      <p className="text-sm text-slate-500">Daily Records — First Semester 2026</p>
    </div>
  );
}

function FormField({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

function TeacherPicker({ teachers, value, hasError, onSelect }: {
  teachers: Teacher[]; value: string; hasError: boolean; onSelect: (t: Teacher) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm transition-all bg-white
          ${hasError
            ? 'border-red-400 focus:ring-2 focus:ring-red-400/10'
            : open
              ? 'border-[#5b6ec8] ring-2 ring-[#5b6ec8]/10'
              : 'border-slate-300 hover:border-slate-400'}`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {value || 'Search for your teacher...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2.5 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search teachers..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#5b6ec8] text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400 text-center">No teachers found</p>
            ) : filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onMouseDown={() => { onSelect(t); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#eef0f8] transition-colors border-b border-slate-50 last:border-0"
              >
                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-400">{t.role} · {t.grade}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComboField({ value, options, placeholder, hasError, onChange }: {
  value: string;
  options: string[];
  placeholder: string;
  hasError: boolean;
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
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 placeholder-slate-400 outline-none transition-all bg-white pr-9
          ${hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/10'
            : 'border-slate-300 focus:border-[#5b6ec8] focus:ring-2 focus:ring-[#5b6ec8]/10'}`}
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
