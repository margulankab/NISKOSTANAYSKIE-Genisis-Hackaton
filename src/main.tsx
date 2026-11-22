import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyAppearance } from './menus/settings';
// Self-hosted OFL fonts with Cyrillic (see docs/design_system.md and docs/resource_ledger.md).
import '@fontsource-variable/unbounded';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource-variable/pixelify-sans';
import './styles.css';

// Theme, motion and pixel attributes go on <html> before the first render, so there is no flash.
applyAppearance();
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/visit-offline.js').catch(() => {});
}
// Fetch every interface face now, so a player who later goes offline still sees the intended type.
if ('fonts' in document) {
  for (const face of ['900 1em "Unbounded Variable"', '800 1em "Unbounded Variable"', '400 1em "JetBrains Mono Variable"',
    '700 1em "JetBrains Mono Variable"', '400 1em Silkscreen', '700 1em Silkscreen', '500 1em "Pixelify Sans Variable"']) {
    void document.fonts.load(face, 'Memory Worlds 0123');
  }
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
