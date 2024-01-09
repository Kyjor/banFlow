import { PieChartOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import React, { useState } from 'react';
// Styles
import './App.scss';
// Components
import PropTypes from 'prop-types';
import Header from '../components/@shared/Header';
import Footer from '../components/@shared/Footer';

const { Content, Sider } = Layout;

function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}

const items = [getItem('Option 1', '1', <PieChartOutlined />)];

function App(props) {
  const [collapsed, setCollapsed] = useState(true);
  const { children } = props;

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Header />
      <Layout className="site-layout">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <div className="logo" />
          <Menu
            theme="dark"
            defaultSelectedKeys={['1']}
            mode="inline"
            items={items}
          />
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
            {children}
          </div>
        </Content>
      </Layout>
      <Footer />
    </Layout>
  );
}

App.propTypes = {
  children: PropTypes.array.isRequired,
};

export default App;
