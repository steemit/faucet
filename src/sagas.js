import { call, put, takeEvery, all, select } from 'redux-saga/effects';
import * as userActions from './features/user.js';
import * as trackingActions from './features/tracking.js';
import apiCall from './utils/api.js';
import { logStep } from '../helpers/stepLogger.js';

function* guessCountryCodeSaga() {
  try {
    const res = yield call(apiCall, '/api/guess_country', {}, 'GET');
    const countryCode =
      (res.location && res.location.country && res.location.country.iso_code) ||
      null;
    yield put(userActions.setCountryCode(countryCode));
  } catch (e) {
    // TODO: Handle Error state in the redux store.
  }
}

function* logCheckpointSaga() {
  const currentCheckpoint = yield select(trackingActions.getCheckpoint);
  const loggedCheckpoints = yield select(trackingActions.getLoggedCheckpoints);
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
  yield takeEvery(userActions.guessCountryCode.type, guessCountryCodeSaga);
}

function* watchLogCheckpointSaga() {
  yield takeEvery(trackingActions.logCheckpoint.type, logCheckpointSaga);
}

function* rootSaga() {
  yield all([watchGuessCountryCodeSaga(), watchLogCheckpointSaga()]);
}

export default rootSaga;
