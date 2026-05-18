import React from 'react';
import { Button, Modal } from 'antd';
import PropTypes from 'prop-types';
import ProjectController from '../../api/project/ProjectController';

class AddProject extends React.Component {
  addProject = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-underscore-dangle
    const projectName = this._inputElement.value;
    // eslint-disable-next-line no-underscore-dangle
    this._inputElement.value = '';

    const created = ProjectController.createProject(projectName);
    if (created) {
      const { handleCancel } = this.props;
      handleCancel();
    }
  };

  // eslint-disable-next-line no-return-assign,no-underscore-dangle
  getInputElementRef = (a) => (this._inputElement = a);

  render() {
    const { handleCancel, visible } = this.props;
    return (
      <Modal
        title={
          <div style={{ display: 'flex', marginBottom: '15px' }}>
            Create New Project
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
        ]}
      >
        <div className="header">
          <form onSubmit={this.addProject}>
            <div>
              <input
                ref={this.getInputElementRef}
                placeholder="Project Name"
                className="border-2"
              />
              <button type="submit" className="ant-btn">
                Create
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }
}

export default AddProject;

AddProject.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};
