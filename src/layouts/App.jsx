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
import React, { useState } from 'react';
// Styles
import './tailwind-output.css';
// Components
import PropTypes from 'prop-types';
import { useLocation, Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import { Header } from 'antd/es/layout/layout';

const { Content, Sider } = Layout;

// eslint-disable-next-line consistent-return
function loadSidebarComponents(pathname) {
  if (pathname === '/dashboard' || pathname === '/' || pathname === '/settings') {
    localStorage.removeItem('currentProject');
  }

  const currentProject = localStorage.getItem('currentProject');
  if (
    !currentProject ||
    currentProject === 'null' ||
    currentProject === 'undefined' ||
    pathname === '/dashboard' ||
    pathname === '/' ||
    pathname === '/settings'
  ) {
    return (
      <>
        <Menu.Item icon={<GitlabOutlined />}>
          <Link to="/git" />
          Git
        </Menu.Item>
        <Menu.Item icon={<SettingOutlined />}>
          <Link to="/settings" />
          Settings
        </Menu.Item>
      </>
    );
  }
  return (
    <>
      <Menu.Item title="Kanban" key="2">
        <Link to={`/projectPage/${currentProject}`} />
        Kanban
      </Menu.Item>
      <Menu.Item icon={<TableOutlined />}>
        <Link to={`/sheets/${currentProject}`} />
        Table
      </Menu.Item>
      <Menu.Item icon={<BarChartOutlined />}>
        <Link to="/analytics" />
        Analytics
      </Menu.Item>
      <Menu.Item icon={<FileOutlined />}>
        <Link to={`/docs/${currentProject}`} />
        Docs
      </Menu.Item>
      <Menu.Item icon={<ExpandOutlined />}>
        <Link to={`/charts/${currentProject}`} />
        Charts
      </Menu.Item>
      <Menu.Item icon={<GitlabOutlined />}>
        <Link to={`/git/${currentProject}`} />
        Git
      </Menu.Item>
      <Menu.Item icon={<SettingOutlined />}>
        <Link to={`/projectSettings/${currentProject}`} />
        Settings
      </Menu.Item>
      <Menu.Item icon={<PlayCircleOutlined />}>
        <Link to={`/game/${currentProject}`} />
        Game
      </Menu.Item>
    </>
  );
}

function App(props) {
  const [collapsed, setCollapsed] = useState(true);
  const { children } = props;
  const location = useLocation();

  const sidebarComponents = loadSidebarComponents(location.pathname);

  // Get theme settings from localStorage
  const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const sidebarColor = appSettings.sidebarColor || '#001529';
  const headerColor = appSettings.headerColor || '#001529';
  const backgroundGradient = appSettings.backgroundGradient || ['#3a7bd5', '#e5e5e5'];
  const backgroundStyle = backgroundGradient && Array.isArray(backgroundGradient) && backgroundGradient.length >= 2
    ? `linear-gradient(to top, ${backgroundGradient[0]}, ${backgroundGradient[1]})`
    : 'linear-gradient(to top, #3a7bd5, #e5e5e5)';

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Header style={{ background: headerColor }}>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="horizontal">
          <Menu.Item
            icon={<DesktopOutlined />}
            title="Dashboard"
            key="1"
            onClick={() => {
              ipcRenderer.sendSync('utils:closeTimerWindow');
            }}
          >
            <Link to="/dashboard" />
            Dashboard
          </Menu.Item>
        </Menu>
      </Header>
      <Layout className="site-layout">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{ background: sidebarColor }}
        >
          <div className="logo" />
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            {sidebarComponents}
          </Menu>
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
    </Layout>
  );
}

App.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  children: PropTypes.array.isRequired,
};

export default App;
