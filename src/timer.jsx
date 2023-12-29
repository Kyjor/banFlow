// Libs
import React from 'react';
import { render } from 'react-dom';
// Styles
import './themes/App.global.scss';
import ViewManager from './ViewManager';

render(<ViewManager name="timer" />, document.getElementById('root'));
