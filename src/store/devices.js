import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Thunk para buscar todos os dispositivos do Traccar
 */
export const fetchAllDevices = createAsyncThunk(
  'devices/fetchAllDevices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/devices?all=true');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar dispositivos do Traccar');
    }
  },
);

const { reducer, actions } = createSlice({
  name: 'devices',
  initialState: {
    items: {},
    selectedId: null,
    allDevices: [], // Lista completa de dispositivos para dropdowns
    loading: false,
    error: null,
  },
  reducers: {
    refresh(state, action) {
      state.items = {};
      action.payload.forEach((item) => state.items[item.id] = item);
    },
    update(state, action) {
      action.payload.forEach((item) => state.items[item.id] = item);
    },
    selectId(state, action) {
      state.selectTime = Date.now();
      state.selectedId = action.payload;
    },
    remove(state, action) {
      delete state.items[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllDevices
      .addCase(fetchAllDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.allDevices = action.payload || [];
        state.error = null;
      })
      .addCase(fetchAllDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Erro desconhecido ao buscar dispositivos';
      });
  },
});

export { actions as devicesActions };
export { reducer as devicesReducer };
