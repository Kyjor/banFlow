import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
// Screens
import TimerPage from '../pages/Timer/TimerPage';

function TimerRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TimerPage />} />
      </Routes>
    </HashRouter>
  );
}

export default TimerRoutes;
