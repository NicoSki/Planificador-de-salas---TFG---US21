import React from 'react';
import ReactDOM from 'react-dom/client';
import {CssBaseline, ThemeProvider, createTheme} from '@mui/material'; 
import App from './App';

//Estilos para barra de navegacion:
const tema = createTheme({
  palette: {background: {default: '#eef2f6'}},
  typography: {fontFamily: '"Segoe UI", Roboto, Arial, sans-serif'}
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

