export const NVIDIA_MODELS = [
  { value: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", desc: "NVIDIA 優化版・繁中理解強" },
  { value: "meta/llama-3.3-70b-instruct",            label: "Llama 3.3 70B", desc: "最新 Meta・多語言穩定" },
  { value: "meta/llama-3.1-8b-instruct",             label: "Llama 3.1 8B",  desc: "輕量快速・備援首選" },
] as const;

export type NvidiaModelValue = typeof NVIDIA_MODELS[number]["value"];

export interface TranscribeOptions {
  mode: "transcribe" | "summary" | "qa" | "translation";
  language: string;
  punctuation: boolean;
  provider?: "gemini" | "nvidia";
  nvidiaModel?: NvidiaModelValue;
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
  translatedText?: string;
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