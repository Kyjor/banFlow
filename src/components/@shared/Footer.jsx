// Libs
import React, { Component } from 'react';
import { Layout } from 'antd';
// Styles
import './Footer.scss';
// Config
import { IMAGES } from '../../config';

/**
 * Footer
 *
 * @class Footer
 * @extends {Component}
 */
function Footer() {
  return (
    <Layout.Footer className="footer">
      <img alt="" className="logo" src={IMAGES.LOGO} />
      banFlow ©2022
    </Layout.Footer>
  );
}

export default Footer;
