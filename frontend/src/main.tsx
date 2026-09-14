import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LangProvider } from './i18n';
import './styles/tokens.css';
import './styles/tailwind.css';
import './styles/agents.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>,
);
