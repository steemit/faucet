import { useDispatch } from 'react-redux';
import { logCheckpoint } from '../features/tracking.js';
import Signup from '../components/Signup.js';

const IndexWrapper = () => {
  const dispatch = useDispatch();

  const signupProps = {
    logCheckpoint: (checkpoint) => dispatch(logCheckpoint(checkpoint)),
  };

  return <Signup {...signupProps} />;
};

export default IndexWrapper;
