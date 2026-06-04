import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import QuizApp from './QuizApp';
import Leaderboard from './Leaderboard';
import AdminPanel from './admin/AdminPanel';
import ETuitionPromo from './ETuitionPromo';
import * as Icons from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Edit2, X } from 'lucide-react';

interface PreQuizSetupProps {
  user: UserProfile;
}

export default function PreQuizSetup({ user }: PreQuizSetupProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editClass, setEditClass] = useState(user.className);
  const [editSchool, setEditSchool] = useState(user.school);
  const [classes, setClasses] = useState<any[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        const subs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (subs.length > 0) {
          setSubjects(subs);
        }
        
        const classSnap = await getDocs(collection(db, 'classes'));
        const cls = classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (cls.length > 0) {
          setClasses(cls);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        className: editClass,
        school: editSchool,
        updatedAt: Date.now()
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Error saving profile", err);
      alert("Profile save failed.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (selectedSubject) {
    const subjectDetails = subjects.find(s => s.id === selectedSubject);
    return (
      <QuizApp 
        user={user} 
        subjectId={subjectDetails?.id || selectedSubject}
        subjectName={subjectDetails?.name || selectedSubject} 
        onBack={() => setSelectedSubject(null)} 
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-8">
      <div className="w-full mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">হ্যালো, {user.name}!</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-500 font-medium">শ্রেণী: {user.className} • স্কুল: {user.school}</p>
             <button onClick={() => { setEditClass(user.className); setEditSchool(user.school); setIsEditingProfile(true); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-full px-2 text-xs flex items-center gap-1"><Edit2 size={12}/> Edit</button>
          </div>
        </div>
      </div>
      
      {isEditingProfile && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">প্রোফাইল আপডেট করুন</h3>
                <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
             </div>
             
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">শ্রেণী</label>
                  <select value={editClass} onChange={(e) => setEditClass(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3">
                     {classes.length > 0 ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value={editClass}>{editClass}</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">বিদ্যালয়ের নাম</label>
                  <input value={editSchool} onChange={e => setEditSchool(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3" />
                </div>
                
                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 shadow-sm transition-colors disabled:opacity-50">
                  {isSavingProfile ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
             </div>
          </div>
        </div>
      )}

      {user.email === 'shakibulislamj@gmail.com' && (
        <AdminPanel />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 w-full shadow-sm mb-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">বিষয় নির্বাচন করো</h3>
        {loading ? (
          <div className="flex justify-center p-8"><span className="animate-pulse text-slate-400">লোড হচ্ছে...</span></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map(subject => {
              const Icon = (Icons as any)[subject.iconName || 'Book'] || Icons.Book;
              const progress = user.progress?.[subject.id];
              const currentLevel = progress ? progress.level : 1;
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${subject.border || 'border-slate-200'} bg-white group cursor-pointer relative`}
                >
                  <div className="absolute top-3 right-3 px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 tracking-wider">লেভেল {currentLevel}/25</div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${subject.bg || 'bg-slate-50'} ${subject.color || 'text-slate-600'} group-hover:scale-110 transition-transform`}>
                     <Icon size={32} strokeWidth={1.5} />
                  </div>
                  <span className="font-bold text-slate-700">{subject.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      
      <div className="w-full mb-8">
        <ETuitionPromo />
      </div>

      <Leaderboard />
    </div>
  );
}
