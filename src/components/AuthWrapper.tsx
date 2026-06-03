import React, { useEffect, useState } from 'react';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { BookOpen } from 'lucide-react';

interface AuthWrapperProps {
  children: (user: UserProfile) => React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([{ id: 'SSC', name: 'SSC' }]);

  // Profile Form State
  const [name, setName] = useState('');
  const [className, setClassName] = useState('SSC');
  const [school, setSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'classes')).then(snap => {
      if (!snap.empty) {
        const cls = snap.docs.map(d => ({id: d.id, name: d.data().name}));
        setClasses(cls);
        setClassName(cls[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch user profile from firestore
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Profile doesn't exist yet, populate default values from google
            setName(user.displayName || '');
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setIsSubmitting(true);
    
    try {
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name,
        className,
        school,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setUserProfile(newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile. Please check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
         <div className="animate-pulse text-blue-600 font-medium">Loading...</div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto w-full">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
           <BookOpen size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">স্বাগতম!</h2>
        <p className="text-slate-500 mb-8">ই-টিউশন কুইজে অংশগ্রহণ করতে লগইন করুন</p>
        
        <button
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Google দিয়ে লগইন করুন
        </button>
      </div>
    );
  }

  if (!userProfile) {
    // Setup Profile Screen
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">আপনার তথ্য দিন</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">নাম</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="আপনার পূর্ণ নাম"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">শ্রেণী</label>
              <select 
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">বিদ্যালয়ের নাম</label>
              <input 
                required
                type="text" 
                value={school}
                onChange={e => setSchool(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="স্কুলের নাম লিখুন"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children(userProfile)}</>;
}
