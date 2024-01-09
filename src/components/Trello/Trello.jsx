import React, { useEffect } from 'react';

// import TrelloClient from 'react-trello-client'
import { TrelloClient } from 'trello.js';

const TRELLO_API_KEY = 'nothing';
// const  trelloClient = new TrelloClient({
//   apiKey: 'nothing',
//   apiToken: 'nothing',
//
//
// });
// const config: Config = {
//   apiKey: 'nothing',
//   apiToken: 'nothing',
//   telemetry: {
//     allowedToPassAuthenticationStatus: false,  // true by default
//     allowedToPassRequestStatusCode: true,  // true by default
//     allowedToPassRequestTimings: false,  // true by default
//     allowedToPassTimeout: true, // true by default
//   },
// };
async function main() {
  const trelloClient = new TrelloClient({
    apiKey: 'nothing',
    apiToken: 'nothing',
  });
  const createdBoard = await trelloClient.boards.createBoard({
    name: 'My first board',
    desc: 'From trello.js with love',
  });
}

function Trello() {
  useEffect(() => {
    main();
    // window.open('https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&name=Server%20Token&key=nothing', '_blank', 'top=500,left=200,frame=false,nodeIntegration=no');
  }, []);
  return (
    <div className="node">
      <h1 className="node-title">Please login to continue...</h1>
      <p className="node-text">
        Welcome to the React Trello Client example. To use this example, please
        get your developer API key from Get the API key from{' '}
        <a href="https://trello.com/app-key/">https://trello.com/app-key/</a>{' '}
        then pass it as a value of <i>apiKey</i> prop.
      </p>
      {/* <TrelloClient */}
      {/*  clientVersion={1} // number: {1}, {2}, {3} */}
      {/*  apiEndpoint="https://api.trello.com" // string: "https://api.trello.com" */}
      {/*  authEndpoint="https://trello.com" // string: "https://trello.com" */}
      {/*  intentEndpoint="https://trello.com" // string: "https://trello.com" */}
      {/*  authorizeName="Trello" // string: "React Trello Client" */}
      {/*  authorizeType="redirect" // string: popup | redirect */}
      {/*  authorizePersist={true} */}
      {/*  authorizeInteractive={true} */}
      {/*  authorizeScopeRead={false} // boolean: {true} | {false} */}
      {/*  authorizeScopeWrite={true} // boolean: {true} | {false} */}
      {/*  authorizeScopeAccount={true} // boolean: {true} | {false} */}
      {/*  authorizeExpiration="never" // string: "1hour", "1day", "30days" | "never" */}
      {/*  authorizeOnSuccess={() => console.log('Login successful!')} // function: {() => console.log('Login successful!')} */}
      {/*  authorizeOnError={() => console.log('Login error!')} // function: {() => console.log('Login error!')} */}
      {/*  autoAuthorize={false} // boolean: {true} | {false} */}
      {/*  authorizeButton={true} // boolean: {true} | {false} */}
      {/*  buttonStyle="metamorph" // string: "metamorph" | "flat" */}
      {/*  buttonColor="green" // string: "green" | "grayish-blue" | "light" */}
      {/*  buttonText="Login with Trello" // string: "Login with Trello" */}
      {/* /> */}
    </div>
  );
}

export default Trello;
