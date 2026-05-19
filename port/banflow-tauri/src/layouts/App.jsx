import {
  BarChartOutlined,
  DesktopOutlined,
  ExpandOutlined,
  FileOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  TableOutlined,
  GitlabOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import React, { useLayoutEffect, useState } from 'react';
// Styles
import './tailwind-output.css';
// Components
import PropTypes from 'prop-types';
import { useLocation, Link } from 'react-router-dom';
import { tauriSend } from '../utils/tauri';
import { Header } from 'antd/es/layout/layout';
import GameNotification from '../components/GameNotification/GameNotification';

const { Content, Sider } = Layout;

function loadSidebarItems(pathname) {
  const currentProject = localStorage.getItem('currentProject');
  if (
    !currentProject ||
    currentProject === 'null' ||
    currentProject === 'undefined' ||
    pathname === '/dashboard' ||
    pathname === '/' ||
    pathname === '/settings'
  ) {
    return [
      {
        key: 'git',
        icon: <GitlabOutlined />,
        label: <Link to="/git">Git</Link>,
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <Link to="/settings">Settings</Link>,
      },
    ];
  }
  return [
    {
      key: 'kanban',
      title: 'Kanban',
      label: (
        <Link to={`/projectPage/${currentProject}`}>Kanban</Link>
      ),
    },
    {
      key: 'table',
      icon: <TableOutlined />,
      label: <Link to={`/sheets/${currentProject}`}>Table</Link>,
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: <Link to="/analytics">Analytics</Link>,
    },
    {
      key: 'docs',
      icon: <FileOutlined />,
      label: <Link to={`/docs/${currentProject}`}>Docs</Link>,
    },
    {
      key: 'charts',
      icon: <ExpandOutlined />,
      label: <Link to={`/charts/${currentProject}`}>Charts</Link>,
    },
    {
      key: 'project-git',
      icon: <GitlabOutlined />,
      label: <Link to={`/git/${currentProject}`}>Git</Link>,
    },
    {
      key: 'project-settings',
      icon: <SettingOutlined />,
      label: (
        <Link to={`/projectSettings/${currentProject}`}>Settings</Link>
      ),
    },
    {
      key: 'game',
      icon: <PlayCircleOutlined />,
      label: <Link to={`/game/${currentProject}`}>Game</Link>,
    },
  ];
}

function App(props) {
  const [collapsed, setCollapsed] = useState(true);
  const { children } = props;
  const location = useLocation();

  useLayoutEffect(() => {
    if (
      location.pathname === '/dashboard' ||
      location.pathname === '/' ||
      location.pathname === '/settings'
    ) {
      localStorage.removeItem('currentProject');
    }
  }, [location.pathname]);

  const sidebarItems = loadSidebarItems(location.pathname);

  // Get theme settings from localStorage
  const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const sidebarColor = appSettings.sidebarColor || '#001529';
  const headerColor = appSettings.headerColor || '#001529';
  const backgroundGradient = appSettings.backgroundGradient || [
    '#3a7bd5',
    '#e5e5e5',
  ];
  const backgroundStyle =
    backgroundGradient &&
    Array.isArray(backgroundGradient) &&
    backgroundGradient.length >= 2
      ? `linear-gradient(to top, ${backgroundGradient[0]}, ${backgroundGradient[1]})`
      : 'linear-gradient(to top, #3a7bd5, #e5e5e5)';

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Header style={{ background: headerColor }}>
        <Menu
          theme="dark"
          defaultSelectedKeys={['dashboard']}
          mode="horizontal"
          items={[
            {
              key: 'dashboard',
              icon: <DesktopOutlined />,
              title: 'Dashboard',
              label: <Link to="/dashboard">Dashboard</Link>,
              onClick: () => {
                tauriSend('utils:closeTimerWindow');
              },
            },
          ]}
        />
      </Header>
      <Layout className="site-layout">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{ background: sidebarColor }}
        >
          <div className="logo" />
          <Menu
            theme="dark"
            mode="inline"
            items={sidebarItems}
          />
        </Sider>
        <Content
          className="h-screen bg-gradient-to-t from-blue-700 to-gray-200 items-center justify-center"
          style={{
            background: backgroundStyle,
          }}
        >
          <div
            className="site-layout-background"
            style={{
              minHeight: 360,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
      {/* <Footer /> */}
      <GameNotification />
    </Layout>
  );
}

App.propTypes = {
  children: PropTypes.node.isRequired,
};

export default App;
