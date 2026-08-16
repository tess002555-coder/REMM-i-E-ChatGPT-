import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppMascot from './AppMascot.tsx';
import AppPanel from './AppPanel.tsx';
import './index.css';

const urlParams = new URLSearchParams(window.location.search);
const windowType = urlParams.get('window');

function RootRouter() {
  if (windowType === 'mascot') {
    return <AppMascot />;
  }
  if (windowType === 'panel') {
    return <AppPanel />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
);

