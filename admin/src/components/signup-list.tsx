import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Icon,
  Input,
  Modal,
  Row,
  Table,
} from "antd"
import { History, Location } from "history"
import * as moment from "moment"
import * as React from "react"
import { Link } from "react-router-dom"

import { API } from "./../helpers/api"
import { SignupModel } from "./../helpers/signup-model"
import "./signup-list.css"

interface SignupListQuery {
  offset: number
  search: string
  from?: Date
  to?: Date
}

interface SignupListFilter {
  name: string
  value: string
}

enum TableAction {
  Approve,
  Reject,
}

const ITEMS_PER_PAGE = 50

const SEARCH_FILTER_PATTERN = /(\w+):(\w+)/g

function parseSearchFilter(filter: string) {
  const filters: SignupListFilter[] = []
  const text = filter
    .replace(SEARCH_FILTER_PATTERN, (_, name: string, value: string) => {
      filters.push({ name, value })
      return ""
    })
    .trim()
  if (text.length > 0) {
    filters.push({ name: "text", value: text })
  }
  return filters
}

function parseSignupListQuery(query: string): SignupListQuery {
  const params = new URLSearchParams(query)
  let offset = Number.parseInt(params.get("offset") || "0", 10)
  if (!Number.isSafeInteger(offset)) {
    offset = 0
  }
  const search = params.get("q") || ""
  const rv: SignupListQuery = { offset, search }
  if (params.has("from")) {
    rv.from = new Date(params.get("from")!)
  }
  if (params.has("to")) {
    rv.to = new Date(params.get("to")!)
  }
  return rv
}

function serializeSignupListQuery(query: SignupListQuery) {
  const params = new URLSearchParams()
  if (query.offset > 0) {
    params.set("offset", query.offset.toString())
  }
  if (query.search.length > 0) {
    params.set("q", query.search)
  }
  if (query.from) {
    params.set("from", query.from.toISOString())
  }
  if (query.to) {
    params.set("to", query.to.toISOString())
  }
  return params.toString()
}

interface SignupListProps {
  api: API
  history: History
  location: Location
}

interface SignupListState {
  loading: boolean
  searchValue?: string
  selectedRowKeys: any[]
  signups: SignupModel[]
  tableAction?: TableAction
  totalSignups: number
}

export const columns = [
  {
    dataIndex: "id",
    render: (id: string, record: any) => {
      return <Link to={`/signups/${id}`}>{id}</Link>
    },
    title: "ID",
  },
  { dataIndex: "username", title: "Username" },
  {
    dataIndex: "email",
    render: (email: string, record: any) => {
      return (
        <Badge
          status={record.email_is_verified ? "success" : "default"}
          text={email}
        />
      )
    },
    title: "Email",
  },
  {
    dataIndex: "phone_number",
    render: (phone: string, record: any) => {
      if (!phone || !phone.length) {
        return null
      }
      return (
        <Badge
          status={record.phone_number_is_verified ? "success" : "default"}
          text={phone}
        />
      )
    },
    title: "Phone",
  },
]

class SignupList extends React.Component<SignupListProps, SignupListState> {
  private searchInput: any

  constructor(props: SignupListProps, context?: any) {
    super(props, context)
    this.state = {
      loading: false,
      selectedRowKeys: [],
      signups: [],
      totalSignups: 0,
    }
  }

  public componentWillMount() {
    const query = parseSignupListQuery(this.props.location.search)
    this.loadData(query)
  }

  public componentWillReceiveProps(newProps: SignupListProps) {
    const oldQuery = parseSignupListQuery(this.props.location.search)
    const newQuery = parseSignupListQuery(newProps.location.search)
    if (
      oldQuery.offset !== newQuery.offset ||
      oldQuery.search !== newQuery.search ||
      oldQuery.from !== newQuery.from ||
      oldQuery.to !== newQuery.to
    ) {
      this.loadData(newQuery)
    }
  }

  public loadData(query: SignupListQuery) {
    this.setState({ loading: true })
    const payload = {
      filters: parseSearchFilter(query.search),
      limit: ITEMS_PER_PAGE,
      offset: query.offset,
    }
    if (query.from) {
      payload.filters.push({ name: "from", value: query.from.toISOString() })
    }
    if (query.to) {
      payload.filters.push({ name: "to", value: query.to.toISOString() })
    }
    this.props.api
      .call("/list_signups", payload)
      .then((result) => {
        this.setState({
          loading: false,
          selectedRowKeys: [],
          signups: result.users,
          totalSignups: result.total,
        })
      })
      .catch((error) => {
        Modal.error({
          content: error.message || String(error),
          title: "Unable to list users",
        })
        this.setState({ signups: [], totalSignups: 0, loading: false })
      })
  }

  public reloadData() {
    const query = parseSignupListQuery(this.props.location.search)
    this.loadData(query)
  }

  public pushQuery(query: SignupListQuery) {
    this.props.history.push("/signups?" + serializeSignupListQuery(query))
  }

  public onSelectChange = (selectedRowKeys: any[]) => {
    this.setState({ selectedRowKeys })
  }

