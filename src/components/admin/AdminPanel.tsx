import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, writeBatch, doc, getDocs, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { UploadCloud, CheckCircle, Database, Book, Users, Trash, Edit2, Plus, X } from 'lucide-react';
import { Question } from '../../types';

// We'll put all the admin components here to avoid token bloat for many tiny files

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'upload' | 'questions' | 'subjects' | 'classes'>('upload');
  
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8 w-full shadow-sm mb-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <Database className="text-blue-400" size={28} />
        <h3 className="text-xl font-bold">অ্যাডমিন প্যানেল</h3>
      </div>
      
      <div className="flex gap-2 border-b border-slate-700 pb-4 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>আপলোড</button>
        <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'questions' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>প্রশ্নসমূহ</button>
        <button onClick={() => setActiveTab('subjects')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'subjects' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>বিষয়</button>
        <button onClick={() => setActiveTab('classes')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'classes' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>শ্রেণী</button>
      </div>

      {activeTab === 'upload' && <UploadTab />}
      {activeTab === 'questions' && <QuestionsTab />}
      {activeTab === 'subjects' && <SubjectsTab />}
      {activeTab === 'classes' && <ClassesTab />}
    </div>
  );
}

function UploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState<string>('bangla-1');
  const [classId, setClassId] = useState<string>('SSC');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    getDocs(collection(db, 'subjects')).then(snap => {
      const subs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subs);
      if (subs.length > 0) setSubjectId(subs[0].id);
    });
    getDocs(collection(db, 'classes')).then(snap => {
      const cls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(cls);
      if (cls.length > 0) setClassId(cls[0].id);
    });
  }, []);

  const handleUpload = async () => {
    if (!file) return setStatus("দয়া করে একটি ফাইল নির্বাচন করুন।");
    setIsUploading(true);
    setStatus("ফাইল পড়া হচ্ছে...");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const contents = e.target?.result as string;
          const questions = JSON.parse(contents);
          if (!Array.isArray(questions)) throw new Error("JSON ফাইলটি একটি array হতে হবে।");
          
          setStatus(`Uploading ${questions.length} questions...`);
          const chunkSize = 50;
          for (let i = 0; i < questions.length; i += chunkSize) {
              const chunk = questions.slice(i, i + chunkSize);
              const batch = writeBatch(db);
              for (let j = 0; j < chunk.length; j++) {
                const qData = chunk[j];
                const docRef = doc(collection(db, "questions"));
                batch.set(docRef, {
                  text: qData.text,
                  options: qData.options,
                  correctAnswerIndex: qData.correctAnswerIndex,
                  explanation: qData.explanation || "",
                  subject: qData.subject || subjectId,
                  class: qData.class || classId,
                  createdAt: Date.now() + i + j
                });
              }
              await batch.commit();
              setStatus(`Uploaded ${Math.min(i + chunkSize, questions.length)} of ${questions.length}...`);
          }
          setStatus(`সাফল্যের সাথে ${questions.length} টি প্রশ্ন আপলোড হয়েছে!`);
          setFile(null);
        } catch (err: any) { setStatus(`Upload failed: ${err.message}`); } finally { setIsUploading(false); }
      };
      reader.onerror = () => { setStatus("ফাইল পড়তে সমস্যা হচ্ছে।"); setIsUploading(false); };
      reader.readAsText(file);
    } catch (err: any) { setStatus(`Error: ${err.message}`); setIsUploading(false); }
  };

  return (
    <div>
      <p className="text-slate-400 mb-6 text-sm">JSON ফাইলে প্রশ্ন আপলোড করুন। ফাইলে subject এবং class ফিল্ড না থাকলে নিচে সিলেক্ট করা ফিল্ড ব্যবহৃত হবে।</p>
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="text-sm border border-slate-600 p-2 rounded-lg bg-slate-700 w-full sm:w-auto text-white">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="text-sm border border-slate-600 p-2 rounded-lg bg-slate-700 w-full sm:w-auto text-white">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
        </select>
        <input type="file" accept=".json" onChange={(e) => e.target.files && setFile(e.target.files[0])} className="text-sm border border-slate-600 p-2 rounded-lg bg-slate-700 w-full sm:w-auto"/>
        <button onClick={handleUpload} disabled={!file || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 w-full sm:w-auto">
          {isUploading ? 'আপলোড হচ্ছে...' : 'আপলোড করুন'}
        </button>
      </div>
      {status && <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600 text-sm font-medium text-slate-300">{status}</div>}
    </div>
  );
}

function QuestionEditor({ q, onSave, onCancel, classes, subjects }: { q?: Question, onSave: ()=>void, onCancel: ()=>void, classes: any[], subjects: any[] }) {
  const [text, setText] = useState(q?.text || '');
  const [opts, setOpts] = useState(q?.options || ['', '', '', '']);
  const [ansIdx, setAnsIdx] = useState(q ? q.correctAnswerIndex.toString() : '0');
  const [exp, setExp] = useState(q?.explanation || '');
  const [Subj, setSubj] = useState(q?.subject || (subjects.length > 0 ? subjects[0].id : ''));
  const [Cls, setCls] = useState(q?.class || (classes.length > 0 ? classes[0].id : ''));
  const [saving, setSaving] = useState(false);

  const handleOptChange = (idx: number, val: string) => {
    const n = [...opts]; n[idx] = val; setOpts(n);
  };

  const save = async () => {
    if (!text || opts.some(x=>!x)) return alert('Missing text or options');
    setSaving(true);
    const data = {
      text, options: opts, correctAnswerIndex: parseInt(ansIdx), explanation: exp, subject: Subj, class: Cls,
    };
    if (q) {
      await updateDoc(doc(db, 'questions', q.id), data);
    } else {
      await addDoc(collection(db, 'questions'), { ...data, createdAt: Date.now() });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="bg-slate-700 p-4 rounded-lg mb-4 space-y-4">
      <div className="flex gap-4">
        <select value={Cls} onChange={e=>setCls(e.target.value)} className="bg-slate-600 p-2 rounded">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={Subj} onChange={e=>setSubj(e.target.value)} className="bg-slate-600 p-2 rounded">
          {subjects.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
        </select>
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Question Text" className="w-full bg-slate-600 p-2 rounded" />
      {opts.map((o, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input type="radio" name="ans" checked={parseInt(ansIdx) === idx} onChange={()=>setAnsIdx(idx.toString())} />
          <input value={o} onChange={e=>handleOptChange(idx, e.target.value)} placeholder={`Option ${idx+1}`} className="w-full bg-slate-600 p-2 rounded" />
        </div>
      ))}
      <textarea value={exp} onChange={e=>setExp(e.target.value)} placeholder="Explanation (optional)" className="w-full bg-slate-600 p-2 rounded" />
      
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="bg-blue-600 px-4 py-2 rounded font-bold">{saving ? 'Saving...' : 'Save Question'}</button>
        <button onClick={onCancel} className="bg-slate-600 px-4 py-2 rounded font-bold">Cancel</button>
      </div>
    </div>
  )
}

function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'questions'));
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    all.sort((a,b) => b.createdAt - a.createdAt);
    setQuestions(all);
    setFilteredQuestions(all);

    getDocs(collection(db, 'subjects')).then(s => setSubjects(s.docs.map(x=>({id:x.id,...x.data()}))));
    getDocs(collection(db, 'classes')).then(s => setClasses(s.docs.map(x=>({id:x.id,...x.data()}))));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  
  useEffect(() => {
    let f = questions;
    if (filterClass) f = f.filter(q => q.class === filterClass);
    if (filterSubject) f = f.filter(q => q.subject === filterSubject);
    if (searchQuery) f = f.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredQuestions(f);
    setLimit(20);
  }, [filterClass, filterSubject, searchQuery, questions]);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      await deleteDoc(doc(db, 'questions', id));
      setQuestions(q => q.filter(x => x.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  if (loading) return <div>লোড হচ্ছে...</div>;

  if (editingQ || creating) {
    return <QuestionEditor q={editingQ || undefined} classes={classes} subjects={subjects} 
      onCancel={()=>{setEditingQ(null); setCreating(false);}} 
      onSave={()=>{setEditingQ(null); setCreating(false); fetchData();}} 
    />
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Search questions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-700 p-2 rounded w-full sm:w-auto flex-1 min-w-[200px]"
          />
          <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="bg-slate-700 p-2 rounded">
            <option value="">All Classes</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} className="bg-slate-700 p-2 rounded">
            <option value="">All Subjects</option>
            {subjects.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => setCreating(true)} className="bg-blue-600 px-4 py-2 rounded font-bold flex items-center gap-2"><Plus size={16}/> Question</button>
      </div>

      <div className="space-y-4">
        <div className="text-sm text-slate-400">Showing {Math.min(limit, filteredQuestions.length)} of {filteredQuestions.length}</div>
        {filteredQuestions.slice(0, limit).map(q => (
          <div key={q.id} className="bg-slate-700 p-4 rounded-lg flex justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Class: {q.class} | Subject: {q.subject}</div>
              <div className="font-medium mb-2">{q.text}</div>
              <ul className="text-sm space-y-1 mb-2">
                {q.options.map((opt, i) => (
                  <li key={i} className={i === q.correctAnswerIndex ? 'text-green-400 font-bold' : 'text-slate-300'}>{opt}</li>
                ))}
              </ul>
              {q.explanation && <div className="text-sm text-yellow-400/80">Explanation: {q.explanation}</div>}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setEditingQ(q)} className="p-2 bg-blue-900/50 text-blue-400 rounded hover:bg-blue-900"><Edit2 size={16}/></button>
              {confirmDeleteId === q.id ? (
                <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-xs uppercase" title="Click again to confirm">Confirm</button>
              ) : (
                <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900"><Trash size={16}/></button>
              )}
            </div>
          </div>
        ))}
        {limit < filteredQuestions.length && (
          <button className="bg-slate-700 px-4 py-2 rounded w-full font-bold" onClick={() => setLimit(l => l + 20)}>Load More</button>
        )}
      </div>
    </div>
  );
}

