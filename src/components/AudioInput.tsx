import React, { useState, useRef, useEffect } from "react";
import { Upload, Mic, Square, Trash2, Volume2, FileAudio, RotateCcw } from "lucide-react";
import { AudioFileInfo } from "../types";

interface AudioInputProps {
  onAudioSelected: (info: AudioFileInfo | null) => void;
  selectedAudio: AudioFileInfo | null;
}

export const AudioInput: React.FC<AudioInputProps> = ({ onAudioSelected, selectedAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(30).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 錄音時模擬動態音頻波形
  useEffect(() => {
    if (isRecording) {
      const updateWave = () => {
        setWaveHeights(prev =>
          prev.map(() => Math.floor(Math.random() * 28) + 4)
        );
        animationRef.current = requestAnimationFrame(updateWave);
      };
      animationRef.current = requestAnimationFrame(updateWave);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setWaveHeights(Array(30).fill(4));
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  // 錄音秒數計時
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      alert("請點擊或拖放音訊檔案！目前不支援非音訊格式。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const blobUrl = URL.createObjectURL(file);

      // 取得長度
      const audio = new Audio(blobUrl);
      audio.onloadedmetadata = () => {
        onAudioSelected({
          name: file.name,
          size: file.size,
          type: file.type || "audio/mp3",
          duration: audio.duration,
          base64Data,
          blobUrl,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // 開始錄音
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 偵測支援的錄音格式
      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/ogg" };
        if (!MediaRecorder.isTypeSupported("audio/ogg")) {
          options = { mimeType: "" }; // 讓瀏覽器自己選擇預設
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result as string;
          const blobUrl = URL.createObjectURL(audioBlob);

          onAudioSelected({
            name: `現場麥克風錄音_${new Date().toLocaleTimeString()}.webm`,
            size: audioBlob.size,
            type: audioBlob.type,
            duration: recordingTime,
            base64Data,
            blobUrl,
          });
        };
        reader.readAsDataURL(audioBlob);

        // 停止串流
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200); // 每 200ms 收取一次資料
      setIsRecording(true);
    } catch (err) {
      console.error("無法呼叫麥克風設備:", err);
      alert("開啟麥克風失敗，請確保已授權麥克風存取權限！");
    }
  };

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 格式化檔案大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#413F3D] flex items-center gap-2 font-serif italic">
          <span>第一步：提供音訊輸入</span>
          <span className="text-xs font-normal text-[#8C887D] font-sans">(支援 MP3, WAV, WebM, M4A)</span>
        </h2>
        {selectedAudio && (
          <button
            onClick={() => onAudioSelected(null)}
            className="flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-full transition-colors font-medium ui-sans"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>重新上傳音檔</span>
          </button>
        )}
      </div>

      {!selectedAudio ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ui-sans">
          {/* 上傳檔案區 */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
              isDragActive
                ? "border-[#5A5A40] bg-[#E9E5D9]/50 scale-[0.99] shadow-inner"
                : "border-[#E0DCCF] bg-[#FDFBF7] hover:border-[#5A5A40] hover:bg-[#F1EFEC]/65"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="mb-4 rounded-full bg-[#E9E5D9] p-3 text-[#5A5A40] transition-colors group-hover:bg-[#E0DCCF]">
              <Upload className="h-6 w-6" />
            </div>
            <p className="font-bold text-[#413F3D] text-sm">拖放或點擊上傳音檔</p>
            <p className="mt-1.5 text-xs text-[#8C887D] max-w-[240px]">
              支援所有常見 MP3、WAV、M4A 格式音訊檔案
            </p>
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[10px] text-[#8C887D] font-mono">
              <span>上限 50MB 檔案</span>
              <span>Gemini 多模態解析</span>
            </div>
          </div>

          {/* 即時錄製音訊 */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E0DCCF] bg-[#FDFBF7] p-8 text-center min-h-[220px] relative">
            {isRecording ? (
              <div className="flex flex-col items-center justify-center w-full space-y-4">
                {/* 錄音閃爍指示 */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-bounce"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <span className="text-[10px] font-bold font-mono text-rose-600 tracking-widest uppercase">LIVE RECORDING</span>
                </div>

                {/* 時間 */}
                <span className="text-3xl font-bold font-mono text-[#413F3D] tracking-tight">
                  {formatTime(recordingTime)}
                </span>

                {/* 動態音波模擬 */}
                <div className="flex items-end justify-center gap-[4px] h-12 w-full max-w-[200px]">
                  {waveHeights.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-[3px] rounded-full bg-[#5A5A40] transition-all duration-150"
                    />
                  ))}
                </div>

                {/* 停止按鈕 */}
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-full bg-[#5A5A40] hover:bg-[#4E4E37] text-white px-6 py-2.5 text-xs font-semibold shadow-md shadow-[#5A5A40]/15 transition-all active:scale-[0.98]"
                >
                  <Square className="h-3.5 w-3.5 text-[#F8F7F2]" />
                  <span>結束錄音並處理</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="mb-4 rounded-full bg-rose-50 p-3 text-rose-700 hover:bg-rose-100 transition-colors">
                  <Mic className="h-6 w-6" />
                </div>
                <p className="font-bold text-[#413F3D] text-sm">現場錄音 (麥克風)</p>
                <p className="mt-1.5 text-xs text-[#8C887D] max-w-[220px]">
                  點擊啟用瀏覽器音訊麥克風，直接線上進行實時錄製
                </p>
                <button
                  type="button"
                  onClick={startRecording}
                  className="mt-4 flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100/90 text-rose-800 px-5 py-2 text-xs font-semibold transition-all hover:scale-102"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>開始現場錄音</span>
                </button>
              </div>
            )}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[10px] text-[#8C887D] font-mono">
              <span>時效性現場收錄</span>
              <span>高音質 WebM 擷取</span>
            </div>
          </div>
        </div>
      ) : (
        /* 已選擇音訊展示與功能 */
        <div className="rounded-2xl border border-[#E0DCCF] bg-gradient-to-br from-[#FDFBF7] via-white to-[#F1EFEC]/40 p-5 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9E5D9] text-[#5A5A40] ring-8 ring-[#E9E5D9]/30">
                <FileAudio className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#413F3D] text-sm truncate max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl">
                  {selectedAudio.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8C887D] font-medium ui-sans">
                  <span>大小: {formatSize(selectedAudio.size)}</span>
                  <span className="text-[#E0DCCF]">•</span>
                  <span>時間: {formatTime(Math.round(selectedAudio.duration || 0))}</span>
                  <span className="text-[#E0DCCF]">•</span>
                  <span className="bg-[#A4AC86]/20 text-[#5A5A40] font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-sm border border-[#A4AC86]/30">
                    {selectedAudio.type.split("/")[1] || "AUDIO"}
                  </span>
                </div>
              </div>
            </div>

            {/* 音訊播放器 */}
            {selectedAudio.blobUrl && (
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-[#E0DCCF]/55 pt-3 md:pt-0">
                <div className="flex items-center gap-2 bg-[#F1EFEC] border border-[#E0DCCF] p-1.5 rounded-xl w-full md:w-auto">
                  <Volume2 className="h-4 w-4 text-[#8C887D] ml-2" />
                  <audio
                    src={selectedAudio.blobUrl}
                    controls
                    className="h-8 max-w-[240px] [&::-webkit-media-controls-enclosure]:bg-[#F1EFEC]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

