import React, { useState } from "react";
import { Copy, Check, Download, Search, FileText, Clock, FileDown, Trash } from "lucide-react";
import { TranscriptionResult } from "../types";

interface TranscriptResultProps {
  result: TranscriptionResult;
  history: TranscriptionResult[];
  onHistorySelect: (res: TranscriptionResult) => void;
  onClearHistory: () => void;
}

export const TranscriptResult: React.FC<TranscriptResultProps> = ({
  result,
  history,
  onHistorySelect,
  onClearHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("複製失敗:", err);
    }
  };

  const downloadFile = (format: "txt" | "md") => {
    const extension = format;
    const mimeType = "text/plain;charset=utf-8";
    const filename = `${result.audioName.split(".")[0]}_轉譯結果.${extension}`;
    
    let content = result.text;
    if (format === "md") {
      content = `# ${result.audioName} - 轉譯成果\n` +
                `* **建立時間**: ${new Date(result.timestamp).toLocaleString()}\n` +
                `* **模式**: ${result.options.mode}\n` +
                `* **目標語言**: ${result.options.language}\n\n` +
                `---\n\n` +
                result.text;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadDropdownOpen(false);
  };

  // 高效的 Markdown 行級樣式渲染，融合 Natural Tones 專屬的重點摘要樣式
  const renderFormattedText = (rawText: string, search: string) => {
    if (!rawText) return null;

    let lines = rawText.split("\n");

    return lines.map((line, idx) => {
      let trimmed = line.trim();
      let element: React.ReactNode = line;

      // 偵測是否為重點摘要段落，套用主題樣式
      if (trimmed.startsWith("**重點摘要**") || trimmed.includes("重點摘要：") || trimmed.includes("Action Items") || trimmed.startsWith("決議事項")) {
        element = (
          <p className="text-xs font-semibold text-[#413F3D] border-l-2 border-[#D4A373] pl-4 bg-[#D4A373]/5 py-2.5 my-3 rounded-r-lg leading-relaxed">
            {renderBoldText(line, search)}
          </p>
        );
      } else if (trimmed.startsWith("### ")) {
        element = <h4 className="text-xs font-bold text-[#413F3D] font-serif italic mt-4 mb-2">{trimmed.slice(4)}</h4>;
      } else if (trimmed.startsWith("## ")) {
        element = <h3 className="text-sm font-bold text-[#413F3D] font-serif border-b border-[#E0DCCF] pb-1 mt-5 mb-2.5">{trimmed.slice(3)}</h3>;
      } else if (trimmed.startsWith("# ")) {
        element = <h2 className="text-base font-bold text-[#413F3D] font-serif mt-6 mb-3">{trimmed.slice(2)}</h2>;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        element = (
          <li className="list-disc list-inside ml-4 text-xs font-medium text-[#413F3D] leading-relaxed my-1">
            {renderBoldText(trimmed.slice(2), search)}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        const numContent = trimmed.replace(/^\d+\.\s/, "");
        element = (
          <li className="list-decimal list-inside ml-4 text-xs font-medium text-[#413F3D] leading-relaxed my-1">
            {renderBoldText(numContent, search)}
          </li>
        );
      } else if (trimmed === "---" || trimmed === "___") {
        element = <hr className="my-5 border-t border-[#E0DCCF]" />;
      } else {
        element = (
          <p className="text-xs font-medium text-[#413F3D] leading-relaxed my-2 min-h-4">
            {renderBoldText(line, search)}
          </p>
        );
      }

      return <div key={idx}>{element}</div>;
    });
  };

  // 處理強烈粗體 ** 格式化以及關鍵字高亮搜尋
  const renderBoldText = (text: string, search: string): React.ReactNode => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    
    return parts.map((part, i) => {
      const isBold = i % 2 === 1;
      
      if (search) {
        const searchRegex = new RegExp(`(${escapeRegExp(search)})`, "gi");
        const subParts = part.split(searchRegex);
        
        const highlighted = subParts.map((sub, j) => {
          const isMatch = sub.toLowerCase() === search.toLowerCase();
          return isMatch ? (
            <mark key={j} className="bg-[#D4A373]/25 text-[#7A4F23] px-0.5 rounded font-bold">
              {sub}
            </mark>
          ) : (
            sub
          );
        });

        return isBold ? <strong key={i} className="font-bold text-[#35382F]">{highlighted}</strong> : <React.Fragment key={i}>{highlighted}</React.Fragment>;
      }

      return isBold ? (
        <strong key={i} className="font-bold text-[#35382F]">
          {part}
        </strong>
      ) : (
        part
      );
    });
  };

  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 轉譯結果顯示主面板 */}
      <div className="lg:col-span-2 rounded-2xl border border-[#E0DCCF] bg-[#FDFBF7] p-5 md:p-6 shadow-xs flex flex-col h-[520px] max-h-[520px]">
        
        {/* 開頭 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E0DCCF] pb-4 gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 ui-sans">
              <span className="bg-[#A4AC86]/15 text-[#5A5A40] border border-[#A4AC86]/25 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                {result.options.mode === "transcribe" ? "完整逐字稿" : 
                 result.options.mode === "summary" ? "要點摘要" :
                 result.options.mode === "qa" ? "會議記錄" : "異地翻譯"}
              </span>
              <span className="text-[11px] text-[#8C887D] font-mono flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#413F3D] font-serif truncate max-w-[240px] sm:max-w-md mt-1 italic">
              {result.audioName}
            </h3>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto ui-sans">
            {/* 複製 */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-[#E0DCCF] bg-[#FDFBF7] hover:bg-[#F1EFEC] px-4 py-2 text-xs font-semibold text-[#5A5A40] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#A4AC86]" />
                  <span className="text-[#5A5A40] font-bold">複製成功</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#8C887D]" />
                  <span>複製全文</span>
                </>
              )}
            </button>

            {/* 下載 */}
            <div className="relative">
              <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full bg-[#5A5A40] hover:bg-[#4E4E37] text-[#F8F7F2] px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>匯出成果</span>
              </button>
              
              {downloadDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDownloadDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E0DCCF] bg-[#FDFBF7] p-1.5 shadow-md z-25 min-w-[200px]">
                    <button
                      onClick={() => downloadFile("txt")}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#413F3D] hover:bg-[#F1EFEC] font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#8C887D]" />
                      <span>下載轉錄純文字 (.txt)</span>
                    </button>
                    <button
                      onClick={() => downloadFile("md")}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#413F3D] hover:bg-[#F1EFEC] font-medium"
                    >
                      <FileDown className="h-3.5 w-3.5 text-[#A4AC86]" />
                      <span>下載 Markdown (.md)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 搜尋過濾 */}
        <div className="mt-3 relative shrink-0 ui-sans">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C887D]" />
          <input
            type="text"
            placeholder="快搜對話與摘要內文關鍵字..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#E0DCCF] bg-[#F1EFEC] pl-9 pr-4 py-2 text-xs font-medium text-[#413F3D] shadow-inner focus:border-[#5A5A40] focus:bg-white focus:outline-hidden transition-colors"
          />
        </div>

        {/* 內文檢視器 */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 border border-[#E0DCCF]/45 bg-[#FDFBF7]/40 rounded-xl p-4 md:p-5">
          <div className="prose max-w-none">
            {renderFormattedText(result.text, searchTerm)}
          </div>
        </div>
      </div>

      {/* 歷史記錄側邊面板 */}
      <div className="rounded-2xl border border-[#E0DCCF] bg-[#F1EFEC]/50 p-5 shadow-xs flex flex-col h-[520px] max-h-[520px]">
        <div className="flex items-center justify-between border-b border-[#E0DCCF] pb-3 mb-3 shrink-0">
          <h3 className="text-xs font-bold text-[#413F3D] uppercase tracking-wider flex items-center gap-1.5 font-serif italic">
            <Clock className="h-4 w-4 text-[#8C887D]" />
            <span>轉譯歷史記錄</span>
          </h3>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[10px] font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 ui-sans border border-rose-200/50 bg-rose-50/50 hover:bg-rose-50 px-2 py-0.5 rounded-full"
            >
              <Trash className="h-3 w-3" />
              <span>清空暫存</span>
            </button>
          )}
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 ui-sans">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileText className="h-8 w-8 text-[#C4C0B5] stroke-[1.5] mb-2" />
              <p className="text-xs font-bold text-[#8C887D]">尚無歷史轉譯紀錄</p>
              <p className="text-[10px] text-[#8C887D]/70 mt-1">您完成的轉錄將保留於瀏覽器本機快取中</p>
            </div>
          ) : (
            history.map((item, index) => {
              const itemIsSelected = result.timestamp === item.timestamp;
              return (
                <div
                  key={index}
                  onClick={() => onHistorySelect(item)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col gap-1.5 ${
                    itemIsSelected
                      ? "border-[#5A5A40] bg-[#FDFBF7] shadow-xs"
                      : "border-[#E0DCCF] bg-[#FDFBF7]/60 hover:bg-[#FDFBF7] hover:border-[#8C887D]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold px-2 py-0.5 border border-[#A4AC86]/30 rounded-sm bg-[#A4AC86]/10 text-[#5A5A40] tracking-wider uppercase font-mono">
                      {item.options.mode === "transcribe" ? "完整逐字稿" : 
                       item.options.mode === "summary" ? "及要摘要" :
                       item.options.mode === "qa" ? "會議記錄" : "異地翻譯"}
                    </span>
                    <span className="text-[9px] text-[#8C887D] font-mono">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#413F3D] line-clamp-1">
                    {item.audioName}
                  </h4>
                  <p className="text-[10px] text-[#8C887D] line-clamp-2 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

