import * as React from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Switch, Route, withRouter, RouteComponentProps } from 'react-router-dom'

import './main.css'
import Dashboard from './dashboard'
import Users from './users'

class Main extends React.Component <RouteComponentProps<never>> {
  render() {
    const handleMenuSelection = ({key}: {key: string}) => {
        this.props.history.push(key)
    }
    const selectedMenuItems = [this.props.location.pathname]
    return (
      <div className="main">
        <Layout>
          <Layout.Sider>
            <Menu mode="inline" onSelect={handleMenuSelection} selectedKeys={selectedMenuItems}>
              <Menu.Item key="/">
                <Icon type="appstore" />
                <span className="nav-text">Dashboard</span>
              </Menu.Item>
              <Menu.SubMenu key="users" title={<span><Icon type="user" /><span>Users</span></span>}>
                <Menu.Item key="/users/all">
                  <span className="nav-text">All</span>
                </Menu.Item>
                <Menu.Item key="/users/pending">
                  <span className="nav-text">Pending</span>
                </Menu.Item>
                <Menu.Item key="/users/approved">
                  <span className="nav-text">Approved</span>
                </Menu.Item>
                <Menu.Item key="/users/rejected">
                  <span className="nav-text">Rejected</span>
                </Menu.Item>
              </Menu.SubMenu>
            </Menu>
          </Layout.Sider>
          <Layout.Content>
            <Switch>
              <Route path="/" exact={true} component={Dashboard} />
              <Route path="/users/:filter" component={Users} />
            </Switch>
          </Layout.Content>
        </Layout>
      </div>
    )
  }
}

export default withRouter(Main as any);
