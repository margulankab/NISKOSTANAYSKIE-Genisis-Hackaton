import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { geminiScenePlugin } from './server/gemini-story';

export default defineConfig(({ command, mode }) => {
  const env = command === 'serve' ? loadEnv(mode, process.cwd(), 'GEMINI_') : {};
  const freeKey = env.GEMINI_FREE_TIER === 'true' ? env.GEMINI_API_KEY : undefined;
  return { plugins: [react(), ...(command === 'serve' ? [geminiScenePlugin(freeKey)] : [])] };
});
