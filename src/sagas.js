import { call, put, takeEvery, all, select } from 'redux-saga/effects';
import * as userActions from './reducers/user';
import * as appActions from './reducers/app';
import * as trackingActions from './reducers/tracking';
import apiCall from './utils/api';
import logStep from '../helpers/stepLogger';

function* guessCountryCodeSaga() {
    try {
        const countryCode = yield call(
            apiCall,
            '/api/guess_country',
            {},
            'GET'
        );
        yield put(userActions.setCountryCode(countryCode));
    } catch (e) {
        // TODO: Handle Error state in the redux store.
    }
}

function* incrementStepSaga() {
    const steps = yield select(appActions.getSteps);
    const currentStep = yield select(userActions.getStep);
    const nextStep = steps.get(steps.indexOf(currentStep) + 1);
    try {
        // TODO: Update the user in the DB.
        yield put(userActions.setStep(nextStep));
    } catch (e) {
        // TODO: Handle Error state in the redux store.
    }
}

function* decrementStepSaga() {
    const steps = yield select(appActions.getSteps);
    const currentStep = yield select(userActions.getStep);
    const nextStep = steps.get(steps.indexOf(currentStep) - 1);
    try {
        // TODO: Update the user in the DB.
        // Need to decide on the DB schema updates before doing this though.
        yield put(userActions.setStep(nextStep));
    } catch (e) {
        // TODO: Handle Error state in the redux store.
    }
}

function* logCheckpointSaga() {
    const currentCheckpoint = yield select(trackingActions.getCheckpoint);
    const loggedCheckpoints = yield select(
        trackingActions.getLoggedCheckpoints
    );
    const uid = yield select(userActions.getTrackingId);
    if (!loggedCheckpoints.includes(currentCheckpoint)) {
        try {
            yield call(logStep, uid, currentCheckpoint);
            yield put(trackingActions.setLoggedCheckpoint(currentCheckpoint));
        } catch (e) {
            // TODO: Handle Error state in the redux store.
        }
    }
}

function* watchGuessCountryCodeSaga() {
    yield takeEvery('user/GUESS_COUNTRY_CODE', guessCountryCodeSaga);
}

function* watchIncrementStepSaga() {
    yield takeEvery('user/INCREMENT_STEP', incrementStepSaga);
}

function* watchDecrementStepSaga() {
    yield takeEvery('user/DECREMENT_STEP', decrementStepSaga);
}

function* watchLogCheckpointSaga() {
    yield takeEvery('tracking/LOG_CHECKPOINT', logCheckpointSaga);
}

function* rootSaga() {
    yield all([
        watchGuessCountryCodeSaga(),
        watchIncrementStepSaga(),
        watchDecrementStepSaga(),
        watchLogCheckpointSaga()
    ]);
}

export default rootSaga;
