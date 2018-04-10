/**
 * This Redux reducer stores data related to requests made to the Faucet API.
 * 
 * It offers a central place to store a history of this session's requests, indexed by Request ID.
 * 
 * This Request ID can be shared with a JSON-RPC request id.
 * 
 * This reducer will listen for known data requests from other reducers, make the request, and deal with any data parsing or error formatting
 * From the requests reducer, we dispatch back to 
 */
import { Set } from 'immutable'

import { RequestError, Requests, RequestIds } from '../types'

// Action types
export enum TypeKeys {
    REQUEST = 'requests/REQUEST',
    RECEIVE_ERROR = 'requests/RECEIVE_ERROR',
    RECEIVE_SUCCESS = 'requests/RECEIVE_SUCCESS',
    OTHER_ACTION = '__any_other_action_type__',
}

type ActionTypes =
    | RequestAction
    | ReceiveErrorAction
    | ReceiveSuccessAction
    | OtherAction

interface state {
    byId: Requests | null,
    inProgress: Set<string>,
}

const defaultState = {
    byId: null,
    inProgress: Set(), 
}

export default function reducer(state: state = defaultState, action: ActionTypes = { type: TypeKeys.OTHER_ACTION }) {
    switch (action.type) {
        case TypeKeys.REQUEST:
            return {
                byId: {
                    ...state.byId,
                    [action.id]: {
                        id: action.id,
                        params: action.params,
                    },
                },
                inProgress: state.inProgress.add(action.id),
            };
        default:
            return state;
    }
}

export interface OtherAction {
    type: TypeKeys.OTHER_ACTION,
}

export interface RequestAction {
    type: TypeKeys.REQUEST,
    id: string,
    params: object,
}
export const request = (id: string, params: object) => ({
    type: TypeKeys.REQUEST,
    id,
    params,
})

export interface ReceiveErrorAction {
    type: TypeKeys.RECEIVE_ERROR,
    id: string,
    error: RequestError,
}
export const receiveError = (id: string, error: RequestError) => ({
    type: TypeKeys.RECEIVE_ERROR,
    id,
    error,
})

export interface ReceiveSuccessAction {
    type: TypeKeys.RECEIVE_SUCCESS,
    id: string,
    response: object,
}
export const receiveSuccess = (id: string, response: object) => ({
    type: TypeKeys.RECEIVE_SUCCESS,
    id,
    response,
})