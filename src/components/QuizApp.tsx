import React, { useState, useEffect } from 'react';
import { Question, QuizState, UserProfile } from '../types';
import { BookOpen, CheckCircle2, ChevronRight, XCircle, RefreshCcw, Award, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getWeekId } from '../utils/dateUtils';
import ETuitionPromo from './ETuitionPromo';

interface QuizAppProps {
  user: UserProfile;
  subjectId: string;
  subjectName: string;
  onBack: () => void;
}

export default function QuizApp({ user, subjectId, subjectName, onBack }: QuizAppProps) {
  const [gameState, setGameState] = useState<QuizState>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<{questionId: string, isCorrect: boolean}[]>([]);
  
  const [unlockedLevel, setUnlockedLevel] = useState(user.progress?.[subjectId]?.level || 1);
  const [selectedLevel, setSelectedLevel] = useState(unlockedLevel);
  const [offsetCount, setOffsetCount] = useState((selectedLevel - 1) * 20);

  useEffect(() => {
    async function fetchUserProgress() {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          const level = data.progress?.[subjectId]?.level || 1;
          setUnlockedLevel(level);
          setSelectedLevel(level);
          setOffsetCount((level - 1) * 20);
        }
      } catch (err) {
        console.error("Error fetching user progress", err);
      }
    }
    fetchUserProgress();
  }, [user.uid, subjectId]);

  useEffect(() => {
    setOffsetCount((selectedLevel - 1) * 20);
    setQuestions([]);
  }, [selectedLevel]);

  const fetchQuestions = async (currentOffset: number = offsetCount): Promise<boolean> => {
    if (currentOffset >= 500) {
        alert('আপনি এই বিষয়ের সর্বোচ্চ ৫০০টি প্রশ্ন সম্পন্ন করেছেন! অভিনন্দন!');
        onBack();
        return false;
    }

    setIsLoading(true);
    setIsGenerating(false);

    try {
      const qRef = collection(db, 'questions');
      const q = query(
        qRef,
        where("class", "==", user.className),
        where("subject", "==", subjectId)
      );
      
      const querySnapshot = await getDocs(q);
      const allDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      allDocs.sort((a, b) => a.createdAt - b.createdAt);
      
      const targetQuestions = allDocs.slice(currentOffset, currentOffset + 20);

      if (targetQuestions.length === 20 || (allDocs.length > 0 && currentOffset + targetQuestions.length >= 500)) {
        setQuestions(targetQuestions);
        return true;
      } else {
        // Need to generate missing questions
        setIsGenerating(true);
        const amountToGenerate = Math.min(20 - targetQuestions.length, 500 - currentOffset); // Generate remaining for full level
        
        const response = await fetch('/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            className: user.className, 
            subject: subjectId,
            limit: amountToGenerate
          }),
        });
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          throw new Error("Server error (timeout or invalid response). Please try again.");
        }
        
        if (!response.ok) {
           if (response.status === 429) {
             throw new Error("AI কোটা সাময়িকভাবে শেষ হয়ে গেছে, অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
           }
           throw new Error(data?.error || "Failed to generate questions");
        }
        
        // The server already saved to firestore and gave us full objects
        setQuestions([...targetQuestions, ...data.questions]);
        return true;
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "দুঃখিত, প্রশ্ন লোড করতে সমস্যা হচ্ছে।");
      return false;
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const startQuiz = async () => {
    let hasQuestions = questions.length > 0;
    if (!hasQuestions) {
      hasQuestions = await fetchQuestions();
    }
    if (hasQuestions) {
      setGameState('playing');
    }
  };

  useEffect(() => {
    // If questions auto-loaded during start screen, don't jump to playing 
    // unless the user explicitly clicks startQuiz
  }, [questions, isLoading, isGenerating, gameState]);

  const restartQuiz = () => {
    setGameState('start');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setHistory([]);
    // Keeping current offsetCount so they can replay the level
  };

  const saveProgress = async () => {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data() as UserProfile;
        const weekId = getWeekId();
        
        const currentProgress = userData.progress || {};
        const subjectProgress = currentProgress[subjectId] || { level: 1, totalScore: 0 };
        
        const newLevel = Math.floor((offsetCount + questions.length) / 20) + 1;
        const finalLevel = Math.max(subjectProgress.level, newLevel);
        
        const updatedSubjectProgress = {
            level: finalLevel,
            totalScore: subjectProgress.totalScore + score
        };
        
        if (finalLevel > unlockedLevel) {
            setUnlockedLevel(finalLevel);
        }

        const scoresMap = userData.scores || {};
        const currentWeekScore = scoresMap[weekId] || 0;
        const updatedWeekScore = currentWeekScore + score;
        
        await updateDoc(userRef, {
            [`progress.${subjectId}`]: updatedSubjectProgress,
            [`scores.${weekId}`]: updatedWeekScore,
            updatedAt: Date.now()
        });
    } catch (err) {
        console.error("Error saving progress", err);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setHistory(prev => [...prev, { questionId: currentQuestion.id, isCorrect }]);
    setIsAnswerSubmitted(true);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      await saveProgress();
      setGameState('result');
    }
  };

  const loadMoreQuestions = async () => {
    setGameState('start');
    const newLevel = Math.floor(offsetCount / 20) + 2;
    setSelectedLevel(newLevel);
    const newOffset = offsetCount + 20;
    setOffsetCount(newOffset);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0); 
    setHistory([]);
    const success = await fetchQuestions(newOffset);
    if (success) {
      setGameState('playing');
    }
  }

  if (gameState === 'start') {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 w-full h-full max-w-md mx-auto relative mt-16">
          <div className="bg-indigo-50 text-indigo-600 p-5 rounded-3xl mb-8 border border-indigo-100 shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
             <Sparkles size={48} strokeWidth={1.5} className="animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">নতুন প্রশ্ন তৈরি হচ্ছে!</h2>
          <p className="text-slate-500 mb-2 leading-relaxed text-sm md:text-base">
            AI আপনার জন্য বিশেষভাবে নতুন প্রশ্ন তৈরি করছে। এতে প্রায় ৩০ সেকেন্ড সময় লাগতে পারে।
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6 w-full">
            <p className="text-sm text-amber-800 font-medium text-center">
              দয়া করে এই পাতাটি বন্ধ করবেন না, প্রশ্ন লোডিং চলছে...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div id="start-screen" className="flex flex-col items-center justify-center flex-1 text-center px-4 w-full relative">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold px-4 py-2 border border-slate-200 rounded-lg bg-white shadow-sm">
          <ArrowLeft size={18} /> ফিরে যান
        </button>

        <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-6 mt-16">
          <BookOpen size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">
          {subjectName}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 mb-6 max-w-lg leading-relaxed">
          {subjectName} বিষয়ের ২০টি নতুন বহুনির্বাচনি প্রশ্নের (MCQ) মাধ্যমে তোমার প্রস্তুতি যাচাই করো। 
        </p>

        <div className="mb-8 w-full max-w-[200px] text-left relative">
           <label className="block text-sm font-bold text-slate-600 mb-2 text-center text-slate-800">লেভেল নির্বাচন করুন:</label>
           <select 
             value={selectedLevel}
             onChange={(e) => setSelectedLevel(Number(e.target.value))}
             className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm cursor-pointer text-center text-lg"
           >
             {Array.from({ length: unlockedLevel }).map((_, i) => (
                <option key={i+1} value={i+1}>লেভেল {i+1}</option>
             ))}
           </select>
           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500">
             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
           </div>
        </div>
        
        <button
          onClick={startQuiz}
          disabled={isLoading}
          id="btn-start-quiz"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-100 min-w-[200px]"
        >
          {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
            <>কুইজ শুরু করো <ChevronRight size={20} /></>
          )}
        </button>
      </div>
    );
  }

  if (gameState === 'result') {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "ভালো প্রস্তুতি!";
    let subMessage = "আরও অনুশীলনের মাধ্যমে তুমি আরও ভালো করতে পারবে।";
    
    if (percentage >= 80) {
      message = "অসাধারণ পারফরম্যান্স!";
      subMessage = "এভাবেই ধারা বজায় রাখো, পরীক্ষায় ভালো ফলাফল নিশ্চিত।";
    } else if (percentage < 50) {
      message = "আরও প্রস্তুতি প্রয়োজন!";
      subMessage = "অধ্যায়গুলো আবার ভালোভাবে পড়ো।";
    }

    return (
      <div id="result-screen" className="flex flex-col items-center w-full max-w-3xl mx-auto py-12 px-4 relative">
        <button onClick={onBack} className="absolute left-4 top-0 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold px-4 py-2 border border-slate-200 rounded-lg bg-white shadow-sm">
          <ArrowLeft size={18} /> বিষয় নির্বাচন
        </button>
        
        <div className="w-24 h-24 mt-12 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-200">
          <Award size={48} className={percentage >= 80 ? "text-emerald-500" : (percentage >= 50 ? "text-amber-500" : "text-rose-500")} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{message}</h1>
        <p className="text-slate-500 mb-8">{subMessage}</p>
        
        <div className="bg-white border border-slate-200 rounded-2xl w-full p-8 mb-8 text-center flex flex-col md:flex-row justify-around items-center gap-6 shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">প্রাপ্ত নম্বর</p>
            <p className="text-5xl font-bold text-slate-800">{score}<span className="text-2xl text-slate-400 font-medium">/{questions.length}</span></p>
          </div>
          <div className="h-16 w-px bg-slate-200 hidden md:block"></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">সঠিকতার হার</p>
            <p className="text-5xl font-bold text-emerald-500">{percentage}%</p>
          </div>
        </div>

        <div className="w-full mb-8">
          <ETuitionPromo />
        </div>

        <div className="flex gap-4 mb-12">
          <button
            onClick={restartQuiz}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-lg px-8 py-3 rounded-md transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <RefreshCcw size={20} />
            পুনরায় চেষ্টা
          </button>
          
          <button
            onClick={loadMoreQuestions}
            disabled={isLoading || offsetCount + 20 >= 500}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-lg px-8 py-3 rounded-md transition-colors duration-200 flex items-center gap-2 shadow-sm min-w-[200px] justify-center disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : "পরবর্তী লেভেল"}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;
  const progressPercentage = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div id="quiz-screen" className="w-full max-w-2xl mx-auto px-4 py-8 relative">
       <button onClick={() => setGameState('start')} className="absolute top-0 right-4 px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-100 bg-white shadow-sm mt-8 relative z-10">
          বন্ধ করুন
       </button>
      {/* Progress Bar */}
      <div className="mb-8 mt-12">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-slate-500">প্রশ্ন {currentQuestionIndex + 1} / {questions.length}</span>
          <span className="text-sm font-bold text-blue-600">স্কোর: {score}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-blue-600 h-1.5 transition-all duration-300 ease-in-out" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 mb-6 shadow-sm relative overflow-hidden">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider mb-4 inline-block">
          পরিচ্ছেদ: {subjectName} - লেভেল {Math.floor(offsetCount / 20) + 1}
        </span>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">
          {currentQuestionIndex + 1}. {currentQuestion.text}
        </h2>

        <div className="space-y-4">
          {currentQuestion.options.map((option, index) => {
            let optionStyles = "border border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700 bg-white group";
            let radioCircleStyles = "border-2 border-slate-300 group-hover:border-blue-400";
            let radioInner = null;
            let indicator = null;

            if (selectedOption === index) {
              optionStyles = "border-2 border-blue-600 bg-white text-slate-800 group shadow-sm";
              radioCircleStyles = "border-2 border-blue-600 group-hover:bg-blue-50";
              radioInner = <div className="w-3 h-3 bg-blue-600 rounded-full"></div>;
            }

            if (isAnswerSubmitted) {
              if (index === currentQuestion.correctAnswerIndex) {
                optionStyles = "border-2 border-emerald-500 bg-emerald-50 text-emerald-900";
                radioCircleStyles = "border-2 border-emerald-500";
                radioInner = <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>;
                indicator = <CheckCircle2 size={24} className="text-emerald-500 shrink-0 ml-auto" />;
              } else if (selectedOption === index) {
                optionStyles = "border-2 border-rose-500 bg-rose-50 text-rose-900";
                radioCircleStyles = "border-2 border-rose-500";
                radioInner = <div className="w-3 h-3 bg-rose-500 rounded-full"></div>;
                indicator = <XCircle size={24} className="text-rose-500 shrink-0 ml-auto" />;
              } else {
                optionStyles = "border border-slate-200 bg-slate-50 text-slate-400 opacity-60";
                radioCircleStyles = "border-2 border-slate-200";
              }
            }

            return (
              <button
                key={index}
                id={`option-${index}`}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswerSubmitted}
                className={`w-full text-left p-5 rounded-xl transition-all duration-200 flex items-center shadow-sm ${optionStyles}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors ${radioCircleStyles}`}>
                  {radioInner}
                </div>
                <span className="font-medium text-lg leading-snug">{option}</span>
                {indicator}
              </button>
            );
          })}
        </div>

        {isAnswerSubmitted && (
          <div className={`mt-6 p-5 rounded-xl flex gap-3 items-start ${selectedOption === currentQuestion.correctAnswerIndex ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
            {selectedOption === currentQuestion.correctAnswerIndex 
              ? <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" /> 
              : <XCircle size={24} className="text-rose-600 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold mb-1">
                {selectedOption === currentQuestion.correctAnswerIndex ? "সঠিক উত্তর!" : "ভুল উত্তর!"}
              </p>
              <p className="opacity-90 leading-relaxed text-sm md:text-base">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pb-8">
        {!isAnswerSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            id="btn-submit-answer"
            className={`px-8 py-3 rounded-md font-semibold text-lg transition-colors duration-200 shadow-sm ${
              selectedOption !== null 
                ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            উত্তর নিশ্চিত করো
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            id="btn-next-question"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors duration-200 shadow-md shadow-blue-100"
          >
            {currentQuestionIndex < questions.length - 1 ? "পরবর্তী প্রশ্ন" : "ফলাফল দেখো"}
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
