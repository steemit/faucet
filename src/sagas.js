import {
    call,
    put,
    takeEvery,
    takeLatest,
    all,
    select,
} from 'redux-saga/effects';
import * as userActions from './reducers/user';
import * as appActions from './reducers/app';
import apiCall from './utils/api';

function* guessCountryCodeSaga() {
    try {
        const countryCode = yield call(
            apiCall,
            '/api/guess_country',
            {},
            'GET'
        );
        yield put(
            userActions.setCountryCode(
                countryCode === null ? false : countryCode
            )
        );
    } catch (e) {
        yield put(userActions.setCountryCode(false));
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
        // TODO: Handle Errors
    }
}

function* decrementStepSaga() {
    const steps = yield select(appActions.getSteps);
    const currentStep = yield select(userActions.getStep);
    const nextStep = steps.get(steps.indexOf(currentStep) - 1);
    try {
        // TODO: Update the user in the DB.
        yield put(userActions.setStep(nextStep));
    } catch (e) {
        // TODO: Handle Errors
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

function* rootSaga() {
    yield all([
        watchGuessCountryCodeSaga(),
        watchIncrementStepSaga(),
        watchDecrementStepSaga(),
    ]);
}

export default rootSaga;
