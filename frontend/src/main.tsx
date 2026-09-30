import React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress benign Framer Motion dev warnings about list keys
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Warning: Each child in a list') || args[0].includes('Framer Motion'))) return;
  origError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
