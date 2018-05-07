import { Card, Col, Modal, Row, Spin } from "antd"
import { DatePicker } from "antd"
import * as moment from "moment"
import * as React from "react"
import { Link } from "react-router-dom"

import { API } from "./../helpers/api"
import "./dashboard.css"

const { RangePicker } = DatePicker

interface DashboardProps {
  api: API,
}

interface DashboardState {
  data?: any,
  dateFrom: Date,
  dateTo: Date,
}

interface CheckpointApiData {
  human: string,
  symbol: string,
  count: number,
  percent: number,
}

class Dashboard extends React.Component<DashboardProps, DashboardState> {
  constructor(props: DashboardProps, context?: any) {
    super(props, context)
    const dateTo = new Date()
    const dateFrom = new Date(dateTo.valueOf() - 1000 * 60 * 30) // 30 minutes past, by default
    this.state = {
      data: null,
      dateFrom,
      dateTo,
    }
  }

  public componentWillMount() {
    this.loadData(this.state.dateFrom, this.state.dateTo)
  }

  public render() {
    const isLoading = this.state.data == null

    if (isLoading) {
      return <Spin spinning={true} />
    }

    const data = this.state.data

    const onDateOk = this.onDateOk.bind(this)

    return (
      <div className="dashboard">
        <div className="dashboard-approvals">
          <h2>Approvals</h2>
          <Row type="flex" gutter={16}>
            <Col xs={12} lg={6}>
              <Card
                title={
                  <Link to="/admin/signups?q=status:manual_review">
                    Awaiting review
                  </Link>
                }
                bordered={false}
              >
                {data.approvals.pending}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={
                  <Link to="/admin/signups?q=status:approved">Approved</Link>
                }
                bordered={false}
              >
                {data.approvals.approved}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={
                  <Link to="/admin/signups?q=status:rejected">Rejected</Link>
                }
                bordered={false}
              >
                {data.approvals.rejected}
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card
                title={
                  <Link to="/admin/signups?q=status:created">Created</Link>
                }
                bordered={false}
              >
                {data.approvals.created}
              </Card>
            </Col>
          </Row>
        </div>
        <div className="dashboard-analytics">
          <h2>Analytics</h2>
          <Row type="flex" gutter={16}>
            <RangePicker
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              placeholder={["Start Time", "End Time"]}
              onOk={onDateOk}
              defaultValue={[ moment(this.state.dateFrom), moment(this.state.dateTo) ]}
            />
          </Row>
          <Row type="flex" gutter={16}>
            <Col xs={24} lg={24}>
              <Card
                bordered={true}
              >
                <ol>
                  {this.state.data.analytics.map((checkpoint: CheckpointApiData) => <li key={checkpoint.symbol}>
                    {checkpoint.human}: {checkpoint.count} ({checkpoint.percent}%)
                  </li>)}
                </ol>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  private loadData(dateFrom: Date, dateTo: Date) {
    this.props.api
      .call("/dashboard", { dateTo, dateFrom })
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

  private changeDates(dateFrom: Date, dateTo: Date) {
    this.setState({
      dateFrom,
      dateTo,
    })
    this.loadData(dateFrom, dateTo)
  }

  private onDateOk(dates: any) {
    this.changeDates(dates[0].toDate(), dates[1].toDate())
  }
}

export default Dashboard
