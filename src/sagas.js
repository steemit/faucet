import { call, put, takeEvery, all, select } from 'redux-saga/effects';
import * as userActions from './features/user';
import * as appActions from './features/app';
import * as trackingActions from './features/tracking';
import apiCall from './utils/api';
import logStep from '../helpers/stepLogger';

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

function* watchIncrementStepSaga() {
  yield takeEvery(userActions.incrementStep.type, incrementStepSaga);
}

function* watchDecrementStepSaga() {
  yield takeEvery(userActions.decrementStep.type, decrementStepSaga);
}

function* watchLogCheckpointSaga() {
  yield takeEvery(trackingActions.logCheckpoint.type, logCheckpointSaga);
}

function* rootSaga() {
  yield all([
    watchGuessCountryCodeSaga(),
    watchIncrementStepSaga(),
    watchDecrementStepSaga(),
    watchLogCheckpointSaga(),
  ]);
}

export default rootSaga;
