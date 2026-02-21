import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

// Subscribe to Firebase auth state before first render
useAuthStore.getState().initAuth();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
