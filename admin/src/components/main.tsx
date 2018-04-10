import { Avatar, Button, Col, Icon, Layout, Menu, Modal, Row } from "antd"
import * as React from "react"
import {
  Route,
  RouteComponentProps,
  Switch,
  withRouter,
} from "react-router-dom"

import { API } from "./../helpers/api"
import { safeStorage } from "./../helpers/safe-storage"

import Dashboard from "./dashboard"
import "./main.css"
import SignupDetail from "./signup-detail"
import SignupList from "./signup-list"

interface UserSession {
  name: string
  avatar: string
  token: string
}

interface MainProps extends RouteComponentProps<never> {}

interface MainState {
  collapsed: boolean
  loading: boolean
  user?: UserSession
}

interface AppWindow extends Window {
  /** Set by react build script env substitution using REACT_APP_SERVER_ADDRESS. */
  SERVER_ADDRESS: string
  /** Assigned by Google platform tools on load. */
  gapi: any
}
const localWindow = window as AppWindow

/** Main component, handles navigation and user session. */
class Main extends React.Component<MainProps, MainState> {
  public api = new API({ address: localWindow.SERVER_ADDRESS })

  private auth2Session?: any

  public componentWillMount() {
    const collapsed = safeStorage.getItem("menuState") === "collapsed"
    const user = safeStorage.getJSON("userSession") as UserSession
    if (user) {
      this.api.setToken(user.token)
    }
    this.api.refresh = this.refreshToken
    this.setState({ collapsed, user, loading: false })
  }

  /** Return the Google oAuth2 session, loads a new session if none was previously initiated. */
  public async getAuth2() {
    if (!this.auth2Session) {
      const clientId = await (await fetch(
        `${localWindow.SERVER_ADDRESS}/client_id`,
      )).text()
      const { gapi } = localWindow
      await new Promise((resolve, reject) => {
        gapi.load("auth2", {
          callback: resolve,
          onerror: reject,
          ontimeout: reject,
          timeout: 10 * 1000,
        })
      })
      this.auth2Session = await gapi.auth2.init({
        client_id: clientId,
      })
    }
    return this.auth2Session
  }

  /** Presents the Google OAuth2 login window and return the session. */
  public async login() {
    const auth = await this.getAuth2()
    const user = await auth.signIn()
    const { id_token } = user.getAuthResponse(true)
    const profile = user.getBasicProfile()
    this.api.setToken(id_token)
    const { email } = await this.api.call("/whoami")
    if (email !== profile.getEmail()) {
      throw new Error("Invalid login")
    }
    return {
      avatar: profile.getImageUrl(),
      name: profile.getName(),
      token: id_token,
    } as UserSession
  }

  /** Deauthorizes OAuth2 session. */
  public async logout() {
    const auth = await this.getAuth2()
    await auth.signOut()
  }

  /** Tries to refresh the OAuth2 token if it expired. */
  public refreshToken = async (prevToken: string) => {
    const auth = await this.getAuth2()
    const { id_token } = await auth.currentUser.get().reloadAuthResponse()
    this.state.user!.token = id_token
    safeStorage.setJSON("userSession", this.state.user!)
    return id_token
  }

  /** Login action, logs the user in and persists the session. */
  public onLoginClick = () => {
    this.setState({ loading: true })
    this.login()
      .then((user) => {
        this.setState({ user, loading: false })
        safeStorage.setJSON("userSession", user)
      })
      .catch((error) => {
        const errorMessage = error.error || error.message || error
        Modal.error({
          content: errorMessage,
          title: "Unable to login",
        })
        this.setState({
          loading: false,
          user: undefined,
        })
      })
  }

  /** Logout action, logs the user out and removes the session. */
  public onLogoutClick = () => {
    this.setState({ loading: true })
    safeStorage.removeItem("userSession")
    this.logout()
      .then(() => {
        this.setState({ user: undefined, loading: false })
      })
      .catch((error) => {
        const errorMessage = error.error || error.message || error
        Modal.warning({
          content: errorMessage,
          title: "Could not log you out",
        })
        this.setState({
          loading: false,
          user: undefined,
        })
      })
  }

  /** Sidebar menu, persists the collapsed state. */
  public onMenuCollapse = (collapsed: boolean) => {
    this.setState({ collapsed })
    safeStorage.setItem("menuState", collapsed ? "collapsed" : "expanded")
  }

  /** Menu action, called when user selects a menu item. */
  public onMenuSelection = ({ key }: { key: string }) => {
    this.props.history.push(key)
  }

  public render() {
    const activePage = this.props.location.pathname
    const renderSignupDetail = (props: RouteComponentProps<any>) => (
      <SignupDetail
        api={this.api}
        history={props.history}
        match={props.match.params}
      />
    )
    const renderSignupList = (props: RouteComponentProps<any>) => (
      <SignupList
        api={this.api}
        history={props.history}
        location={props.location}
      />
    )
    const renderDashboard = (props: RouteComponentProps<any>) => (
      <Dashboard api={this.api} />
    )
    if (!this.state.user) {
      // render only login button if user session is not set
      return (
        <div className="main">
          <Layout>
            <Layout.Content>
              <Row
                style={{ minHeight: "100vh" }}
                type="flex"
                justify="space-around"
                align="middle"
              >
                <Col>
                  <Button
                    size="large"
                    type="primary"
                    icon="login"
                    loading={this.state.loading}
                    onClick={this.onLoginClick}
                  >
                    Login with Google
                  </Button>
                </Col>
              </Row>
            </Layout.Content>
          </Layout>
        </div>
      )
    }
    return (
      <div className="main">
        <Layout style={{ minHeight: "100vh" }}>
          <Layout.Sider
            collapsible={true}
            collapsed={this.state.collapsed}
            onCollapse={this.onMenuCollapse}
          >
            <Menu
              mode="inline"
              theme="dark"
              onSelect={this.onMenuSelection}
              selectedKeys={[activePage]}
            >
              <Menu.Item key="/admin">
                <Icon type="dashboard" />
                <span className="nav-text">Dashboard</span>
              </Menu.Item>
              <Menu.Item key="/admin/signups">
                <Icon type="solution" />
                <span className="nav-text">Signups</span>
              </Menu.Item>
            </Menu>
          </Layout.Sider>
          <Layout>
            <Layout.Header>
              <div className="user-info">
                <span className="name">
                  <Avatar src={this.state.user.avatar} />
                  {this.state.user.name}
                </span>
                <span className="logout">
                  <Button
                    icon="logout"
                    loading={this.state.loading}
                    onClick={this.onLogoutClick}
                  />
                </span>
              </div>
            </Layout.Header>
            <Layout.Content>
              <Switch>
                <Route path="/admin" exact={true} render={renderDashboard} />
                <Route path="/admin/signups" exact={true} render={renderSignupList} />
                <Route path="/admin/signups/:id" render={renderSignupDetail} />
              </Switch>
            </Layout.Content>
          </Layout>
        </Layout>
      </div>
    )
  }
}

export default withRouter(Main as any)
