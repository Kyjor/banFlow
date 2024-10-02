import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
  },
  header: {
    fontSize: '4rem',
    margin: '0 0 20px',
  },
  text: {
    fontSize: '1.5rem',
    marginBottom: '20px',
  },
  link: {
    fontSize: '1.2rem',
    color: '#007bff',
    textDecoration: 'none',
  },
};

function NotFound() {
  const currentProject = localStorage.getItem('currentProject');

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>404 - Page Not Found</h1>
      {/* eslint-disable-next-line react/no-unescaped-entities */}
      <p style={styles.text}>The page you are looking for doesn't exist yet.</p>
      <Link to="/" style={styles.link}>
        Go back to Dashboard
      </Link>
      <Link to={`/projectPage/${currentProject}`} style={styles.link}>
        Go back to Project
      </Link>
    </div>
  );
}

export default NotFound;
