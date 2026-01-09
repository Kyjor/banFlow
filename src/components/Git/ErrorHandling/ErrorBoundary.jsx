import React from 'react';
import { Result, Button, Space, Typography, Card, Alert } from 'antd';
import {
  BugOutlined,
  ReloadOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Git Client Error:', error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // this.logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    // Navigate to home or reset to initial state
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <Card className="error-card">
            <Result
              status="error"
              icon={
                <BugOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />
              }
              title="Something went wrong"
              subTitle={
                <Space direction="vertical" size="small">
                  <Text type="secondary">
                    The Git client encountered an unexpected error. Don't worry,
                    your work is safe.
                  </Text>
                  {this.state.errorId && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Error ID: {this.state.errorId}
                    </Text>
                  )}
                </Space>
              }
              extra={[
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReload}
                  key="reload"
                >
                  Reload Application
                </Button>,
                <Button
                  icon={<HomeOutlined />}
                  onClick={this.handleGoHome}
                  key="home"
                >
                  Go to Home
                </Button>,
                <Button
                  icon={<QuestionCircleOutlined />}
                  onClick={this.handleReset}
                  key="retry"
                >
                  Try Again
                </Button>,
              ]}
            >
              <div className="error-details">
                <Alert
                  message="Error Details"
                  description={
                    <div>
                      <Paragraph>
                        <Text strong>Error:</Text>{' '}
                        {this.state.error?.message || 'Unknown error'}
                      </Paragraph>
                      {process.env.NODE_ENV === 'development' &&
                        this.state.errorInfo && (
                          <details style={{ marginTop: '16px' }}>
                            <summary
                              style={{ cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Stack Trace (Development Only)
                            </summary>
                            <pre
                              style={{
                                marginTop: '8px',
                                padding: '12px',
                                background: '#f5f5f5',
                                borderRadius: '4px',
                                fontSize: '12px',
                                overflow: 'auto',
                                maxHeight: '200px',
                              }}
                            >
                              {this.state.error?.stack}
                            </pre>
                          </details>
                        )}
                    </div>
                  }
                  type="error"
                  showIcon
                />
              </div>
            </Result>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
