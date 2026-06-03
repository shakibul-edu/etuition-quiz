import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, writeBatch, doc, collection } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const rawConfig = fs.readFileSync("./firebase-applet-config.json", "utf-8");
const firebaseConfig = JSON.parse(rawConfig);
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to fetch or generate questions
  app.post("/api/questions/generate", async (req, res) => {
    try {
      const { className, subject, limit = 20 } = req.body;

      if (!className || !subject) {
        return res.status(400).json({ error: "Missing className or subject" });
      }

      // We need to generate questions
      const prompt = `Generate ${limit} multiple choice questions for class ${className} (Bangladesh standard SSC 2026 syllabus) on the subject of ${subject}. Incorporate previous year board questions patterns. The medium of instruction is Bengali.
Provide the response as a JSON array where each object has the following structure:
{
  "text": "The question text in Bengali",
  "options": ["Option 1 in Bengali", "Option 2", "Option 3", "Option 4"],
  "correctAnswerIndex": <index from 0 to 3>,
  "explanation": "Explanation for the correct answer in Bengali"
}
Only output the JSON array, no other text. IMPORTANT: Ensure these are unique and different from typical common questions.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7,
        }
      });

      const textOutput = aiResponse.text;
      if (!textOutput) {
          throw new Error("No response from AI");
      }
      
      let cleanText = textOutput.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      let newQuestions;
      try {
        newQuestions = JSON.parse(cleanText);
      } catch (e: any) {
        console.error("JSON Parse Error. The AI Output was:", textOutput);
        throw new Error("AI response was not valid JSON: " + e.message);
      }

      
      // Save directly to firestore
      try {
          const batch = writeBatch(db);
          const docsToReturn = [];
          
          for (let i = 0; i < newQuestions.length; i++) {
              const generatedQ = newQuestions[i];
              const docRef = doc(collection(db, 'questions'));
              const qData = {
                  ...generatedQ,
                  subject: subject,
                  class: className,
                  createdAt: Date.now() + i
              };
              batch.set(docRef, qData);
              docsToReturn.push({ id: docRef.id, ...qData });
          }
          await batch.commit();
          
          res.json({ questions: docsToReturn });
      } catch (dbErr) {
          console.error("Error saving to db in server", dbErr);
          res.json({ questions: newQuestions });
      }
      
    } catch (error: any) {
      console.error("Error generating questions:", error);
      if (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({ error: "AI generation limit reached. Please try again later." });
      } else {
        res.status(500).json({ error: "Failed to load questions" });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