  public onPageChange = (page: number, pageSize: number) => {
    const offset = (page - 1) * pageSize
    const query = parseSignupListQuery(this.props.location.search)
    if (query.offset !== offset) {
      query.offset = offset
      this.pushQuery(query)
    }
  }

  public onSearchChange = (event: any) => {
    this.setState({ searchValue: event.target.value })
  }

  public onSearchEnter = (event: any) => {
    this.setState({ searchValue: event.target.value })
    const query = parseSignupListQuery(this.props.location.search)
    if (query.search !== event.target.value) {
      query.search = event.target.value
      query.offset = 0
      this.pushQuery(query)
    }
  }

  public onSearchClear = () => {
    this.searchInput.focus()
    this.setState({ searchValue: undefined })
    const query = parseSignupListQuery(this.props.location.search)
    if (query.search !== "") {
      query.search = ""
      query.offset = 0
      this.pushQuery(query)
    }
  }

  public onDateChange = ([from, to]: [any, any]) => {
    const query = parseSignupListQuery(this.props.location.search)
    query.from = from ? from.toDate() : undefined
    query.to = to ? to.toDate() : undefined
    this.pushQuery(query)
  }

  public onApprove = () => {
    this.setState({ tableAction: TableAction.Approve })
    const ids = this.state.selectedRowKeys
    this.props.api
      .call("/approve_signups", { ids })
      .then((result: any[]) => {
        const errors = result
          .map((res, idx) => ({ ...res, id: ids[idx] }))
          .filter((res) => res.error != undefined)
          .map((res) => `Signup ${res.id}: ${res.error}`)
        if (errors.length > 0) {
          throw new Error(errors.join("\n"))
        }
        this.reloadData()
        this.setState({ tableAction: undefined })
      })
      .catch((error) => {
        Modal.error({
          content: error.message || String(error),
          title: "Unable to approve",
        })
        this.setState({ tableAction: undefined })
      })
  }

  public onReject = () => {
    this.setState({ tableAction: TableAction.Reject })
    const ids = this.state.selectedRowKeys
    this.props.api
      .call("/reject_signups", { ids })
      .then((result: any[]) => {
        const errors = result
          .map((res, idx) => ({ ...res, id: ids[idx] }))
          .filter((res) => res.error != undefined)
          .map((res) => `Signup ${res.id}: ${res.error}`)
        if (errors.length > 0) {
          throw new Error(errors.join("\n"))
        }
        this.reloadData()
        this.setState({ tableAction: undefined })
      })
      .catch((error) => {
        Modal.error({
          content: error.message || String(error),
          title: "Unable to approve",
        })
        this.setState({ tableAction: undefined })
      })
  }

  public render() {
    const {
      loading,
      selectedRowKeys,
      signups,
      tableAction,
      totalSignups,
    } = this.state
    const query = parseSignupListQuery(this.props.location.search)
    const rowSelection = {
      getCheckboxProps: (signup: SignupModel) => ({
        disabled: signup.status !== "manual_review",
        name: `signup-${signup.id}`,
      }),
      onChange: this.onSelectChange,
      selectedRowKeys,
    }
    const pagination = {
      current: query.offset / ITEMS_PER_PAGE + 1,
      onChange: this.onPageChange,
      pageSize: ITEMS_PER_PAGE,
      total: totalSignups,
    }
    const actionsEnabled = selectedRowKeys.length > 0 && !tableAction
    const tableActions = (
      <div className="table-actions">
        <Button
          onClick={this.onApprove}
          disabled={!actionsEnabled}
          loading={tableAction === TableAction.Approve}
        >
          Approve
        </Button>
        <Button
          onClick={this.onReject}
          disabled={!actionsEnabled}
          loading={tableAction === TableAction.Reject}
        >
          Reject
        </Button>
        <span style={{ marginLeft: 8 }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} signups`
            : ""}
        </span>
      </div>
    )
    // TODO: break out search to own component so it is less laggy
    const searchValue = this.state.searchValue || query.search
    const suffix =
      searchValue.length > 0 ? (
        <Icon type="close-circle" onClick={this.onSearchClear} />
      ) : (
        undefined
      )
    return (
      <div className="signup-list">
        <Card
          title={
            <Row gutter={8}>
              <Col span={15}>
                <Input
                  prefix={
                    <Icon type="search" style={{ color: "rgba(0,0,0,.25)" }} />}
                  suffix={suffix}
                  placeholder="Filter"
                  onPressEnter={this.onSearchEnter}
                  onChange={this.onSearchChange}
                  value={searchValue}
                  ref={(node: any) => (this.searchInput = node)}
                />
              </Col>
              <Col span={9}>
                <DatePicker.RangePicker
                  defaultValue={
                    query.from && query.to
                      ? [moment(query.from), moment(query.to)]
                      : undefined
                  }
                  onChange={this.onDateChange}
                />
              </Col>
            </Row>}
        >
          {tableActions}
          <Table
            bordered={true}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            columns={columns}
            dataSource={signups}
            pagination={pagination}
          />
        </Card>
      </div>
    )
  }
}

export default SignupList
