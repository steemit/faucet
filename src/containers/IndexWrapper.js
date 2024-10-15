import { useSelector, useDispatch } from 'react-redux';
import {
  showSignupModal,
  hideSignupModal,
  setLocale,
} from '../features/app.js';
import {
  guessCountryCode,
  setStep,
  setUsername,
  setEmail,
  setPhone,
  setPhoneFormatted,
  setToken,
  setPrefix,
  setCompleted,
  setTrackingId,
} from '../features/user.js';
import { logCheckpoint } from '../features/tracking.js';
import Signup from '../components/Signup.js';

const SignupWrapper = () => {
  const dispatch = useDispatch();
  const app = useSelector((state) => state.app);
  const user = useSelector((state) => state.user);
  console.log(app, user);

  const signupProps = {
    // queryParams: location.query,
    app,
    user,
    setLocale: (locale) => dispatch(setLocale(locale)),
    guessCountryCode: () => dispatch(guessCountryCode()),
    showSignupModal: () => dispatch(showSignupModal()),
    hideSignupModal: () => dispatch(hideSignupModal()),
    setStep: (stepName) => dispatch(setStep(stepName)),
    setUsername: (username) => dispatch(setUsername(username)),
    setEmail: (email) => dispatch(setEmail(email)),
    setPhone: (phone) => dispatch(setPhone(phone)),
    setPhoneFormatted: (phoneFormatted) =>
      dispatch(setPhoneFormatted(phoneFormatted)),
    setToken: (token) => dispatch(setToken(token)),
    setPrefix: (prefix) => dispatch(setPrefix(prefix)),
    setCompleted: (completed) => dispatch(setCompleted(completed)),
    setTrackingId: (trackingId) => dispatch(setTrackingId(trackingId)),
    logCheckpoint: (checkpoint) => dispatch(logCheckpoint(checkpoint)),
  };

  return <Signup {...signupProps} />;
};

export default SignupWrapper;
