import React from "react";
import { Mic, CheckCircle, AlertTriangle, Cpu } from "lucide-react";

interface NavbarProps {
  apiKeyExists: boolean | null;
  checkingConfig: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ apiKeyExists, checkingConfig }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E0DCCF] bg-[#FDFBF7]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5A5A40] text-white shadow-sm ring-4 ring-[#5A5A40]/10">
            <Mic className="h-5 w-5 animate-pulse text-[#F8F7F2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#413F3D] font-serif">
              EchoFlow <span className="text-xs font-serif italic text-[#A4AC86] font-normal ml-1">聲文轉譯大師 v2.5</span>
            </h1>
            <p className="text-[10px] text-[#8C887D] font-medium tracking-wide ui-sans">智慧語音逐字稿、重點摘要與多語言異地繙譯</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ui-sans">
          {checkingConfig ? (
            <div className="flex items-center gap-1.5 rounded-full bg-[#F1EFEC] px-3 py-1.5 text-xs text-[#8C887D]">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#8C887D]" />
              <span>偵測服務狀態...</span>
            </div>
          ) : apiKeyExists ? (
            <div className="flex items-center gap-1.5 rounded-full bg-[#A4AC86]/10 border border-[#A4AC86]/35 px-3 py-1.5 text-xs font-semibold text-[#5A5A40]">
              <CheckCircle className="h-3.5 w-3.5 text-[#A4AC86]" />
              <span>Gemini AI 連線就緒</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-[#D4A373]/10 border border-[#D4A373]/30 px-3 py-1.5 text-xs font-semibold text-[#D4A373]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#D4A373]" />
              <span>請至 Secrets 設定金鑰</span>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-[#F1EFEC] border border-[#E0DCCF] px-3 py-1.5 text-xs font-mono text-[#5A5A40]">
            <Cpu className="h-3.5 w-3.5 text-[#A4AC86]" />
            <span>Gemini 3.5 Flash</span>
          </div>
        </div>
      </div>
    </header>
  );
};

