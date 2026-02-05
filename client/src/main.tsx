import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const preventZoom = () => {
  window.addEventListener(
    'wheel',
    (event) => {
      if ((event as WheelEvent).ctrlKey) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === '+' || event.key === '-' || event.key === '=')
      ) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    'gesturestart' as any,
    (event: Event) => {
      event.preventDefault();
    },
    { passive: false },
  );
};

preventZoom();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

