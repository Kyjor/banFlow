// Libs
import { createRoot } from 'react-dom/client';
import 'antd/dist/antd.css';

import './themes/App.global.scss';
// @ts-ignore - ViewManager is a JSX file
import ViewManager from './ViewManager';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);
root.render(<ViewManager />);
