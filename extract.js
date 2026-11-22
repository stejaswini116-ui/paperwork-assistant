import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
const notice = `Dear student, your hostel fee of Rs. 12,500 for the
second semester must be paid on or before 10 December 2026 at the
accounts office. A late fee of Rs. 500 applies after this date.`;

const prompt = `You read notices and bills. Return ONLY JSON with keys:
deadline (YYYY-MM-DD or null), amount (number or null),
action (short sentence), confidence (0 to 1),
needs_user_input (true if anything is unclear).
Do not guess. If unsure, use null and set needs_user_input to true.

Notice:
${notice}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callWithRetry(fn, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (![429, 503].includes(e.status) || i === tries) throw e;
      const wait = i * 5000;
      console.log(`Model busy, retrying in ${wait / 1000}s...`);
      await sleep(wait);
    }
  }
}

async function extract() {
  for (const model of MODELS) {
    try {
      const res = await callWithRetry(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        })
      );
      return JSON.parse(res.text);
    } catch (e) {
      console.log(`${model} failed (${e.status}), trying the next one...`);
    }
  }
  throw new Error("All models are busy. Try again later.");
}

console.log(await extract());