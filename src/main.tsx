import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

// Native platform setup (no-op in browser)
async function initNative() {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { App: CapApp } = await import('@capacitor/app');

  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.hide();

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void CapApp.exitApp();
  });
}

void initNative();
useAuthStore.getState().initAuth();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <HashRouter>
    <App />
  </HashRouter>
);
