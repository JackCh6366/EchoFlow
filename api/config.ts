import { VercelRequest, VercelResponse } from "@vercel/node";
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

export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiKeyExists = !!process.env.GEMINI_API_KEY || !!process.env.NVIDIA_API_KEY;
  return res.status(200).json({ apiKeyExists });
}
