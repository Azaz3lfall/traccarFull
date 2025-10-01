import { createSlice } from '@reduxjs/toolkit';

const resellersSlice = createSlice({
  name: 'resellers',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    setResellers: (state, action) => {
      state.items = action.payload;
    },
    addReseller: (state, action) => {
      state.items.push(action.payload);
    },
    updateReseller: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeReseller: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setResellers,
  addReseller,
  updateReseller,
  removeReseller,
  setLoading,
  setError,
  clearError,
} = resellersSlice.actions;

export const resellersReducer = resellersSlice.reducer;
export const resellersActions = resellersSlice.actions;
