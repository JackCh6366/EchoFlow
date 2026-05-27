import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { AudioInput } from "./components/AudioInput";
import { TranscribeConfig } from "./components/TranscribeConfig";
import { TranscriptResult } from "./components/TranscriptResult";
import { AudioFileInfo, TranscribeOptions, TranscriptionResult } from "./types";
import { Loader2, Sparkles, FileAudio, AlertCircle } from "lucide-react";

export default function App() {
  const [apiKeyExists, setApiKeyExists] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState<AudioFileInfo | null>(null);
  const [options, setOptions] = useState<TranscribeOptions>({
    mode: "transcribe",
    language: "zh-TW",
    punctuation: true,
  });

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [history, setHistory] = useState<TranscriptionResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. 初始化檢查與載入歷史記錄
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        setApiKeyExists(data.apiKeyExists);
      } catch (err) {
        console.error("無法連接伺服器配置:", err);
        setApiKeyExists(false);
      } finally {
        setCheckingConfig(false);
      }
    };

    // 載入 localStorage 暫存歷史
    const cachedHistory = localStorage.getItem("echoflow_history");
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory) as TranscriptionResult[];
        setHistory(parsed);
        if (parsed.length > 0) {
          setResult(parsed[0]); // 預設載入最後一筆
        }
      } catch (e) {
        console.error("無法析構歷史暫存:", e);
      }
    }

    checkConfig();
  }, []);

  // 2. 儲存歷史記錄至快取
  const updateCachedHistory = (newHistory: TranscriptionResult[]) => {
    setHistory(newHistory);
    localStorage.setItem("echoflow_history", JSON.stringify(newHistory));
  };

  // 3. 呼叫後端 API 進行轉譯
  const handleStartTranscribing = async () => {
    if (!selectedAudio?.base64Data) {
      setErrorMsg("請先上傳或錄製一段音訊！");
      return;
    }

    setIsTranscribing(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileData: selectedAudio.base64Data,
          mimeType: selectedAudio.type,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "音軌轉譯失敗");
      }

      const newResult: TranscriptionResult = {
        text: data.text,
        timestamp: new Date().toISOString(),
        options: { ...options },
        audioName: selectedAudio.name,
      };

      // 更新歷史
      const nextHistory = [newResult, ...history.filter(h => h.timestamp !== newResult.timestamp)];
      updateCachedHistory(nextHistory);
      setResult(newResult);
    } catch (err: any) {
      console.error("Transcribing failed:", err);
      setErrorMsg(err.message || "轉譯處理中斷，請確認您的 Gemini API 金鑰是否有效且正常。");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSelectHistoryItem = (item: TranscriptionResult) => {
    setResult(item);
  };

  const handleClearHistory = () => {
    if (confirm("您確定要刪除所有本機快取的轉譯歷史紀錄嗎？此動作無法復原。")) {
      updateCachedHistory([]);
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#35382F] flex flex-col transition-natural">
      {/* 導覽列 */}
      <Navbar apiKeyExists={apiKeyExists} checkingConfig={checkingConfig} />

      {/* 主工作區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* 異常警告框 */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shrink-0 flex items-start gap-3 ui-sans">
            <AlertCircle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-800">轉譯請求發生例外錯誤</h4>
              <p className="text-xs text-rose-700 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* 雙欄工作面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左欄：輸入與設定面板 */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-start">
            {/* 音訊載入面板 */}
            <div className="rounded-2xl border border-[#E0DCCF] bg-[#FDFBF7] p-6 shadow-xs flex flex-col gap-6">
              <AudioInput
                onAudioSelected={setSelectedAudio}
                selectedAudio={selectedAudio}
              />
            </div>

            {/* 功能配置面板 */}
            <div className="rounded-2xl border border-[#E0DCCF] bg-[#FDFBF7] p-6 shadow-xs flex flex-col gap-6">
              <TranscribeConfig
                options={options}
                onChange={setOptions}
                disabled={isTranscribing || !selectedAudio}
                onStart={handleStartTranscribing}
              />
            </div>
          </div>

          {/* 右欄：成果展示與歷史彙整牆 */}
          <div className="lg:col-span-7 flex flex-col">
            {isTranscribing ? (
              <div className="rounded-2xl border-2 border-dashed border-[#5A5A40]/40 bg-[#FDFBF7] p-12 text-center h-[520px] flex flex-col items-center justify-center gap-5">
                <div className="relative flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-[#5A5A40] animate-spin stroke-[1.5]" />
                  <Sparkles className="absolute h-4 w-4 text-[#D4A373] animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-[#413F3D] text-sm font-serif italic">
                    正在努力聆聽音軌，轉譯中...
                  </h3>
                  <p className="text-xs text-[#8C887D] max-w-[320px] mx-auto leading-relaxed font-sans">
                    Gemini 3.5 AI 正在進行音軌分析，將在數秒內整合出完美格式的逐字稿與摘要資訊，請稍候。
                  </p>
                </div>
                {/* 裝飾波形動畫 */}
                <div className="flex items-center gap-[4px] h-6 mt-4 opacity-70">
                  <div className="w-1 bg-[#5A5A40] h-3 rounded-full animate-bounce delay-75" />
                  <div className="w-1 bg-[#A4AC86] h-5 rounded-full animate-bounce delay-150" />
                  <div className="w-1 bg-[#5A5A40] h-4 rounded-full animate-bounce delay-300" />
                  <div className="w-1 bg-[#A4AC86] h-6 rounded-full animate-bounce delay-200" />
                  <div className="w-1 bg-[#5A5A40] h-3 rounded-full animate-bounce delay-100" />
                </div>
              </div>
            ) : result ? (
              <TranscriptResult
                result={result}
                history={history}
                onHistorySelect={handleSelectHistoryItem}
                onClearHistory={handleClearHistory}
              />
            ) : (
              <div className="rounded-2xl border border-[#E0DCCF]/80 bg-[#FDFBF7] p-12 text-center h-[520px] flex flex-col items-center justify-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[#E9E5D9] flex items-center justify-center text-[#5A5A40] shrink-0">
                  <FileAudio className="h-7 w-7 stroke-[1.5]" />
                </div>
                <div className="space-y-1.5 max-w-[340px] mx-auto">
                  <h3 className="font-bold text-[#413F3D] text-sm font-serif italic">
                    待命就緒：等待您的音軌上傳
                  </h3>
                  <p className="text-xs text-[#8C887D] leading-relaxed font-sans">
                    您可以提供會議錄音、口頭大綱、採訪、影片配音或直接現場錄音。按下「開始轉譯」後，AI 助理會在此為您完美呈顯轉錄成品。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 狀態列底部頁尾 */}
      <footer className="h-9 border-t border-[#E0DCCF] bg-[#5A5A40] text-[#F8F7F2] flex items-center px-4 sm:px-6 md:px-8 justify-between text-[10px] tracking-wider ui-sans select-none">
        <div className="flex items-center gap-3">
          <span>服務狀態：就緒</span>
          <span className="opacity-40">|</span>
          <span>轉譯引擎：Gemini 3.5 Flash Model</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">資料完全保留於本機暫存</span>
          <span>EchoFlow v2.5</span>
        </div>
      </footer>
    </div>
  );
}
