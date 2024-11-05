import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  checkpoint: '',
  loggedCheckpoints: [],
};

const trackingSlice = createSlice({
  name: 'tracking',
  initialState,
  reducers: {
    logCheckpoint: (state, action) => {
      state.checkpoint = action.payload;
    },
    setLoggedCheckpoint: (state, action) => {
      state.loggedCheckpoints.push(action.payload);
    },
  },
});

export const { logCheckpoint, setLoggedCheckpoint } = trackingSlice.actions;

export const getCheckpoint = (state) => state.tracking.checkpoint;
export const getLoggedCheckpoints = (state) => state.tracking.loggedCheckpoints;

export default trackingSlice.reducer;
