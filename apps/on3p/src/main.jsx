// The ON3P custom shop: the shared configurator with the ON3P brand pack.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/saira/wdth.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@arc/configurator/styles.css';
import '@arc/brand-on3p/app/styles.css';
import App from '@arc/brand-on3p/app';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
