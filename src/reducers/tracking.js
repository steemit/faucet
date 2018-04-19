import { Map, List } from 'immutable';

const LOG_CHECKPOINT = 'tracking/LOG_CHECKPOINT';
const SET_LOGGED_CHECKPOINT = 'tracking/SET_LOGGED_CHECKPOINT';

const defaultState = Map({
    checkpoint: '',
    loggedCheckpoints: List([])
});

export default function reducer(state = defaultState, action = {}) {
    switch (action.type) {
        case LOG_CHECKPOINT:
            return state.set('checkpoint', action.payload.checkpoint);
        case SET_LOGGED_CHECKPOINT:
            return state.setIn(
                ['loggedCheckpoints', state.get('loggedCheckpoints').size],
                action.payload.loggedCheckpoint
            );
        default:
            return state;
    }
}

export const logCheckpoint = checkpoint => ({
    type: LOG_CHECKPOINT,
    payload: { checkpoint }
});

export const setLoggedCheckpoint = loggedCheckpoint => ({
    type: SET_LOGGED_CHECKPOINT,
    payload: { loggedCheckpoint }
});

// Selectors
export const getCheckpoint = state => state.tracking.get('checkpoint');
export const getLoggedCheckpoints = state =>
    state.tracking.get('loggedCheckpoints');
