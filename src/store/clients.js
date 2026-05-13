import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Get Core API URL from environment variable or use relative path (proxy)
 */
const getCoreApiUrl = () => {
  // Try environment variable first
  if (import.meta.env.VITE_CORE_API_URL) {
    return import.meta.env.VITE_CORE_API_URL;
  }
  // Use relative path to avoid Mixed Content (HTTPS page requesting HTTP).
  // The reverse proxy must forward /api/clients to the Core.
  return '';
};

const CORE_API_URL = getCoreApiUrl();

/**
 * Thunk para buscar todos os clientes
 */
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/clients` : '/api/clients';
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar clientes');
    }
  },
);

/**
 * Thunk para criar um novo cliente
 */
export const addClient = createAsyncThunk(
  'clients/addClient',
  async (clientData, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/clients` : '/api/clients';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 409) {
          return rejectWithValue(errorData.message || 'Conflito: valor duplicado');
        }
        if (status === 400) {
          return rejectWithValue(errorData.message || 'Erro de validação');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao criar cliente');
    }
  },
);

/**
 * Thunk para atualizar um cliente existente
 */
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/clients/${id}` : `/api/clients/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 404) {
          return rejectWithValue(errorData.message || 'Cliente não encontrado');
        }
        if (status === 409) {
          return rejectWithValue(errorData.message || 'Conflito: valor duplicado');
        }
        if (status === 400) {
          return rejectWithValue(errorData.message || 'Erro de validação');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao atualizar cliente');
    }
  },
);

/**
 * Thunk para deletar um cliente
 */
export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/clients/${id}` : `/api/clients/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 404) {
          return rejectWithValue(errorData.message || 'Cliente não encontrado');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      // Retornar o ID para remover da lista
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao deletar cliente');
    }
  },
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    lastFetchedAt: 0,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload || 'Erro desconhecido';
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchClients
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
        state.lastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro desconhecido ao buscar clientes';
      })
      // addClient
      .addCase(addClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Adicionar novo cliente ao início do array (mais recente primeiro)
        state.items.unshift(action.payload);
        state.error = null;
      })
      .addCase(addClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro desconhecido ao criar cliente';
      })
      // updateClient
      .addCase(updateClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Atualizar cliente na lista
        const index = state.items.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro desconhecido ao atualizar cliente';
      })
      // deleteClient
      .addCase(deleteClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Remover cliente da lista usando o ID retornado
        state.items = state.items.filter(c => c.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro desconhecido ao deletar cliente';
      });
  },
});

export const { clearError } = clientsSlice.actions;
export const clientsReducer = clientsSlice.reducer;
export const clientsActions = clientsSlice.actions;
