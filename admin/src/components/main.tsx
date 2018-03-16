import { Icon, Layout, Menu } from 'antd'
import * as React from 'react'
import { Route, RouteComponentProps, Switch, withRouter } from 'react-router-dom'

import { safeStorage } from './../helpers/safe-storage'

import Dashboard from './dashboard'
import './main.css'
import Users from './users'

interface MainProps extends RouteComponentProps<never> {}

interface MainState {
  collapsed: boolean
}

class Main extends React.Component <MainProps, MainState> {

  public componentWillMount() {
    const collapsed = safeStorage.getItem('menuState') === 'collapsed'
    this.setState({collapsed})
  }

  public onMenuCollapse = (collapsed: boolean) => {
    this.setState({collapsed})
    safeStorage.setItem('menuState', collapsed ? 'collapsed' : 'expanded')
  }

  public onMenuSelection = ({key}: {key: string}) => {
    this.props.history.push(key)
  }

  public render() {
    const selectedMenuItems = [this.props.location.pathname]
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Sider
          collapsible={true}
          collapsed={this.state.collapsed}
          onCollapse={this.onMenuCollapse}
        >
          <Menu
            mode='inline'
            theme='dark'
            onSelect={this.onMenuSelection}
            selectedKeys={selectedMenuItems}
          >
            <Menu.Item key='/'>
              <Icon type='dashboard' />
              <span className='nav-text'>Dashboard</span>
            </Menu.Item>
            <Menu.SubMenu key='users' title={<span><Icon type='user' /><span>Users</span></span>}>
              <Menu.Item key='/users/all'>
                <span className='nav-text'>All</span>
              </Menu.Item>
              <Menu.Item key='/users/pending'>
                <span className='nav-text'>Pending</span>
              </Menu.Item>
              <Menu.Item key='/users/approved'>
                <span className='nav-text'>Approved</span>
              </Menu.Item>
              <Menu.Item key='/users/rejected'>
                <span className='nav-text'>Rejected</span>
              </Menu.Item>
            </Menu.SubMenu>
          </Menu>
        </Layout.Sider>
        <Layout.Content>
          <Switch>
            <Route path='/' exact={true} component={Dashboard} />
            <Route path='/users/:filter' component={Users} />
          </Switch>
        </Layout.Content>
      </Layout>
    )
  }
}

export default withRouter(Main as any)
