import React from 'react';
import { Button, Table } from 'antd';
import PropTypes from 'prop-types';
import StopWatch from '../StopWatch/StopWatch';

const count = 3;

export default class TimedItemHistory extends React.Component {
  state = {
    initLoading: true,
    loading: false,
    data: [],
    list: [],
  };

  getData = (callback) => {
    const res = {
      results: [
        {
          gender: 'male',
          name: { title: 'Mr', first: 'Aubin', last: 'Roy' },
          email: 'aubin.roy@example.com',
          nat: 'FR',
        },
        {
          gender: 'female',
          name: { title: 'Madame', first: 'Roxane', last: 'Morin' },
          email: 'roxane.morin@example.com',
          nat: 'CH',
        },
        {
          gender: 'male',
          name: { title: 'Mr', first: 'Jacob', last: 'Nielsen' },
          email: 'jacob.nielsen@example.com',
          nat: 'DK',
        },
      ],
    };
  };

  onLoadMore = () => {
    this.setState({
      loading: true,
      list: this.state.data.concat(
        [...new Array(count)].map(() => ({ loading: true, name: {} }))
      ),
    });
    this.getData((res) => {
      const data = this.state.data.concat(res.results);
      this.setState(
        {
          data,
          list: data,
          loading: false,
        },
        () => {
          // Resetting window's offsetTop so as to display react-virtualized demo underfloor.
          // In real scene, you can using public method of react-virtualized:
          // https://stackoverflow.com/questions/46700726/how-to-use-public-method-updateposition-of-react-virtualized
          window.dispatchEvent(new Event('resize'));
        }
      );
    });
  };

  render() {
    const dataSource = () => {
      const sessions = [];
      this.props.node.sessionHistory.forEach((session) => {
        sessions.push({
          key: this.props.node.sessionHistory.indexOf(session),
          id: this.props.node.sessionHistory.indexOf(session),
          item: session.item,
          length: new Date(session.length * 1000).toISOString().substr(11, 8),
          started: session.startDateTime,
          finished: `${`${new Date(
            session.finishDateTime
          ).getDate()}-${new Date(
            session.finishDateTime
          ).getMonth()}-${new Date(
            session.finishDateTime
          ).getFullYear()} ${new Date(
            session.finishDateTime
          ).getHours()}:${new Date(
            session.finishDateTime
          ).getMinutes()}:${new Date(session.finishDateTime).getSeconds()}`}`,
          comment: session.comment,
        });
      });
      return sessions;
    };
    const parentDataSource = () => {
      const sessions = [];
      this.props.parent.sessionHistory.forEach((session) => {
        sessions.push({
          key: this.props.parent.sessionHistory.indexOf(session),
          id: session.nodeId,
          item: session.item,
          length: new Date(session.length * 1000).toISOString().substr(11, 8),
          started: session.startDateTime,
          finished: `${`${new Date(
            session.finishDateTime
          ).getDate()}-${new Date(
            session.finishDateTime
          ).getMonth()}-${new Date(
            session.finishDateTime
          ).getFullYear()} ${new Date(
            session.finishDateTime
          ).getHours()}:${new Date(
            session.finishDateTime
          ).getMinutes()}:${new Date(session.finishDateTime).getSeconds()}`}`,
          comment: session.comment,
        });
      });
      return sessions;
    };
    const parents = [
      // {
      //   title: 'Id',
      //   dataIndex: 'id',
      //   key: 'id',
      // },
      {
        title: 'Date',
        dataIndex: 'finished',
        key: 'finished',
      },
      {
        title: 'Item',
        dataIndex: 'item',
        key: 'item',
      },
      // {
      //   title: 'Started',
      //   dataIndex: 'started',
      //   key: 'started',
      // },
      {
        title: 'Comment',
        dataIndex: 'comment',
        key: 'comment',
      },
      {
        title: 'Length',
        dataIndex: 'length',
        key: 'length',
      },
    ];
    const parentParents = [
      {
        title: 'Id',
        dataIndex: 'id',
        key: 'id',
      },
      {
        title: 'Date',
        dataIndex: 'finished',
        key: 'finished',
      },
      {
        title: 'Item',
        dataIndex: 'item',
        key: 'item',
      },
      // {
      //   title: 'Started',
      //   dataIndex: 'started',
      //   key: 'started',
      // },
      {
        title: 'Comment',
        dataIndex: 'comment',
        key: 'comment',
      },
      {
        title: 'Length',
        dataIndex: 'length',
        key: 'length',
      },
    ];
    const { initLoading, loading, list } = this.state;
    const loadMore =
      !initLoading && !loading ? (
        <div
          style={{
            textAlign: 'center',
            marginTop: 12,
            height: 32,
            lineHeight: '32px',
          }}
        >
          <Button onClick={this.onLoadMore}>more</Button>
        </div>
      ) : null;

    return (
      <Table
        dataSource={this.props.node ? dataSource() : parentDataSource()}
        parents={this.props.node ? parents : parentParents}
      />
    );
  }
}

TimedItemHistory.propTypes = {
  node: PropTypes.object,
  parent: PropTypes.object,
};
