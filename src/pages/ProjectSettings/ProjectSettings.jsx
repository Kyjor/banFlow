import React from 'react';
import { Button } from 'antd';
import Layout from '../../layouts/App';

function ProjectSettings() {
  const currentProject = localStorage.getItem('currentProject');
  const trelloToken = localStorage.getItem('trelloToken');
  const trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
  const authLink = `https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&key=${trelloKey}`;
  const [boards, setBoards] = React.useState([]);
  const [selectedBoard, setSelectedBoard] = React.useState('');

  const handleAuthApp = () => {
    // open trello auth link
    window.open(authLink, '_blank');
  };

  const displayAvailableBoards = () => {
    fetch(
      `https://api.trello.com/1/members/me/boards?key=${trelloKey}&token=${trelloToken}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((response) => {
        console.log(`Response: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then((text) => {
        setBoards(JSON.parse(text));
        console.log(text);
      })
      .catch((err) => console.error(err));
  };

  return (
    <Layout>
      {/* eslint-disable-next-line react/no-unescaped-entities */}
      <h1 style={{ fontSize: 50 }}>{currentProject}'s Settings</h1>
      <span>Synced trello board: {selectedBoard}</span>
      <Button onClick={handleAuthApp}>Auth trello</Button>
      {trelloToken && (
        <Button onClick={displayAvailableBoards}>Display Boards</Button>
      )}
      <div>
        {boards.map((board) => (
          <div key={board.id}>
            <button onClick={() => setSelectedBoard(board.name)}>
              {board.name}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default ProjectSettings;
