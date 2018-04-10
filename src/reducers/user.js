// Actions
const LOAD = 'user/LOAD';
const CREATE = 'user/CREATE';
const UPDATE = 'user/UPDATE';
const REMOVE = 'user/REMOVE';

const defaultState = {};

// Reducer
export default function reducer(state = defaultState, action = {}) {
    switch (action.type) {
        // do reducer stuff
        default:
            return state;
    }
}

// Action Creators
export function loadUser() {
    return { type: LOAD };
}

export function createUser(user) {
    return { type: CREATE, user };
}

export function updateUser(user) {
    return { type: UPDATE, user };
}

export function removeUser(user) {
    return { type: REMOVE, user };
}
