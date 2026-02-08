
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("React application booting (v18.3.1)...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React render call completed successfully.");
  } catch (err: any) {
    console.error("Initial render error:", err);
    container.innerHTML = `<div style="color: #f87171; padding: 20px; text-align: center; font-family: sans-serif; background: #030712; height: 100vh;">
      <h3 style="font-size: 20px; margin-bottom: 10px;">Mounting Error</h3>
      <p style="color: #9ca3af;">${err.message}</p>
    </div>`;
  }
} else {
  console.error("Error: Root element not found.");
}
