import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@rivet/configurator/styles.css';
import App from './App.jsx';
import './styles/site.css';
import './styles/configurator-theme.css';
import {registerBrowserTools} from './site/webmcp.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
registerBrowserTools();
