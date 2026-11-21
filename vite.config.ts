import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { geminiStoryPlugin } from './server/gemini-story';

export default defineConfig(({ command, mode }) => {
  const env = command === 'serve' ? loadEnv(mode, process.cwd(), 'GEMINI_') : {};
  return { plugins: [react(), ...(command === 'serve' ? [geminiStoryPlugin(env.GEMINI_API_KEY, env.GEMINI_MODEL)] : [])] };
});
