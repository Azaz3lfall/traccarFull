import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'groups',
  initialState: {
    items: {},
  },
  reducers: {
    refresh(state, action) {
      state.items = {};
      action.payload.forEach((item) => state.items[item.id] = item);
    },
    add(state, action) {
      const group = action.payload;
      state.items[group.id] = group;
    },
    update(state, action) {
      const group = action.payload;
      state.items[group.id] = group;
    },
    remove(state, action) {
      const groupId = action.payload;
      delete state.items[groupId];
    },
  },
});

export { actions as groupsActions };
export { reducer as groupsReducer };
