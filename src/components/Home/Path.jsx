import React from 'react';
import { Breadcrumb } from 'antd';
import './Path.scss';

/**
 * Path
 *
 * @class Path
 * @extends {Component}
 */
function Path() {
  return (
    <Breadcrumb className="path">
      <Breadcrumb.Item>Home</Breadcrumb.Item>
      <Breadcrumb.Item>List</Breadcrumb.Item>
      <Breadcrumb.Item>App</Breadcrumb.Item>
    </Breadcrumb>
  );
}

export default Path;
