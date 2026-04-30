import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Benign browser warning from ResizeObserver — CRA's dev overlay otherwise
// catches it and shows a fullscreen red modal. Production is unaffected.
if (process.env.NODE_ENV === 'development') {
    const RESIZE_OBSERVER_MESSAGES = [
        'ResizeObserver loop completed with undelivered notifications.',
        'ResizeObserver loop limit exceeded',
    ];
    window.addEventListener('error', (e) => {
        if (RESIZE_OBSERVER_MESSAGES.includes(e.message)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
