// Libs
import React from 'react';
import { Breadcrumb } from 'antd';
import './Path.scss';

// Styles

/**
 * Path
 *
 * @class Path
 * @extends {Component}
 */
function Path() {
  return (
    <Breadcrumb className="path">
      <Breadcrumb.Item>Projects</Breadcrumb.Item>
    </Breadcrumb>
  );
}

export default Path;
