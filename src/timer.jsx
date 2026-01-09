// Libs
import React from 'react';
import { createRoot } from 'react-dom/client';
// Styles
import './themes/App.global.scss';
import ViewManager from './ViewManager';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ViewManager name="timer" />);
