import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// No StrictMode: its dev double-mount races with R3F's canvas root unmount.
createRoot(document.getElementById('root')!).render(<App />);
