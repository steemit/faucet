// Actions
const SET_STEP = 'faucet/step/set';

// Init State
// TODO: init Immutable Record here.
const initialState = {
    step: 0,
    step: this.initStep().step,
    stepNumber: this.initStep().stepNumber,
};

// Reducer.
export default (state = initialState, action = {}) => {
    switch (action.type) {
        case SET_STEP:
            return {
                ...state,
                step: action.payload.step,
            };
        default:
            return state;
    }
};

export const setLocale = locale => {
    return {
        type: SET_STEP,
        payload: { step },
    };
};
