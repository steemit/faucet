import { combineReducers } from 'redux'

import { Users } from '../types/'

// Action types
export enum TypeKeys {
    FETCH_USERS_SUCCESS = 'user/FETCH_USERS_SUCCESS',
    ADD_USER_SUCCESS = 'user/ADD_USER_SUCCESS',
    OTHER_ACTION = '__any_other_action_type__',
}

type ActionTypes =
    | FetchUsersSuccessAction
    | OtherAction

// Child reducers
function byId(state: Users = [], action: ActionTypes) {
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
