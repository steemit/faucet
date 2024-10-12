import { useSelector, useDispatch } from 'react-redux';
import {
  setLocale,
  showSignupModal,
  hideSignupModal,
} from '../features/app.js';
import {
  guessCountryCode,
  incrementStep,
  decrementStep,
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
// import Signup from '../components/Signup.js';

const SignupWrapper = (props) => {
  const dispatch = useDispatch();
  const app = useSelector((state) => state.app);
  const user = useSelector((state) => state.user);
  // const { location } = props;
  console.log(props, app, user);

  const signupProps = {
    // queryParams: location.query,
    app,
    user,
    setLocale: (locale) => dispatch(setLocale(locale)),
    guessCountryCode: () => dispatch(guessCountryCode()),
    incrementStep: () => dispatch(incrementStep()),
    decrementStep: () => dispatch(decrementStep()),
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

  return <div>hi</div>;
  // return <Signup {...signupProps} />;
};

export default SignupWrapper;
