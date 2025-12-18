import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode disabled for PeerJS stability in dev, can be enabled with proper cleanup handling
  <React.Fragment> 
    <App />
  </React.Fragment>
);