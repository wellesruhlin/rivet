// The Proteus custom shop: the shared configurator with the Proteus brand pack.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/urbanist';
import '@fontsource-variable/figtree';
import '@rivet/configurator/styles.css';
import App from '@rivet/brand-proteus/app';
import '@rivet/brand-proteus/app/styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
