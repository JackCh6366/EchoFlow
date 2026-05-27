import React from "react";
import { FileText, Sparkles, ClipboardList, Languages, Settings2 } from "lucide-react";
import { TranscribeOptions, SUPPORTED_LANGUAGES } from "../types";

interface TranscribeConfigProps {
  options: TranscribeOptions;
  onChange: (options: TranscribeOptions) => void;
  disabled: boolean;
  onStart: () => void;
}

export const TranscribeConfig: React.FC<TranscribeConfigProps> = ({
  options,
  onChange,
  disabled,
  onStart,
}) => {
  const modes = [
    {
      id: "transcribe" as const,
      title: "完整分段逐字稿",
      desc: "精準記錄音訊細節，自動優化贅字及口頭禪，修正發言錯字，保留最真實的談話對答錄製稿。",
      icon: FileText,
      color: "border-[#5A5A40] bg-[#5A5A40]/10 text-[#5A5A40]",
      activeBg: "bg-[#5A5A40] text-[#F8F7F2]",
      hoverBg: "hover:bg-[#F1EFEC]/50",
    },
    {
      id: "summary" as const,
      title: "智能核心摘要",
      desc: "深度分析音訊架構，過濾雜音不全對話，為您濃縮核心主軸、要點紀要與待辦行動項目。",
      icon: Sparkles,
      color: "border-[#A4AC86] bg-[#A4AC86]/10 text-[#5A5A40]",
      activeBg: "bg-[#5A5A40] text-[#F8F7F2]",
      hoverBg: "hover:bg-[#F1EFEC]/50",
    },
    {
      id: "qa" as const,
      title: "結構化會議記錄",
      desc: "格式化繁瑣音檔，歸納為具有發言資訊、核心詳細會報、結論與後續任務分工的專業報告。",
      icon: ClipboardList,
      color: "border-[#A4AC86] bg-[#A4AC86]/10 text-[#545E36]",
      activeBg: "bg-[#5A5A40] text-[#F8F7F2]",
      hoverBg: "hover:bg-[#F1EFEC]/50",
    },
    {
      id: "translation" as const,
      title: "異地口譯繙譯",
      desc: "直讀說話者口吻，將不同語系或外文演講精準同步口譯，轉譯為符合目標文法的流暢文字。",
      icon: Languages,
      color: "border-[#D4A373] bg-[#D4A373]/10 text-[#B87D43]",
      activeBg: "bg-[#5A5A40] text-[#F8F7F2]",
      hoverBg: "hover:bg-[#F1EFEC]/50",
    },
  ];

  const handleModeSelect = (mode: TranscribeOptions["mode"]) => {
    onChange({ ...options, mode });
  };

  const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...options, language: e.target.value });
  };

  const handlePunctuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...options, punctuation: e.target.checked });
  };

  return (
    <div className="w-full space-y-5">
      <h2 className="text-base font-bold text-[#413F3D] flex items-center gap-2 font-serif italic">
        <span>第二步：選擇轉譯模式與偏好設定</span>
      </h2>

      {/* 模式矩陣 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ui-sans">
        {modes.map((m) => {
          const isActive = options.mode === m.id;
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => handleModeSelect(m.id)}
              className={`group flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                isActive
                  ? "border-[#5A5A40] bg-[#F1EFEC]/50 shadow-sm"
                  : "border-[#E0DCCF] bg-[#FDFBF7] hover:border-[#5A5A40] hover:shadow-xs"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${isActive ? m.color : "border-[#E0DCCF] bg-[#F1EFEC] text-[#8C887D] group-hover:bg-[#E0DCCF]/50"}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-[#5A5A40]" />
                  )}
                </div>
                <h3 className="font-bold text-[#413F3D] text-sm">{m.title}</h3>
                <p className="text-xs text-[#8C887D] leading-relaxed font-medium">
                  {m.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 設定細節卡片 */}
      <div className="rounded-2xl border border-[#E0DCCF] bg-[#FDFBF7] p-5 shadow-xs ui-sans">
        <h3 className="text-xs font-bold text-[#413F3D] uppercase tracking-wider flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-[#8C887D]" />
          <span>文字輸出偏好</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 目標語系 */}
          <div className="space-y-2">
            <label htmlFor="target-lang" className="block text-xs font-bold text-[#413F3D]">
              目標輸出語言（自動改譯 / 繙譯目的）
            </label>
            <select
              id="target-lang"
              value={options.language}
              onChange={handleLanguageSelect}
              className="w-full rounded-xl border border-[#E0DCCF] bg-[#F1EFEC] px-3 py-2.5 text-xs font-medium text-[#413F3D] shadow-inner focus:border-[#5A5A40] focus:bg-white focus:outline-hidden transition-colors"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* 標點符號選項 */}
          <div className="flex items-center pt-2 md:pt-6">
            <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.punctuation}
                onChange={handlePunctuationChange}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-[#E0DCCF] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#5A5A40] peer-checked:after:translate-x-full transition-colors" />
              <span className="text-xs font-bold text-[#413F3D]">啟用智慧標點符號自動分段</span>
            </label>
          </div>
        </div>
      </div>

      {/* 提送按鈕 */}
      <div className="pt-2 ui-sans">
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-xs font-bold transition-all duration-300 ${
            disabled
              ? "bg-[#F1EFEC] border border-[#E0DCCF] text-[#C4C0B5] cursor-not-allowed"
              : "bg-[#5A5A40] hover:bg-[#4E4E37] border border-[#5A5A40] text-[#F8F7F2] shadow-sm shadow-[#5A5A40]/15 active:scale-[0.99]"
          }`}
        >
          {options.mode === "transcribe" && <span>開始音軌智能轉譯</span>}
          {options.mode === "summary" && <span>產生核心重點摘要報告</span>}
          {options.mode === "qa" && <span>產生結構化會議記錄</span>}
          {options.mode === "translation" && <span>執行語意異地繙譯</span>}
        </button>
      </div>
    </div>
  );
};

