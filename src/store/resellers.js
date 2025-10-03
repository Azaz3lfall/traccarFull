import { createSlice } from '@reduxjs/toolkit';

const resellersSlice = createSlice({
  name: 'resellers',
  initialState: {
    items: [],
    loading: false,
    error: null,
    currentReseller: null,
    isReseller: false,
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
    setCurrentReseller: (state, action) => {
      state.currentReseller = action.payload;
      state.isReseller = !!action.payload;
    },
    clearCurrentReseller: (state) => {
      state.currentReseller = null;
      state.isReseller = false;
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
  setCurrentReseller,
  clearCurrentReseller,
} = resellersSlice.actions;

export const resellersReducer = resellersSlice.reducer;
export const resellersActions = resellersSlice.actions;
