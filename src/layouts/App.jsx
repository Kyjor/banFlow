import {
  BarChartOutlined,
  DesktopOutlined,
  ExpandOutlined,
  FileOutlined,
  PlayCircleOutlined,
  PlusSquareFilled,
  SettingOutlined,
  TableOutlined,
  GitlabOutlined,
  BranchesOutlined,
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
import AddProject from '../components/Projects/AddProject';

const { Content, Sider } = Layout;

// eslint-disable-next-line consistent-return
function loadSidebarComponents(pathname, setShowModal) {
  if (
    pathname === '/dashboard' ||
    pathname === '/' ||
    pathname === '/settings'
  ) {
    return (
      <>
        <Menu.Item
          icon={<PlusSquareFilled />}
          onClick={() => {
            setShowModal(true);
          }}
          title="Add New Project"
          key="2"
        >
          Add New Project
        </Menu.Item>
        <Menu.Item icon={<SettingOutlined />}>
          <Link to="/settings" />
          Settings
        </Menu.Item>
      </>
    );
  }
  const currentProject = localStorage.getItem('currentProject');
  return (
    <>
      <Menu.Item icon={<PlusSquareFilled />} title="Kanban" key="2">
        <Link to={`/projectPage/${currentProject}`} />
        Kanban
      </Menu.Item>
      <Menu.Item icon={<TableOutlined />}>
        <Link to={`/sheets/${currentProject}`} />
        Table
      </Menu.Item>
      <Menu.Item icon={<BarChartOutlined />}>Analytics (Coming Soon)</Menu.Item>
      <Menu.Item icon={<FileOutlined />}>
        <Link to={`/docs/${currentProject}`} />
        Docs
      </Menu.Item>
      <Menu.Item icon={<ExpandOutlined />}>
        <Link to={`/charts/${currentProject}`} />
        Charts
      </Menu.Item>
      <Menu.Item icon={<GitlabOutlined />}>
        <Link to={`/git/repositories`} />
        Git Repositories
      </Menu.Item>
      <Menu.Item icon={<BranchesOutlined />}>
        <Link to={`/git/operations`} />
        Git Operations
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
  const [showModal, setShowModal] = useState(false);
  const { children } = props;
  const location = useLocation();

  const sidebarComponents = loadSidebarComponents(
    location.pathname,
    setShowModal,
  );

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Header>
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
          style={{ background: `black` }}
        >
          <div className="logo" />
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            {sidebarComponents}
          </Menu>
        </Sider>
        <Content
          className="h-screen bg-gradient-to-t from-blue-700 to-gray-200 items-center justify-center"
          style={{
            background: 'linear-gradient(to top, #3a7bd5, #e5e5e5)',
          }}
        >
          <div
            className="site-layout-background"
            style={{
              minHeight: 360,
            }}
          >
            <AddProject
              handleCancel={() => {
                setShowModal(false);
                window.location.reload();
              }}
              visible={showModal}
            />
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
