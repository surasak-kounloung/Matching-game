import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-thai/500.css';
import './ui/tokens.css';
import './ui/base.css';
import { App } from './App';
import { loadFonts } from './ui/fonts';
import { installKioskGuards, keepScreenAwake } from './ui/kiosk';

installKioskGuards();
keepScreenAwake();

loadFonts()
  .catch((error: unknown) => console.error('font load failed', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
