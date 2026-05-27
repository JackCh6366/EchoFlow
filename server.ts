import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// 設定較大的 Body 限制以支援音檔 Base64 傳輸
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 初始化 Gemini 客户端
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API 路由: 檢查 API Key 狀態
app.get("/api/config", (req, res) => {
  const apiKeyExists = !!process.env.GEMINI_API_KEY;
  res.json({ apiKeyExists });
});

// API 路由: 音檔轉文字處理
app.post("/api/transcribe", async (req, res) => {
  try {
    const { fileData, mimeType, options } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "缺少音檔數據或媒體類型(mimeType)" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: "未在伺服器上偵測到 GEMINI_API_KEY。請在 AI Studio 中透過 'Settings > Secrets' 進行設定。",
      });
    }

    // 處理 Base64
    let base64Data = fileData;
    if (fileData.includes(";base64,")) {
      base64Data = fileData.split(";base64,")[1];
    }

    // 依據前端選擇的模式，準備提示詞
    const mode = options?.mode || "transcribe";
    const language = options?.language || "zh-TW";
    const punctuation = options?.punctuation !== false; // 預設開啟標點符號

    let promptText = "";
    if (mode === "transcribe") {
      promptText = `你是一個專業的語音轉文字助理。請仔細聆聽這段音檔，並將其轉錄為精確的文字逐字稿。
請遵守以下規範：
1. 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣，zh-TW)" : language}。
2. ${punctuation ? "請為轉錄內容添加適當的標點符號（如逗號、句號、問號、頓號等），使閱讀流暢。" : "請勿使用標點符號，僅以空白分隔。"}
3. 自動修正不合邏輯的語病或錯別字，但不要刪減或大幅改寫說話者的本意。
4. 排除贅字、口頭禪（如「然後」、「那」、「呃」、「喔」等），除非它們在句子中有關鍵意義。
5. 若音檔中有多人對話，請嘗試以「發言者 1:」、「發言者 2:」的格式分段標出（若能區分的話）。
6. 請直接輸出轉錄完成的文字，不需要回答「這是我聽到的內容...」等開場白或結尾說明。`;
    } else if (mode === "summary") {
      promptText = `你是一個專業的語音摘要助理。請仔細聆聽這段音檔後，為其撰寫一份重點摘要報告。
報告中應包含：
1. **主題與核心大綱**：這段對話/演講的核心主題是什麼。
2. **主要討論要點**：條列出音訊中提及的多個關鍵事項或論點。
3. **結論或行動方案 (Action Items)**：如果有提到任何後續計畫、待辦事項或結論，請明確整理出來。

請遵守以下規範：
- 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
- 排版格式請使用簡潔美觀的 Markdown 語法（有良好的多級標題 與 符號列表）。
- 請直接輸出摘要報告內容，不需要多餘的開場白。`;
    } else if (mode === "qa") {
      promptText = `請仔細聆聽這段音檔。這是一段會議、訪談或課程記錄。請幫我整理成一份標準的「會議記錄」，包含以下結構：
1. **基本資訊**（時間、主要多人口頭討論輪廓）
2. **詳細討論內容（紀要）**：以結構化、易讀的列表方式，說明各部分的討論主題。
3. **決議事項與後續任務**（包含負責人與截止時間，若音訊中有提及）。

請遵守以下規範：
- 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
- 使用 Markdown 語法輸出。
- 資訊不夠時請依據現有音訊提供真實記錄，不要捏造未提及的細節。`;
    } else if (mode === "translation") {
      promptText = `你是一個專業的雙語同步口譯助理。請仔細聆聽這段音檔，並將其完美地翻譯成目標語言。
目標語言：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
請遵守以下規範：
- 直接輸出翻譯後的最終文字，不要保留原文音標。
- 翻譯時要講求「信、達、雅」，語氣自然流暢、貼合目標語言的日常用法。
- 請直接輸出翻譯好的內容，不需要其他任何解釋或說明。`;
    } else {
      promptText = `請將這段音檔轉換為文字。輸出語言：${language}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        { text: promptText },
      ],
    });

    const resultText = response.text || "";
    res.json({ text: resultText });
  } catch (error: any) {
    console.error("Transcribe API Error:", error);
    res.status(500).json({ error: error.message || "語音轉文字處理失敗" });
  }
});

// Vite Middleware 用於前端處理
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
