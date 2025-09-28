import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'events',
  initialState: {
    items: [],
  },
  reducers: {
    add(state, action) {
      const newEvents = action.payload;
      const existingIds = new Set(state.items.map(item => item.id));
      const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
      
      if (uniqueNewEvents.length > 0) {
        state.items.unshift(...uniqueNewEvents);
        state.items.splice(50);
      }
    },
    delete(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload.id);
    },
    deleteAll(state) {
      state.items = [];
    },
  },
});

export { actions as eventsActions };
export { reducer as eventsReducer };
