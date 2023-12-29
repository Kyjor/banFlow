import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Root from './routes/Root';
import TimerRoot from './routes/TimerRoot';

const App = Root;
const Timer = TimerRoot;

class ViewManager extends Component {
  static Views() {
    return {
      app: <App />,
      timer: <Timer />,
    };
  }

  static View(props) {
    let name = props.location.search.substr(1);
    if (name.includes('=')) {
      name = name.slice(0, name.indexOf('='));
    }
    const view = ViewManager.Views()[name];
    if (view == null) throw new Error(`View '${name}' is undefined`);

    return view;
  }

  render() {
    const { name } = this.props;

    return (
      <Router>
        <div>
          {/* <Route path="/" component={this.GetView(name)} /> */}
          <Route path="/" component={ViewManager.View} />
        </div>
      </Router>
    );
  }
}

// ViewManager.propTypes = {
//   name: PropTypes.string.isRequired,
// };

export default ViewManager;
