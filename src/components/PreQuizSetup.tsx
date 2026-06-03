import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import QuizApp from './QuizApp';
import Leaderboard from './Leaderboard';
import AdminUpload from './AdminUpload';
import ETuitionPromo from './ETuitionPromo';
import * as Icons from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PreQuizSetupProps {
  user: UserProfile;
}

export default function PreQuizSetup({ user }: PreQuizSetupProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        const subs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (subs.length > 0) {
          setSubjects(subs);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

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
      <div className="w-full mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">হ্যালো, {user.name}!</h2>
        <p className="text-slate-500 font-medium mt-1">শ্রেণী: {user.className} • স্কুল: {user.school}</p>
      </div>

      {user.email === 'shakibulislamj@gmail.com' && (
        <AdminUpload />
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
