// Libs
import React from 'react';
import { Layout } from 'antd';
// Styles
import './Footer.scss';

/**
 * Footer
 *
 * @class Footer
 * @extends {Component}
 */
function Footer() {
  return (
    <Layout.Footer className="footer">
      banFlow ©{new Date().getFullYear()}
    </Layout.Footer>
  );
}

export default Footer;
