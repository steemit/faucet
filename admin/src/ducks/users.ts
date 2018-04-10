import { combineReducers } from 'redux'
import { takeLatest } from 'redux-saga'

import { Users } from '../types/'

// Action types
export enum TypeKeys {
    FETCH_USERS_REQUEST = 'user/FETCH_USER_REQUEST',
    FETCH_USER_ERROR = 'user/FETCH_USER_ERROR',
    FETCH_USERS_SUCCESS = 'user/FETCH_USERS_SUCCESS',
    ADD_USER_SUCCESS = 'user/ADD_USER_SUCCESS',
    OTHER_ACTION = '__any_other_action_type__',
}

type ActionTypes =
    | FetchUsersSuccessAction
    | OtherAction

// Child reducers
interface byIdState {
    users: Users,
    isFetching: boolean,
    requestHadError: boolean,
    requestId?: string,
}
const byIdDefaultState = {
    users: [],
    isFetching: false,
    requestHadError: false,
}
function byId(state: byIdState = byIdDefaultState, action: ActionTypes = { type: TypeKeys.OTHER_ACTION }) {
    switch (action.type) {
        case TypeKeys.FETCH_USERS_SUCCESS:
            return {
                ...state,
                ...action.users,
            }
        default:
            return state
    }
}

// Reducer
export default combineReducers({
    byId,
})

// Action creators
export interface FetchUsersSuccessAction {
    type: TypeKeys.FETCH_USERS_SUCCESS
    users: Users
}
export const fetchUsersSuccess = (users: Users) => ({
    type: TypeKeys.FETCH_USERS_SUCCESS,
    users,
})

export interface OtherAction {
    type: TypeKeys.OTHER_ACTION
}
