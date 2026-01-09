import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Alert,
  Divider,
} from 'antd';
import Layout from '../../layouts/App';
import gameService from '../../services/GameService';
import eventSystem from '../../services/EventSystem';
import { playPlatformer } from './games/Platformer';

const { Title, Paragraph, Text } = Typography;

class GameLibraryPage extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');

    this.state = {
      lokiLoaded: false,
      nodes: {},
      selectedGame: 'platformer',
      goldBalance: 0,
      lastRunStats: null,
      showLibrary: true,
      canvasKey: 0,
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState((prevState) => ({
      ...prevState,
      ...newState,
      goldBalance: gameService.getInventory().gold || 0,
      lokiLoaded: true,
    }));
  }

  awardGold = (amount, reason = 'game_reward', meta = {}) => {
    if (!amount || amount <= 0) return;
    gameService.inventory.gold += amount;
    gameService.saveGameState();
    this.setState({ goldBalance: gameService.getInventory().gold });
    eventSystem.emit('game:reward', {
      type: 'gold',
      amount,
      reason,
      ...meta,
    });
  };

  playSelectedGame = () => {
    const { canvasKey } = this.state;
    this.setState({ showLibrary: false, canvasKey: canvasKey + 1 }, () => {
      this.startGame();
    });
  };

  startGame = () => {
    const { selectedGame } = this.state;
    const canvas = document.querySelector('#game-canvas');
    const width = canvas ? canvas.clientWidth : 960;
    const height = canvas ? canvas.clientHeight : 540;
    if (selectedGame === 'platformer') {
      playPlatformer({
        canvasId: '#game-canvas',
        width,
        height,
        onComplete: ({ coinsCollected, duration, totalGold }) => {
          this.awardGold(totalGold, 'platformer_level_complete', {
            coinsCollected,
            sessionDuration: duration,
          });
          this.setState({
            lastRunStats: {
              coinsCollected,
              duration,
              totalGold,
            },
            goldBalance: gameService.getInventory().gold,
          });
        },
      });
    }
  };

  renderGameLibrary() {
    const { selectedGame, goldBalance, lastRunStats, showLibrary, canvasKey } =
      this.state;

    const games = [
      {
        key: 'platformer',
        title: 'Precision Platformer',
        description:
          'Tight controls, dash and jump across a single handcrafted level. Collect coins, avoid spikes, and reach the goal.',
        tags: ['Platformer', 'Dash', 'One Level'],
      },
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            Game Library
          </Title>
          <Tag color="gold" style={{ fontSize: 16, padding: '6px 10px' }}>
            Gold: {goldBalance.toFixed(2)}
          </Tag>
        </div>

        {showLibrary && (
          <Row gutter={[16, 16]}>
            {games.map((game) => (
              <Col xs={24} md={12} lg={8} key={game.key}>
                <Card
                  title={game.title}
                  bordered
                  bodyStyle={{ minHeight: 160 }}
                  extra={
                    selectedGame === game.key ? (
                      <Tag color="blue">Selected</Tag>
                    ) : null
                  }
                  onClick={() => this.setState({ selectedGame: game.key })}
                  style={{ cursor: 'pointer' }}
                >
                  <Paragraph>{game.description}</Paragraph>
                  <Space wrap>
                    {game.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </Space>
                  <Divider />
                  <Space>
                    <Button
                      type="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        this.setState(
                          { selectedGame: game.key },
                          this.playSelectedGame,
                        );
                      }}
                    >
                      Play (Fullscreen)
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        this.setState({ selectedGame: game.key });
                      }}
                    >
                      Details
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {!showLibrary && (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">Playing: Precision Platformer</Text>
            <Button onClick={() => this.setState({ showLibrary: true })}>
              Back to Library
            </Button>
          </Space>
        )}

        {lastRunStats && (
          <Alert
            message="Last Run"
            description={`Coins: ${lastRunStats.coinsCollected} • Time: ${lastRunStats.duration}s • Gold Earned: ${lastRunStats.totalGold}`}
            type="success"
            showIcon
          />
        )}
        <div style={{ marginTop: 12 }}>
          <canvas
            key={`canvas-${canvasKey}`}
            id="game-canvas"
            width="1920"
            height="1080"
            style={{
              width: '100%',
              height: 'calc(100vh - 220px)',
              borderRadius: 8,
              border: '1px solid #d9d9d9',
              background: '#111',
            }}
          />
        </div>
      </Space>
    );
  }

  render() {
    const { lokiLoaded } = this.state;

    return lokiLoaded ? (
      <Layout>
        <div style={{ padding: 24 }}>
          <Title level={2} style={{ marginBottom: 16 }}>
            {this.currentProject ? `${this.currentProject} Games` : 'Games'}
          </Title>
          {this.renderGameLibrary()}
        </div>
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default GameLibraryPage;
