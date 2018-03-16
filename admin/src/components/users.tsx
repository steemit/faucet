import * as React from 'react'
import { RouteComponentProps } from 'react-router-dom'

interface UsersRouteProps {
    filter: string
}

interface UsersProps extends RouteComponentProps<UsersRouteProps> {}

class Users extends React.Component <UsersProps> {
  public render() {
    const {filter} = this.props.match.params
    return (
      <h1>Users: {filter}</h1>
    )
  }
}

export default Users
