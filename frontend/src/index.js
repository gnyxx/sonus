import React from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import './css/floating-shapes.css';
import App from './App';

// Apply saved theme before first paint to avoid flash
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
