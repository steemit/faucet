import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Modal,
  Row,
  Table,
  Select,
} from "antd"
import { History, Location } from "history"
import * as moment from "moment"
import * as React from "react"
import { Link } from "react-router-dom"

import { API } from "./../helpers/api"
import { SignupModel } from "./../helpers/signup-model"
import "./signup-search.css"

interface SearchListFilter {
  name: string
  value: any
}

enum TableAction {
  Approve,
  Reject,
}

const ITEMS_PER_PAGE = 150

interface SearchListProps {
  api: API
  history: History
  location: Location
}

interface SearchListState {
  loading: boolean
  selectedRowKeys: any[]
  signups: SignupModel[]
  tableAction?: TableAction
  totalSignups: number
  offset: number
  page: number
  pageNumber: number
  itemsPerPage: number
  searchTerms?: string[]
  regexEmailFilters?: string[]
  exclusiveEmailFilters?: string[]
  inclusiveEmailFilters?: string[]
  dateFrom?: Date
  dateTo?: Date
  inclusivePhoneNumberFilters: string[]
  exclusivePhoneNumberFilters: string[]
}

export const columns = [
  {
    dataIndex: "id",
    render: (id: string, record: any) => {
      return <Link to={`/admin/signups/${id}`}>{id}</Link>
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

class SearchList extends React.Component<SearchListProps, SearchListState> {

  constructor(props: SearchListProps , context?: any) {
    super(props, context)
    this.state = {
      loading: false,
      selectedRowKeys: [],
      signups: [],
      totalSignups: 0,
      regexEmailFilters: [],
      inclusiveEmailFilters: [],
      exclusiveEmailFilters: [],
      inclusivePhoneNumberFilters:[],
      exclusivePhoneNumberFilters:[],
      offset: 0,
      page: 0,
      pageNumber: 0,
      itemsPerPage: ITEMS_PER_PAGE,
    }
  }

  public componentWillMount() {
    this.loadData()
  }

  public loadData() {
    this.setState({ loading: true })
    const filters: SearchListFilter[] = []
    const payload = {
      filters,
      limit: ITEMS_PER_PAGE,
      offset: this.state.offset,
    }
    if (this.state.searchTerms && this.state.searchTerms.length > 0) {
      filters.push({name: "searchTerms", value: this.state.searchTerms});
    }
    if (this.state.regexEmailFilters && this.state.regexEmailFilters.length > 0) {
      filters.push({name: "regexEmailFilters", value: this.state.regexEmailFilters});
    }
    if (this.state.inclusiveEmailFilters && this.state.inclusiveEmailFilters.length > 0) {
      filters.push({name: "inclusiveEmailFilters", value: this.state.inclusiveEmailFilters});
    }
    if (this.state.exclusiveEmailFilters && this.state.exclusiveEmailFilters.length > 0) {
      filters.push({name: "exclusiveEmailFilters", value: this.state.exclusiveEmailFilters});
    }
    if (this.state.inclusivePhoneNumberFilters && this.state.inclusivePhoneNumberFilters.length > 0) {
      filters.push({name: "inclusivePhoneNumberFilters", value: this.state.inclusivePhoneNumberFilters});
    }
    if (this.state.exclusivePhoneNumberFilters && this.state.exclusivePhoneNumberFilters.length > 0) {
      filters.push({name: "exclusivePhoneNumberFilters", value: this.state.exclusivePhoneNumberFilters});
    }
    if (this.state.dateFrom) {
      filters.push({ name: "from", value: this.state.dateFrom.toISOString() })
    }
    if (this.state.dateTo) {
      filters.push({ name: "to", value: this.state.dateTo.toISOString() })
    }

    payload.filters = filters;

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

  public onSelectChange = (selectedRowKeys: any[]) => {
    this.setState({ selectedRowKeys })
  }

  public onPageChange = (page: number, pageSize: number) => {
    // const offset = (page - 1) * pageSize
    /*
    const query = parseSearchListQuery(this.props.location.search)
    if (query.offset !== offset) {
      query.offset = offset
      this.pushQuery(query)
    }
    */
  }

  handleSearch = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    this.loadData()
  }

  public onSearchChange = (value: string[]) => {
    this.setState({ searchTerms: value})
  }

  public onRegexEmailFiltersChange = (value: string[]) => {
    this.setState({ regexEmailFilters: value})
  }

  public onInclusiveEmailFiltersChange = (value: string[]) => {
    this.setState({ inclusiveEmailFilters: value})
  }

  public onExclusiveEmailFiltersChange = (value: string[]) => {
    this.setState({ exclusiveEmailFilters: value})
  }

  public onInclusivePhoneNumberFiltersChange = (value: string[]) => {
    this.setState({ inclusivePhoneNumberFilters: value})
  }

  public onExclusivePhoneNumberFiltersChange = (value: string[]) => {
    this.setState({ exclusivePhoneNumberFilters: value})
  }

  public onDateChange = ([from, to]: [any, any]) => {
    this.setState({ dateFrom: from, dateTo: to})
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
        this.loadData()
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
        this.loadData()
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
      dateFrom,
      dateTo,
//      offset,
//      exclusiveEmailFilters,
//      itemsPerPage,
//      page,
//      pageNumber,
    } = this.state
    //const query = parseSearchListQuery(this.props.location.search)
    const rowSelection = {
      getCheckboxProps: (signup: SignupModel) => ({
        disabled: signup.status !== "manual_review",
        name: `signup-${signup.id}`,
      }),
      onChange: this.onSelectChange,
      selectedRowKeys,
    }
    const pagination = {
      //current: query.offset / ITEMS_PER_PAGE + 1,
      current: 1,
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
    return (
      <div className="signup-list signup-search">
        <Card
          title={
          <span>
            <Row gutter={8}>
              <Col span={12}>
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                    onChange={this.onSearchChange}
                    tokenSeparators={[',']}
                    placeholder={'find email, username, phone number or fingerprint containing'}
                  >
                  </Select>
                </Col>
                <Col span={12}>
                  <DatePicker.RangePicker
                    defaultValue={
                      dateFrom && dateTo
                        ? [moment(dateFrom), moment(dateTo)]
                        : undefined
                    }
                    onChange={this.onDateChange}
                  />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    onChange={this.onInclusiveEmailFiltersChange}
                    tokenSeparators={[',']}
                    placeholder={'include email addresses containing'}
                  >
                  </Select>
                </Col>
                <Col span={8}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    onChange={this.onExclusiveEmailFiltersChange}
                    tokenSeparators={[',']}
                    placeholder={'exclude email addresses containing'}
                  >
                  </Select>
                </Col>
                <Col span={8}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    onChange={this.onRegexEmailFiltersChange}
                    tokenSeparators={[',']}
                    placeholder={'regex email search'}
                  >
                  </Select>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    onChange={this.onInclusivePhoneNumberFiltersChange}
                    tokenSeparators={[',']}
                    placeholder={'include phone numbers containing'}
                  >
                  </Select>
                </Col>
                <Col span={12}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    onChange={this.onExclusivePhoneNumberFiltersChange}
                    tokenSeparators={[',']}
                    placeholder={'exclude phone numbers containing'}
                  >
                  </Select>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Button type="primary" onClick={this.handleSearch}>Search</Button>
                </Col>
              </Row>
            </span>
          }
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

export default SearchList