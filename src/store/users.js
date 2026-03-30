import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Thunk para buscar usuários do Traccar
 */
export const fetchTraccarUsers = createAsyncThunk(
  'users/fetchTraccarUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/users?all=true');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar usuários do Traccar');
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTraccarUsers
      .addCase(fetchTraccarUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTraccarUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
        state.error = null;
      })
      .addCase(fetchTraccarUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro desconhecido ao buscar usuários';
      });
  },
});

export const { clearError } = usersSlice.actions;
export const usersReducer = usersSlice.reducer;
export const usersActions = usersSlice.actions;
