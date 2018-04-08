import { Card, Col, Modal, Row, Spin } from "antd"
import * as React from "react"
import { Link } from "react-router-dom"

import { API } from "./../helpers/api"
import "./dashboard.css"

interface DashboardProps {
  api: API
}

interface DashboardState {
  data?: any
}

class Dashboard extends React.Component<DashboardProps, DashboardState> {
  constructor(props: DashboardProps, context?: any) {
    super(props, context)
    this.state = {}
  }
  public componentWillMount() {
    this.props.api
      .call("/dashboard")
      .then((data) => {
        this.setState({ data })
      })
      .catch((error) => {
        Modal.error({
          content: error.message || String(error),
          title: "Unable to load dashboard",
        })
      })
  }

  public render() {
    const isLoading = this.state.data == null
    const data = this.state.data || {}
    return (
      <Spin spinning={isLoading}>
        <div className="dashboard">
          <Row type="flex" gutter={16}>
            <Col xs={12} lg={6}>
              <Card
                title={
                  <Link to="/signups?q=status:manual_review">
                    Awaiting review
                  </Link>
                }
                bordered={false}
              >
                {data.pending}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={<Link to="/signups?q=status:approved">Approved</Link>}
                bordered={false}
              >
                {data.approved}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={<Link to="/signups?q=status:rejected">Rejected</Link>}
                bordered={false}
              >
                {data.rejected}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={<Link to="/signups?q=status:created">Created</Link>}
                bordered={false}
              >
                {data.created}
              </Card>
            </Col>
          </Row>
        </div>
      </Spin>
    )
  }
}

export default Dashboard
