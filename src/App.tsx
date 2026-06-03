import React from 'react';
import PreQuizSetup from './components/PreQuizSetup';
import AuthWrapper from './components/AuthWrapper';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">
              <span className="font-serif leading-none mt-1">অ</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">ই-টিউশন কুইজ</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">এসএসসি প্রস্তুতি</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <AuthWrapper>
          {(user) => <PreQuizSetup user={user} />}
        </AuthWrapper>
      </main>
    </div>
  );
}

