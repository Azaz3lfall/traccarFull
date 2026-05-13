import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'session',
  initialState: {
    server: null,
    user: null,
    socket: null,
    includeLogs: false,
    logs: [],
    positions: {},
    history: {},
    replayPositions: [],
    currentReplayIndex: 0,
    historyPositions: [],
    historyDeviceId: null,
    selectedHistoryPointIndex: null,
    resellerBranding: null,
    resellerBrandingLoaded: false,
    doorStates: {},
  },
  reducers: {
    updateServer(state, action) {
      state.server = action.payload;
    },
    updateUser(state, action) {
      state.user = action.payload;
    },
    updateSocket(state, action) {
      state.socket = action.payload;
    },
    enableLogs(state, action) {
      state.includeLogs = action.payload;
      if (!action.payload) {
        state.logs = [];
      }
    },
    updateLogs(state, action) {
      state.logs.push(...action.payload);
    },
    updatePositions(state, action) {
      const liveRoutes = state.user.attributes.mapLiveRoutes || state.server.attributes.mapLiveRoutes || 'none';
      const liveRoutesLimit = state.user.attributes['web.liveRouteLength'] || state.server.attributes['web.liveRouteLength'] || 10;
      action.payload.forEach((position) => {
        state.positions[position.deviceId] = position;
        if (liveRoutes !== 'none') {
          const route = state.history[position.deviceId] || [];
          const last = route.at(-1);
          if (!last || (last[0] !== position.longitude && last[1] !== position.latitude)) {
            state.history[position.deviceId] = [...route.slice(1 - liveRoutesLimit), [position.longitude, position.latitude]];
          }
        } else {
          state.history = {};
        }
      });
    },
    updateReplayPositions(state, action) {
      state.replayPositions = action.payload;
    },
    updateCurrentReplayIndex(state, action) {
      state.currentReplayIndex = action.payload;
    },
    updateHistoryPositions(state, action) {
      state.historyPositions = action.payload;
    },
    updateHistoryDeviceId(state, action) {
      state.historyDeviceId = action.payload;
    },
    updateSelectedHistoryPointIndex(state, action) {
      state.selectedHistoryPointIndex = action.payload;
    },
    updateResellerBranding(state, action) {
      state.resellerBranding = action.payload;
      state.resellerBrandingLoaded = true;
    },
    updateDoorState(state, action) {
      const { deviceId, isOpen } = action.payload;
      state.doorStates[deviceId] = isOpen;
    },
  },
});

export { actions as sessionActions };
export { reducer as sessionReducer };
