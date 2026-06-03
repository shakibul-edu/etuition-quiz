import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Trophy, Award } from 'lucide-react';
import { getWeekId } from '../utils/dateUtils';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const weekId = getWeekId();
        const scoreField = `scores.${weekId}`;
        
        const q = query(
          collection(db, 'users'),
          orderBy(scoreField, 'desc'),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        setLeaders(snapshot.docs.map(doc => doc.data() as UserProfile));
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 w-full shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
            <Trophy size={20} strokeWidth={2} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">সাপ্তাহিক লিডারবোর্ড</h3>
      </div>
      
      {loading ? (
        <div className="h-32 flex items-center justify-center text-slate-400 font-medium">লোড হচ্ছে...</div>
      ) : leaders.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-slate-400">
           <Award size={32} className="mb-2 opacity-50" />
           <p className="font-medium">এই সপ্তাহের লিডারবোর্ড এখনও ফাঁকা!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader, index) => {
            const weekScore = leader.scores?.[getWeekId()] || 0;
            if (weekScore === 0) return null; // hide users with 0 specific week score
            
            return (
              <div key={leader.uid} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' : 
                      index === 2 ? 'bg-orange-100 text-orange-700' : 
                      'bg-white border border-slate-200 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{leader.name}</p>
                    <p className="text-xs text-slate-500">{leader.school}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{weekScore}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
