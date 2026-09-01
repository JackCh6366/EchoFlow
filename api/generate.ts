import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
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

const GEMINI_MODELS_FALLBACK = [
  "gemini-3.1-flash-lite",   // 最新 GA 版本，高效率低延遲
  "gemini-3.5-flash",        // 次選：最強 Flash 系列
  "gemini-2.5-flash",        // 備援：上一代穩定版
  "gemini-1.5-flash"         // 最終備援
];

async function generateGeminiContentWithFallback(ai: GoogleGenAI, contents: any[]) {
  let lastError: any = null;
  for (const model of GEMINI_MODELS_FALLBACK) {
    try {
      console.log(`[Gemini Fallback] 嘗試呼叫模型: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      console.log(`[Gemini Fallback] 模型呼叫成功: ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini Fallback] 模型 ${model} 呼叫失敗:`, err.message || err);
      lastError = err;
      // 400 等不合法參數請求，不需重試其他模型
      if (err.status === 400 || err.statusCode === 400) {
        throw err;
      }
    }
  }
  throw lastError || new Error("所有 Gemini 備用模型鏈皆嘗試失敗。");
}

async function transcribeAudioWithGemini(ai: GoogleGenAI, base64Data: string, mimeType: string): Promise<string> {
  console.log(`[Gemini Transcribe] [Interactions API] 嘗試上傳音檔並呼叫專用模型: gemini-3.5-transcribe...`);

  // 使用 crypto.randomUUID 確保高併發下檔名唯一性
  const tempFileName = `echoflow_${crypto.randomUUID()}.tmp`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  let uploadedFile: any = null;

  try {
    // 寫入暫存檔 (Node.js 預設寫入權限)
    fs.writeFileSync(tempFilePath, Buffer.from(base64Data, "base64"));

    // 步驟 1: 上傳音檔取得 file.uri
    uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType }
    });
    console.log(`[Gemini Transcribe] [Files API] 音檔上傳成功, File URI: ${uploadedFile.uri}`);

    // 步驟 2: 透過 Interactions API 呼叫 gemini-3.5-transcribe (smart 模式，無文字 prompt)
    const interaction: any = await (ai as any).interactions.create({
      model: "gemini-3.5-transcribe",
      input: [
        {
          type: "audio",
          uri: uploadedFile.uri,
          mime_type: mimeType
        }
      ],
      generation_config: {
        transcription_config: {
          mode: "smart"
        }
      }
    });

    console.log(`[Gemini Transcribe] [Interactions API] 呼叫成功! ID: ${interaction.id}, Status: ${interaction.status}`);

    const transcribedText = interaction.output_text || "";
    if (!transcribedText.trim()) {
      throw new Error("gemini-3.5-transcribe Interactions API 回傳空白逐字稿內容。");
    }

    return transcribedText.trim();
  } finally {
    // try/finally 確保不論 files.upload 或 interactions.create 是否拋出例外，暫存檔均會被安全刪除
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.warn("[Gemini Transcribe] 清理暫存檔時發生警告:", e);
      }
    }
  }
}

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
    const { fileData, mimeType, options, provider } = req.body;
    const selectedNvidiaModel: string | undefined = options?.nvidiaModel;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "缺少音檔數據或媒體類型(mimeType)" });
    }

    const currentProvider = provider || "gemini";
    const mode = options?.mode || "transcribe";
    const language = "zh-TW"; // 強制設定所有轉出的內容為繁體中文 (zh-TW)
    const punctuation = options?.punctuation !== false; // 預設開啟標點符號

    // 依據前端選擇的模式，準備提示詞
    let promptText = "";
    if (mode === "transcribe") {
      promptText = `你是一個專業的語音轉文字助理。請仔細聆聽這段音檔，並將其轉錄為精確的文字逐字稿。
請遵守以下規範：
1. 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣，zh-TW)" : language}。
2. ${punctuation ? "請為轉錄內容添加適當的標點符號（如逗號、句號、問號、頓號等），使閱讀流暢。" : "請勿使用標點符號，僅以空白分隔。"}
3. 自動修正不合邏輯的語病或錯別字，但不要刪減或大幅改寫說話者本意。
4. 排除贅字、口頭禪（如「然後」、「那」、「呃」、「喔」等），除非它們在句子中有關鍵意義。
5. 若音檔中有多人對話，請嘗試以「發言者 1:」、「發言者 2:」的格式分段標出（若能區分的話）。
6. 請直接輸出轉錄完成的文字，不需要回答「這是我聽到的內容...」等開場白或結尾說明。`;
    } else if (mode === "summary") {
      promptText = `你是一個專業的語音摘要助理。請根據提供的語音內容/逐字稿，為其撰寫一份重點摘要報告。
報告中應包含：
1. **主題與核心大綱**：這段對話/演講的核心主題是什麼。
2. **主要討論要點**：條列出音訊中提及的多個關鍵事項或論點。
3. **結論或行動方案 (Action Items)**：如果有提到任何後續計畫、待辦事項或結論，請明確整理出來。

請遵守以下規範：
- 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
- 排版格式請使用簡潔美觀的 Markdown 語法（有良好的多級標題 與 符號列表）。
- 請直接輸出摘要報告內容，不需要多餘的開場白。`;
    } else if (mode === "qa") {
      promptText = `請根據提供的語音內容/逐字稿。這是一段會議、訪談或課程記錄。請幫我整理成一份標準的「會議記錄」，包含以下結構：
1. **基本資訊**（時間、主要多人口頭討論輪廓）
2. **詳細討論內容（紀要）**：以結構化、易讀的列表方式，說明各部分的討論主題。
3. **決議事項與後續任務**（包含負責人與截止時間，若音訊中有提及）。

請遵守以下規範：
- 輸出語言必須為：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
- 使用 Markdown 語法輸出。
- 資訊不夠時請依據現有音訊提供真實記錄，不要捏造未提及的細節。`;
    } else if (mode === "translation") {
      promptText = `你是一個專業的雙語同步口譯助理。請根據提供的語音內容/逐字稿，將其完美地翻譯成目標語言。
目標語言：${language === "zh-TW" ? "繁體中文 (台灣)" : language}。
請遵守以下規範：
- 直接輸出翻譯後的最終文字，不要保留原文音標。
- 翻譯時要講求「信、達、雅」，語氣自然流暢、貼合目標語言的日常用法。
- 請直接輸出翻譯好的內容，不需要其他任何解釋或說明。`;
    } else {
      promptText = `請將這段音檔轉換為文字。輸出語言：${language}`;
    }

    // 處理 Base64
    let base64Data = fileData;
    if (fileData.includes(";base64,")) {
      base64Data = fileData.split(";base64,")[1];
    }

    // 分流處理不同的 AI 服務商
    if (currentProvider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "伺服器未設定 GEMINI_API_KEY。請設定環境變數。" });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // 階段 1：嘗試優先呼叫 gemini-3.5-transcribe 進行語音轉文字
      let transcriptText = "";
      let isTranscribeFallback = false;

      try {
        transcriptText = await transcribeAudioWithGemini(ai, base64Data, mimeType);
        console.log(`[Gemini Transcribe] 第一階段語音轉文字成功: "${transcriptText.slice(0, 50)}..."`);
      } catch (err: any) {
        console.warn(`[Gemini Transcribe Fallback] 呼叫 gemini-3.5-transcribe 失敗 (${err.message || err})。`);
        console.log(`[Gemini Transcribe Fallback] 降級走 GEMINI_MODELS_FALLBACK 備援路徑 (音檔直接送文字模型)...`);
        isTranscribeFallback = true;
      }

      // 若第一階段轉譯失敗，走原始備援路徑（直接將音檔與 Prompt 丟給 GEMINI_MODELS_FALLBACK 處理）
      if (isTranscribeFallback) {
        const response = await generateGeminiContentWithFallback(ai, [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: promptText },
        ]);
        const resultText = response.text || "";
        return res.status(200).json({ text: resultText });
      }

      // 階段 2：依據 mode 分流處理
      if (mode === "transcribe") {
        let finalText = transcriptText;
        if (!punctuation) {
          finalText = finalText.replace(/[，。？！、；：「」『』（）—….,?!;:]/g, " ").replace(/\s+/g, " ").trim();
        }
        return res.status(200).json({ text: finalText });
      } else {
        console.log(`[Gemini Phase 2] 使用逐字稿文字進行二階段處理 (mode: ${mode})...`);
        const textContents = [
          {
            text: `${promptText}\n\n【輸入語音逐字稿】：\n${transcriptText}`
          }
        ];
        const response = await generateGeminiContentWithFallback(ai, textContents);
        const resultText = response.text || "";
        return res.status(200).json({ text: resultText });
      }

    } else if (currentProvider === "nvidia") {
      const nvidiaApiKey = process.env.NVIDIA_API_KEY;
      if (!nvidiaApiKey) {
        return res.status(500).json({ error: "伺服器未設定 NVIDIA_API_KEY。請設定環境變數。" });
      }

      // NVIDIA 的模型只支援純文字輸入。因此我們先使用 Gemini 進行初步的語音轉文字前置處理。
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ error: "NVIDIA 服務轉譯音檔時，需要本機同時設定 GEMINI_API_KEY 作為語音轉文字的前置處理。" });
      }

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // 步驟 1: 優先呼叫 gemini-3.5-transcribe 做前置語音轉文字，失敗則降級 fallback
      let rawTranscription = "";
      try {
        rawTranscription = await transcribeAudioWithGemini(ai, base64Data, mimeType);
        console.log(`[NVIDIA Pre-transcribe] gemini-3.5-transcribe 前置語音轉文字成功。`);
      } catch (err: any) {
        console.warn(`[NVIDIA Pre-transcribe Fallback] 呼叫 gemini-3.5-transcribe 失敗 (${err.message || err})。`);
        console.log(`[NVIDIA Pre-transcribe Fallback] 降級使用 generateGeminiContentWithFallback...`);
        const transPrompt = "請仔細聆聽這段音檔，並將其轉錄為精確的文字逐字稿，不需添加任何額外的解釋或說明。";
        const transResponse = await generateGeminiContentWithFallback(ai, [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: transPrompt },
        ]);
        rawTranscription = transResponse.text || "";
      }
      if (!rawTranscription.trim()) {
        return res.status(500).json({ error: "初步語音轉文字失敗或音訊無聲。" });
      }

      // 步驟 2: 將轉譯出的文字及原提示詞傳送至 NVIDIA API 進行智慧處理 (使用極為穩定的 Llama-3.1 / Nemotron 等高階語言模型進行下游處理)
      // 若前端指定模型，優先使用；否則依序 fallback
      const nvidiaModels: string[] = selectedNvidiaModel
        ? [
            selectedNvidiaModel,
            "meta/llama-3.1-8b-instruct",  // 備援
          ]
        : [
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "meta/llama-3.3-70b-instruct",
            "meta/llama-3.1-8b-instruct",
          ];

      let nvidiaResponse = null;
      let lastNvidiaError = null;

      for (const model of nvidiaModels) {
        try {
          console.log(`[NVIDIA Fallback] 嘗試呼叫 LLM 模型: ${model}`);
          const resObj = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${nvidiaApiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "system",
                  content: promptText,
                },
                {
                  role: "user",
                  content: `以下是從音檔中初步轉錄出的原始文字：\n\n${rawTranscription}`,
                },
              ],
              temperature: 0.5,
              top_p: 0.9,
              max_tokens: 2048,
            }),
          });

          if (resObj.ok) {
            nvidiaResponse = resObj;
            console.log(`[NVIDIA Fallback] 成功呼叫 LLM 模型: ${model}`);
            break;
          } else {
            const errorText = await resObj.text();
            console.warn(`[NVIDIA Fallback] 模型 ${model} 失敗:`, errorText);
            lastNvidiaError = new Error(`NVIDIA API (${model}) 回傳錯誤: ${resObj.statusText} - ${errorText}`);
          }
        } catch (err: any) {
          console.warn(`[NVIDIA Fallback] 呼叫 ${model} 發生例外:`, err.message || err);
          lastNvidiaError = err;
        }
      }

      if (!nvidiaResponse) {
        throw lastNvidiaError || new Error("NVIDIA 服務目前無法使用，請稍後再試。");
      }

      const nvidiaData = await nvidiaResponse.json();
      const resultText = nvidiaData.choices?.[0]?.message?.content || "";
      return res.status(200).json({ text: resultText });

    } else {
      return res.status(400).json({ error: `不支援的服務提供商: ${currentProvider}` });
    }
  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({ error: error.message || "伺服器處理失敗。" });
  }
}