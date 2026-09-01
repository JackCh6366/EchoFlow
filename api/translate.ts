import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load standard .env
dotenv.config();

// Load .env.local if it exists (takes precedence)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const GEMINI_TRANSLATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 處理 CORS OPTIONS 預檢請求
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "只支援 POST 請求方法。" });
  }

  try {
    const { text, targetLang = "zh-TW" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "缺少待翻譯的文字內容" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "伺服器未設定 GEMINI_API_KEY。" });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptText = `你是一個專業的雙語同步口譯與翻譯助理。請將以下提供的文字內容完整翻譯為「繁體中文（台灣，zh-TW）」。

請遵守以下規範：
1. 翻譯時講求「信、達、雅」，語氣自然流暢、貼合目標語言的日常用語習慣。
2. **嚴格保留原本所有的 Markdown 排版格式**（如標題 #, ##, ###、粗體 **、列表 -, *, 1.、分隔線 --- 及換行符號）。
3. 不要添加任何開場白或結尾說明（如「這是翻譯結果：」），直接輸出翻譯後的最終文字。

【待翻譯內容】：
${text}`;

    let translatedText = "";
    let lastError: any = null;

    for (const model of GEMINI_TRANSLATE_MODELS) {
      try {
        console.log(`[Translate API] 嘗試呼叫模型: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: promptText }],
        });
        translatedText = response.text || "";
        if (translatedText.trim()) {
          console.log(`[Translate API] 模型呼叫成功: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Translate API] 模型 ${model} 呼叫失敗:`, err.message || err);
        lastError = err;
      }
    }

    if (!translatedText.trim()) {
      throw lastError || new Error("翻譯服務暫時無法取得有效回應。");
    }

    return res.status(200).json({ text: translatedText.trim() });
  } catch (err: any) {
    console.error("[Translate API Exception]:", err);
    return res.status(500).json({ error: err.message || "文字翻譯過程中發生異常" });
  }
}
