import { useState, useEffect, useCallback } from 'react';
import { supabase, Teacher, OptionItem, KeyStage, KeyStageClass, TeacherClassAssignment } from '../lib/supabase';
import {
  Layers, GraduationCap, Users, Plus, Trash2, Check, X,
  ChevronDown, BookOpen, RefreshCw, AlertCircle, User,
} from 'lucide-react';

type Props = {
  teachers: Teacher[];
  gradeOptions: OptionItem[];
  subjectOptions: OptionItem[];
};

export default function SchoolStructureManager({ teachers, gradeOptions, subjectOptions }: Props) {
  const [keyStages, setKeyStages] = useState<KeyStage[]>([]);
  const [stageClasses, setStageClasses] = useState<KeyStageClass[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const leadTeachers = teachers.filter(t => t.is_lead_teacher);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: stages },
      { data: ksc },
      { data: asgn },
    ] = await Promise.all([
      supabase.from('key_stages').select('*').order('sort_order'),
      supabase.from('key_stage_classes').select('*').order('key_stage_id, sort_order'),
      supabase.from('teacher_class_assignments').select('*').order('teacher_id, grade_name'),
    ]);
    setKeyStages((stages as KeyStage[]) || []);
    setStageClasses((ksc as KeyStageClass[]) || []);
    setAssignments((asgn as TeacherClassAssignment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (keyStages.length && !expandedStage) setExpandedStage(keyStages[0].id);
  }, [keyStages, expandedStage]);

  const handleAssignLead = async (stageId: string, leadId: string) => {
    setMsg('');
    const { error } = await supabase
      .from('key_stages')
      .update({ lead_teacher_id: leadId || null })
      .eq('id', stageId);
    if (error) { setMsg('Failed to assign lead teacher.'); return; }
    setKeyStages(prev => prev.map(s => s.id === stageId ? { ...s, lead_teacher_id: leadId || null } : s));
  };

  const [addingClassTo, setAddingClassTo] = useState<string | null>(null);
  const [newClassGrade, setNewClassGrade] = useState('');

  const handleAddClassToStage = async (stageId: string) => {
    const grade = newClassGrade.trim();
    if (!grade) return;
    setMsg('');
    const maxOrder = stageClasses.filter(c => c.key_stage_id === stageId).reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error } = await supabase
      .from('key_stage_classes')
      .insert([{ key_stage_id: stageId, grade_name: grade, sort_order: maxOrder + 1 }])
      .select().maybeSingle();
    if (error) {
      setMsg(error.code === '23505' ? 'This class is already in a key stage.' : 'Failed to add class.');
      return;
    }
    if (data) {
      setStageClasses(prev => [...prev, data as KeyStageClass].sort((a, b) => {
        const sa = keyStages.find(s => s.id === a.key_stage_id)?.sort_order || 0;
        const sb = keyStages.find(s => s.id === b.key_stage_id)?.sort_order || 0;
        return sa === sb ? a.sort_order - b.sort_order : sa - sb;
      }));
    }
    setNewClassGrade('');
    setAddingClassTo(null);
  };

  const handleRemoveClassFromStage = async (classId: string) => {
    if (!confirm('Remove this class from the key stage?')) return;
    const { error } = await supabase.from('key_stage_classes').delete().eq('id', classId);
    if (error) { setMsg('Failed to remove class.'); return; }
    setStageClasses(prev => prev.filter(c => c.id !== classId));
  };

  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const handleAddStage = async () => {
    const name = newStageName.trim();
    if (!name) return;
    setMsg('');
    const maxOrder = keyStages.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { data, error } = await supabase
      .from('key_stages')
      .insert([{ name, sort_order: maxOrder + 1 }])
      .select().maybeSingle();
    if (error) { setMsg('Failed to add key stage.'); return; }
    if (data) {
      setKeyStages(prev => [...prev, data as KeyStage].sort((a, b) => a.sort_order - b.sort_order));
    }
    setNewStageName('');
    setShowAddStage(false);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Delete this key stage? All class assignments within it will also be removed.')) return;
    const { error } = await supabase.from('key_stages').delete().eq('id', stageId);
    if (error) { setMsg('Failed to delete key stage.'); return; }
    setKeyStages(prev => prev.filter(s => s.id !== stageId));
    setStageClasses(prev => prev.filter(c => c.key_stage_id !== stageId));
  };

  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignGrade, setAssignGrade] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignMsg, setAssignMsg] = useState('');

  const handleAddAssignment = async () => {
    if (!assignTeacherId || !assignGrade) {
      setAssignMsg('Please select a teacher and a class.');
      return;
    }
    setAssignMsg('');
    const { data, error } = await supabase
      .from('teacher_class_assignments')
      .insert([{ teacher_id: assignTeacherId, grade_name: assignGrade, subject: assignSubject }])
      .select().maybeSingle();
    if (error) {
      setAssignMsg(error.code === '23505' ? 'This teacher is already assigned to this class for that subject.' : 'Failed to assign.');
      return;
    }
    if (data) setAssignments(prev => [...prev, data as TeacherClassAssignment]);
    setAssignGrade('');
    setAssignSubject('');
  };

  const handleRemoveAssignment = async (id: string) => {
    const { error } = await supabase.from('teacher_class_assignments').delete().eq('id', id);
    if (error) { setAssignMsg('Failed to remove assignment.'); return; }
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const assignmentsByTeacher = assignments.reduce<Record<string, TeacherClassAssignment[]>>((acc, a) => {
    if (!acc[a.teacher_id]) acc[a.teacher_id] = [];
    acc[a.teacher_id].push(a);
    return acc;
  }, {});

  const allGradeNames = gradeOptions.map(g => g.name);
  const assignedGradeNames = new Set(stageClasses.map(c => c.grade_name));
  const unassignedGrades = allGradeNames.filter(g => !assignedGradeNames.has(g));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#1a3a6c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">School Structure</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Organize classes into Key Stages, assign a Lead Teacher to each stage, and manage which classes each Subject Teacher covers.
            Subject teachers can teach across multiple classes and key stages.
          </p>
        </div>
      </div>

      {(msg || assignMsg) && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {msg || assignMsg}
        </div>
      )}

      {/* KEY STAGES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1a3a6c]" /> Key Stages
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="text-slate-400 hover:text-slate-600 p-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowAddStage(s => !s)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1a3a6c] hover:bg-[#14305a] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Stage
            </button>
          </div>
        </div>

        {showAddStage && (
          <div className="px-5 py-4 bg-[#eef0f8] border-b border-slate-100 flex gap-2">
            <input
              type="text"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="e.g. Key Stage 4"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white"
              onKeyDown={e => e.key === 'Enter' && handleAddStage()}
              autoFocus
            />
            <button onClick={handleAddStage}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1a3a6c] text-white text-xs font-bold hover:bg-[#14305a] transition-colors">
              <Check className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={() => { setShowAddStage(false); setNewStageName(''); }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {keyStages.length === 0 ? (
            <div className="text-center py-10">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400">No key stages yet. Add one above.</p>
            </div>
          ) : keyStages.map(stage => {
            const stageClassList = stageClasses.filter(c => c.key_stage_id === stage.id).sort((a, b) => a.sort_order - b.sort_order);
            const leadTeacher = teachers.find(t => t.id === stage.lead_teacher_id);
            const isExpanded = expandedStage === stage.id;

            return (
              <div key={stage.id}>
                <div className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                      className="w-8 h-8 rounded-lg bg-[#eef0f8] flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <ChevronDown className={`w-4 h-4 text-[#1a3a6c] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{stage.name}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {stageClassList.length} class{stageClassList.length !== 1 ? 'es' : ''}
                        </span>
                        {leadTeacher && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <User className="w-3 h-3" /> {leadTeacher.name}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lead Teacher:</label>
                        <select
                          value={stage.lead_teacher_id || ''}
                          onChange={e => handleAssignLead(stage.id, e.target.value)}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white"
                        >
                          <option value="">— None —</option>
                          {leadTeachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 bg-slate-50/40 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2 mt-3">
                      {stageClassList.map(c => (
                        <div key={c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                          <GraduationCap className="w-3.5 h-3.5 text-[#1a3a6c]" />
                          <span className="text-xs font-semibold text-slate-700">{c.grade_name}</span>
                          <button
                            onClick={() => handleRemoveClassFromStage(c.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {stageClassList.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No classes assigned to this stage yet.</p>
                      )}
                    </div>

                    {addingClassTo === stage.id ? (
                      <div className="mt-3 flex gap-2 items-center">
                        <select
                          value={newClassGrade}
                          onChange={e => setNewClassGrade(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white"
                        >
                          <option value="">— Select a class —</option>
                          {unassignedGrades.map(g => <option key={g}>{g}</option>)}
                        </select>
                        <input
                          type="text"
                          value={newClassGrade}
                          onChange={e => setNewClassGrade(e.target.value)}
                          placeholder="...or type a class name"
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white w-40"
                        />
                        <button
                          onClick={() => handleAddClassToStage(stage.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a3a6c] text-white text-xs font-bold hover:bg-[#14305a] transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Add
                        </button>
                        <button
                          onClick={() => { setAddingClassTo(null); setNewClassGrade(''); }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingClassTo(stage.id); setNewClassGrade(''); }}
                        className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1a3a6c] bg-[#eef0f8] hover:bg-blue-100 border border-blue-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Class to this Stage
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUBJECT TEACHER CLASS ASSIGNMENTS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-700 text-sm">Subject Teacher — Class Assignments</h3>
          <span className="text-xs text-slate-400 ml-1">Assign subject teachers to classes — same class can be assigned twice with different subjects</span>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/30">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Teacher</label>
              <select
                value={assignTeacherId}
                onChange={e => setAssignTeacherId(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white min-w-[180px]"
              >
                <option value="">— Select teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Class</label>
              <select
                value={assignGrade}
                onChange={e => setAssignGrade(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white min-w-[160px]"
              >
                <option value="">— Select class —</option>
                {allGradeNames.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Subject</label>
              <select
                value={assignSubject}
                onChange={e => setAssignSubject(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a6c]/30 focus:border-[#1a3a6c] bg-white min-w-[160px]"
              >
                <option value="">— Select subject —</option>
                {subjectOptions.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button
              onClick={handleAddAssignment}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Assign
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {Object.keys(assignmentsByTeacher).length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400">No subject teacher assignments yet.</p>
              <p className="text-xs text-slate-300 mt-1">Assign a teacher to a class above to get started.</p>
            </div>
          ) : teachers.filter(t => assignmentsByTeacher[t.id]).map(t => {
            const teacherAssignments = assignmentsByTeacher[t.id];
            return (
              <div key={t.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-700">{t.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                    {t.subject && <p className="text-xs text-slate-400">{t.subject}</p>}
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {teacherAssignments.length} assignment{teacherAssignments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-10">
                  {teacherAssignments.map(a => {
                    const stage = keyStages.find(s =>
                      stageClasses.some(c => c.key_stage_id === s.id && c.grade_name === a.grade_name)
                    );
                    return (
                      <div key={a.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                        {stage && (
                          <span className="text-[10px] font-bold text-[#1a3a6c] bg-blue-50 px-1.5 py-0.5 rounded">
                            {stage.name.replace('Key Stage ', 'KS')}
                          </span>
                        )}
                        <GraduationCap className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">{a.grade_name}</span>
                        <span className="text-xs text-emerald-600">· {a.subject || 'General'}</span>
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#eef0f8] flex items-center justify-center mb-2">
            <Layers className="w-4 h-4 text-[#1a3a6c]" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{keyStages.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Key Stages</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stageClasses.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Classes Mapped</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{assignments.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Teacher-Class Links</div>
        </div>
      </div>
    </div>
  );
}
