import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-thai/500.css';
import './ui/tokens.css';
import './ui/base.css';
import { App } from './App';
import { loadFonts } from './ui/fonts';

loadFonts()
  .catch(() => undefined)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
