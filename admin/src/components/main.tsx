import { Alert, Avatar, Button, Col, Icon, Layout, Menu, Row } from 'antd'
import * as React from 'react'
import { Route, RouteComponentProps, Switch, withRouter } from 'react-router-dom'

import { safeStorage } from './../helpers/safe-storage'

import Dashboard from './dashboard'
import './main.css'
import Users from './users'

interface UserSession {
  name: string
  avatar: string
  token: string
}

interface MainProps extends RouteComponentProps<never> {}

interface MainState {
  alert?: AlertMessage
  collapsed: boolean
  loading: boolean
  user?: UserSession
}

interface GooglePlatformWindow extends Window {
  /** Set by react build script env substitution using REACT_APP_GOOGLE_CLIENT_ID. */
  GOOGLE_CLIENT_ID: string
  gapi: any
}

interface AlertMessage {
  message: string
  type?: 'error' | 'warning' | 'info'
}

function AlertBanner(props: {alert?: AlertMessage}) {
  if (!props.alert) { return null }
  return (
    <Alert
      banner={true}
      message={props.alert.message}
      showIcon={true}
      type={props.alert.type}
    />
  )
}

class Main extends React.Component <MainProps, MainState> {

  private auth2Session?: any

  public componentWillMount() {
    const collapsed = safeStorage.getItem('menuState') === 'collapsed'
    const user = safeStorage.getJSON('userSession')
    this.setState({collapsed, user, loading: false})
  }

  public async getAuth2() {
    if (!this.auth2Session) {
      const {gapi} = (window as GooglePlatformWindow)
      await new Promise((resolve, reject) => {
        gapi.load('auth2', {timeout: 10 * 1000, callback: resolve, onerror: reject, ontimeout: reject})
      })
      this.auth2Session = await gapi.auth2.init({
        client_id: (window as GooglePlatformWindow).GOOGLE_CLIENT_ID,
      })
    }
    return this.auth2Session
  }

  public async login() {
    const auth = await this.getAuth2()
    const user = await auth.signIn()
    const {id_token} = user.getAuthResponse(true)
    const profile = user.getBasicProfile()
    return {
      avatar: profile.getImageUrl(),
      name: profile.getName(),
      token: id_token,
    } as UserSession
  }

  public async logout() {
    const auth = await this.getAuth2()
    await auth.signOut()
  }

  public onLoginClick = () => {
    this.setState({loading: true, alert: undefined})
    this.login().then((user) => {
      this.setState({user, loading: false})
      safeStorage.setJSON('userSession', user)
    }).catch((error) => {
      const errorMessage = error.error || error.message || error
      this.setState({
        alert: {
          message: `Unable to login: ${ errorMessage }`,
          type: 'error',
        },
        loading: false,
        user: undefined,
      })
    })
  }

  public onLogoutClick = () => {
    this.setState({loading: true, alert: undefined})
    safeStorage.removeItem('userSession')
    this.logout().then(() => {
      this.setState({user: undefined, loading: false})
    }).catch((error) => {
      const errorMessage = error.error || error.message || error
      this.setState({
        alert: {
          message: `Encountered an error when logging out: ${ errorMessage }`,
          type: 'warning',
        },
        loading: false,
        user: undefined,
      })
    })
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
    if (!this.state.user) {
      return (
        <Layout>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
            <AlertBanner alert={this.state.alert} />
          </div>
          <Layout.Content>
            <Row style={{ minHeight: '100vh' }} type='flex' justify='space-around' align='middle'>
              <Col>
                <Button size='large' type='primary' loading={this.state.loading} onClick={this.onLoginClick}>
                  Login with Google
                </Button>
              </Col>
            </Row>
          </Layout.Content>
        </Layout>
      )
    }
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
        <Layout>
          <Layout.Content>
            <div className='user-info'>
              <span className='name'>
                <Avatar src={this.state.user.avatar} />
                {this.state.user.name}
              </span>
              <span className='logout'>
                <Button
                  type='dashed'
                  size='small'
                  loading={this.state.loading}
                  onClick={this.onLogoutClick}
                >
                  Log out
                </Button>
              </span>
            </div>
            <Switch>
              <Route path='/' exact={true} component={Dashboard} />
              <Route path='/users/:filter' component={Users} />
            </Switch>
          </Layout.Content>
        </Layout>
      </Layout>
    )
  }
}

export default withRouter(Main as any)
