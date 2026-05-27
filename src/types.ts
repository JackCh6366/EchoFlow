export interface TranscribeOptions {
  mode: "transcribe" | "summary" | "qa" | "translation";
  language: string;
  punctuation: boolean;
}

export interface AudioFileInfo {
  name: string;
  size: number;
  type: string;
  duration?: number; // 單位：秒
  base64Data?: string;
  blobUrl?: string;
}

export interface TranscriptionResult {
  text: string;
  timestamp: string;
  options: TranscribeOptions;
  audioName: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: "zh-TW", label: "繁體中文（台灣）" },
  { code: "zh-CN", label: "簡體中文" },
  { code: "en-US", label: "英文 (English)" },
  { code: "ja-JP", label: "日文 (日本語)" },
  { code: "ko-KR", label: "韓文 (한국어)" },
  { code: "es-ES", label: "西班牙文 (Español)" },
  { code: "fr-FR", label: "法文 (Français)" },
  { code: "de-DE", label: "德文 (Deutsch)" },
];
