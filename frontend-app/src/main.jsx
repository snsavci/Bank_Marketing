import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PredictionScreen from './PredictionScreen.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PredictionScreen />
  </StrictMode>,
);
