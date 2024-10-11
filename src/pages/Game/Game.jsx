import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import kaplay from 'kaplay';

import Layout from '../../layouts/App';

class SheetPage extends Component {
  constructor(props) {
    super(props);

    this.currentProject = localStorage.getItem('currentProject');
    this.trelloToken = localStorage.getItem('trelloToken');
    this.trelloKey = `eeccec930a673bbbd5b6142ff96d85d9`;
    this.authLink = `https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=${this.trelloKey}`;

    this.state = {
      lokiLoaded: false,
      nodes: {},
    };
  }

  componentDidMount() {
    const newState = ipcRenderer.sendSync(
      'api:initializeProjectState',
      this.projectName,
    );

    this.setState({
      ...this.state,
      ...newState,
    });
  }

  playGame = () => {
    // Input handling and basic player movement

    // Start kaboom
    kaplay({
      width: 640,
      height: 640,
      font: 'sans-serif',
      canvas: document.querySelector('#mycanvas'),
      background: [0, 0, 255],
    });
    setGravity(2400);
    setBackground(0, 0, 0);

    loadSprite(
      'bean',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAA1CAYAAADyMeOEAAAAAXNSR0IArs4c6QAAAn5JREFUaIHdm7txAkEMhnUMBUAFEEPmcUgHhHRBQXThkA4IGTKIoQLoAEcw60PS6XkP/zNO7Nt/95O099hdV5Co2WTx9LS/PS5V1FhKhZt6QTlFBSHEJBOUkicAbugugEtZ4M3QUtjVbq32Pmz3quu14GpoCawFlJM0CFJ4FXQTcDQspqYASMDF0BxwG7B1UfBh0H0DLoXBN4E3QlPAXcOW0oKPOLMhAFPiqpOMxtCANXMczfTQgAF0Y/uIghWYe5R4gkX5Up6S+S2CxjrQvjVRPpS0/i9vNbQE2ALb5BnlLwVn797l4A7bfQgwNSju917fut7Q3C0+CpbzjAwoVkklH5lp6fy73s8h11jacX/nxj8C0H8TX+/n94+mjbYP63VU1bw40Uy3/TyuD9JaGVKxNzJK8+kS5tOluk3bopI39iz3SEEsAZJkm/LlKnU2WTxFmc4o9yZPSzVJfAGQ8qYaRYLXvaK8MR/sd6o5vdqt3QPMCqqm/djbgeSlQjog7jUywv8lE7SnQ42n9gtLKjd0prLeF0zP6aHrAzrj46Jv+veZxpI4vj0uVcQmXFsV4p3nt8elQjOtBWhzSkT0NQLI2/HvWlSAyDk99Bsat06W9pz++foO89qcjmFeAEWmPSXet00A12qop8SjsxOpP9BYtrue29rgSRb7w15OsBL3ZHtzOqLtI6bSB3R0tqnBR11fSrpPjd68PLuWmdNBux1E3ZxT9qejwa07pmpoAP9Zk+zNPq4P7hFsPnMiHRQ3sCxf90EbgG4OzHHighh6jgwg92ikRBEH5wCSjknW1bfzoekHYrPV6ingl7qEt34kDepkP0DMgkfqiklf/4fjF/Soc3nSQqqQAAAAAElFTkSuQmCC',
    );

    scene('nogamepad', () => {
      add([
        text('Gamepad not found.\nConnect a gamepad and press a button!', {
          width: width() - 80,
          align: 'center',
        }),
        pos(center()),
        anchor('center'),
      ]);
      onGamepadConnect(() => {
        go('game');
      });
    });

    scene('game', () => {
      const player = add([
        pos(center()),
        anchor('center'),
        sprite('bean'),
        area(),
        body(),
      ]);

      // platform
      add([
        pos(0, height()),
        anchor('botleft'),
        rect(width(), 140),
        area(),
        body({ isStatic: true }),
      ]);

      onGamepadButtonPress((b) => {
        debug.log(b);
      });

      onGamepadButtonPress(['south', 'west'], () => {
        player.jump();
      });

      onGamepadStick('left', (v) => {
        player.move(v.x * 400, 0);
      });

      onGamepadDisconnect(() => {
        go('nogamepad');
      });
    });

    if (getGamepads().length > 0) {
      go('game');
    } else {
      go('nogamepad');
    }
  };

  render() {
    const { lokiLoaded } = this.state;

    return lokiLoaded ? (
      <Layout>
        <h1 style={{ fontSize: 50 }}>{this.currentProject}'s Game</h1>
        <button onClick={this.playGame}>Play Game</button>
        <canvas id="mycanvas" width="320" height="240" />
      </Layout>
    ) : (
      <Layout>
        <h1>Loading...</h1>
      </Layout>
    );
  }
}

export default SheetPage;
