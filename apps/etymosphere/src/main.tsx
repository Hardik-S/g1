import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { SelectionProvider } from './context/SelectionContext';
import './index.css';
import { placeholderWords } from './data/placeholderWords.ts';

const defaultWord = placeholderWords[0]?.id ?? null;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SelectionProvider initialWordId={defaultWord}>
      <App />
    </SelectionProvider>
  </React.StrictMode>,
);