function SubjectsTab() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const fetchSubjects = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'subjects'));
    setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };
  useEffect(() => { fetchSubjects(); }, []);

  const handleAdd = async () => {
    if (!name || !id) return;
    await updateDoc(doc(db, 'subjects', id), { name }).catch(async () => {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'subjects', id), { name, border: 'border-blue-200', bg: 'bg-blue-50', color: 'text-blue-600' });
    });
    setId(''); setName('');
    fetchSubjects();
  };
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (sid: string) => {
    if(confirmDeleteId === sid) {
      await deleteDoc(doc(db, 'subjects', sid));
      fetchSubjects();
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(sid);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input placeholder="ID (e.g. math-1)" value={id} onChange={e=>setId(e.target.value)} className="bg-slate-700 p-2 rounded text-white" />
        <input placeholder="Name (e.g. Mathematics)" value={name} onChange={e=>setName(e.target.value)} className="bg-slate-700 p-2 rounded text-white flex-1" />
        <button onClick={handleAdd} className="bg-blue-600 px-4 rounded font-bold"><Plus size={20}/></button>
      </div>
      <div className="space-y-2">
        {subjects.map(s => (
          <div key={s.id} className="bg-slate-700 p-3 rounded flex justify-between items-center">
            <div><span className="font-bold">{s.name}</span> <span className="text-sm text-slate-400 ml-2">({s.id})</span></div>
            {confirmDeleteId === s.id ? (
              <button onClick={() => handleDelete(s.id)} className="text-red-500 font-bold text-xs uppercase px-2 py-1 bg-red-100 rounded">Confirm</button>
            ) : (
              <button onClick={() => handleDelete(s.id)} className="text-red-400"><Trash size={16}/></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassesTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const fetchClasses = async () => {
    const snap = await getDocs(collection(db, 'classes'));
    setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };
  useEffect(() => { fetchClasses(); }, []);

  const handleAdd = async () => {
    if (!name || !id) return;
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'classes', id), { name });
    setId(''); setName('');
    fetchClasses();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (cid: string) => {
    if(confirmDeleteId === cid) {
      await deleteDoc(doc(db, 'classes', cid));
      fetchClasses();
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(cid);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input placeholder="ID (e.g. Class_9)" value={id} onChange={e=>setId(e.target.value)} className="bg-slate-700 p-2 rounded text-white" />
        <input placeholder="Name (e.g. Class 9)" value={name} onChange={e=>setName(e.target.value)} className="bg-slate-700 p-2 rounded text-white flex-1" />
        <button onClick={handleAdd} className="bg-blue-600 px-4 rounded font-bold"><Plus size={20}/></button>
      </div>
      <div className="space-y-2">
        {classes.map(c => (
          <div key={c.id} className="bg-slate-700 p-3 rounded flex justify-between items-center">
            <div><span className="font-bold">{c.name}</span> <span className="text-sm text-slate-400 ml-2">({c.id})</span></div>
            {confirmDeleteId === c.id ? (
              <button onClick={() => handleDelete(c.id)} className="text-red-500 font-bold text-xs uppercase px-2 py-1 bg-red-100 rounded">Confirm</button>
            ) : (
              <button onClick={() => handleDelete(c.id)} className="text-red-400"><Trash size={16}/></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
