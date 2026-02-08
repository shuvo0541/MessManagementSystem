
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("App is initializing...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Error: Root element not found!");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React app mounted successfully.");
} catch (error) {
  console.error("React mounting error:", error);
}
