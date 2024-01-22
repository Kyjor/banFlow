import { DesktopOutlined, PlusSquareFilled } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import React, { useState } from 'react';
// Styles
import './App.scss';
import './tailwind-output.css';
// Components
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Footer from '../components/@shared/Footer';
import AddProject from '../components/Projects/AddProject';

const { Content, Sider } = Layout;

function App(props) {
  const [collapsed, setCollapsed] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { children } = props;

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Layout className="site-layout">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <div className="logo" />
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item icon={<DesktopOutlined />} title="Dashboard" key="1">
              <Link to="/dashboard" />
              Dashboard
            </Menu.Item>
            <Menu.Item
              icon={<PlusSquareFilled />}
              title="Add New Project"
              key="2"
              onClick={() => {
                setShowModal(true);
              }}
            >
              Add New Project
            </Menu.Item>
          </Menu>
        </Sider>
        <Content
          style={{
            margin: '0 16px',
          }}
        >
          <div
            className="site-layout-background"
            style={{
              padding: 24,
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
      <Footer />
    </Layout>
  );
}

App.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  children: PropTypes.array.isRequired,
};

export default App;
