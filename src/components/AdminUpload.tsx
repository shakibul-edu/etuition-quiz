import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { UploadCloud, CheckCircle } from 'lucide-react';

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState<string>('bangla-1');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        const subs = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        if (subs.length > 0) {
          setSubjects(subs);
          setSubjectId(subs[0].id);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    };
    fetchSubjects();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("দয়া করে একটি ফাইল নির্বাচন করুন।");
      return;
    }

    setIsUploading(true);
    setStatus("ফাইল পড়া হচ্ছে...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const contents = e.target?.result as string;
          const questions = JSON.parse(contents);

          if (!Array.isArray(questions)) {
             throw new Error("JSON ফাইলটি একটি array হতে হবে।");
          }

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
                  class: qData.class || "SSC",
                  createdAt: Date.now() + i + j
                });
              }
              await batch.commit();
              setStatus(`Uploaded ${Math.min(i + chunkSize, questions.length)} of ${questions.length}...`);
          }

          setStatus(`সাফল্যের সাথে ${questions.length} টি প্রশ্ন আপলোড হয়েছে!`);
          setFile(null);
        } catch (err: any) {
          setStatus(`Upload failed: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setStatus("ফাইল পড়তে সমস্যা হচ্ছে।");
        setIsUploading(false);
      };

      reader.readAsText(file);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8 w-full shadow-sm mb-8 text-white">
      <div className="flex items-center gap-3 mb-4">
        <UploadCloud className="text-blue-400" size={28} />
        <h3 className="text-xl font-bold">অ্যাডমিন প্যানেল: প্রশ্ন আপলোড</h3>
      </div>
      <p className="text-slate-400 mb-6 text-sm">JSON ফাইলে প্রশ্ন আপলোড করুন। ফাইলে subject এবং class ফিল্ড না থাকলে নিচে সিলেক্ট করা বিষয় ব্যবহৃত হবে।</p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <select 
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="text-sm border border-slate-600 p-2 rounded-lg bg-slate-700 w-full sm:w-auto text-white"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        
        <input 
          type="file" 
          accept=".json"
          onChange={handleFileChange}
          className="text-sm border border-slate-600 p-2 rounded-lg bg-slate-700 w-full sm:w-auto"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          {isUploading ? 'আপলোড হচ্ছে...' : 'আপলোড করুন'}
        </button>
      </div>
      
      {status && (
        <div className="mt-4 flex items-start gap-2 bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          <span className="text-sm font-medium text-slate-300">{status}</span>
        </div>
      )}
    </div>
  );
}
