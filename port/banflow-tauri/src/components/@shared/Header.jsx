// Libs
import React from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';
import styles from './Header.module.scss';

function Header() {
  return (
    <Layout.Header className={styles.header}>
      <Menu theme="dark" mode="horizontal" className={styles.menu}>
        <Menu.Item key="1" style={{ width: `15%` }}>
          <Link to="/dashboard">Dashboard</Link>
        </Menu.Item>
      </Menu>
    </Layout.Header>
  );
}

export default Header;
