import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Get Core API URL from environment variable or use relative path (proxy)
 */
const getCoreApiUrl = () => {
  // Try environment variable first
  if (import.meta.env.VITE_CORE_API_URL) {
    return import.meta.env.VITE_CORE_API_URL;
  }
  
  // In development, use relative path (Vite proxy will handle it)
  // In production, use relative path to avoid Mixed Content (HTTPS page requesting HTTP).
  // The reverse proxy (nginx/traccar) must forward /api/fleet and /api/vehicles to the Core.
  return '';
};

const CORE_API_URL = getCoreApiUrl();

/**
 * Thunk para buscar o mapa de frota do Core Service
 */
export const fetchFleetMap = createAsyncThunk(
  'fleet/fetchFleetMap',
  async (_, { rejectWithValue }) => {
    try {
      // Use relative path if CORE_API_URL is empty (proxy), otherwise use full URL
      const url = CORE_API_URL ? `${CORE_API_URL}/api/fleet/map` : '/api/fleet/map';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar mapa de frota');
    }
  },
);

/**
 * Thunk para buscar lista de veículos cadastrados
 */
export const fetchVehicles = createAsyncThunk(
  'fleet/fetchVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/vehicles` : '/api/vehicles';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar veículos');
    }
  },
);

/**
 * Thunk para criar um novo veículo
 */
export const addVehicle = createAsyncThunk(
  'fleet/addVehicle',
  async (vehicleData, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/vehicles` : '/api/vehicles';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 409) {
          return rejectWithValue(errorData.message || 'Placa já existe');
        }
        if (status === 400) {
          return rejectWithValue(errorData.message || 'Erro de validação');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao criar veículo');
    }
  },
);

/**
 * Thunk para atualizar um veículo existente
 */
export const updateVehicle = createAsyncThunk(
  'fleet/updateVehicle',
  async ({ id, vehicleData }, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/vehicles/${id}` : `/api/vehicles/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 404) {
          return rejectWithValue(errorData.message || 'Veículo não encontrado');
        }
        if (status === 409) {
          return rejectWithValue(errorData.message || 'Placa já existe');
        }
        if (status === 400) {
          return rejectWithValue(errorData.message || 'Erro de validação');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao atualizar veículo');
    }
  },
);

/**
 * Thunk para buscar dispositivos disponíveis para vincular a veículos
 * (não associados a nenhum veículo, ou apenas ao veículo em edição)
 * @param {string|null} excludeVehicleId - ID do veículo em edição (para incluir seus devices na lista)
 */
export const fetchAvailableDevicesForVehicle = createAsyncThunk(
  'fleet/fetchAvailableDevicesForVehicle',
  async (excludeVehicleId, { rejectWithValue }) => {
    try {
      const baseUrl = CORE_API_URL ? `${CORE_API_URL}/api/vehicles/available-devices` : '/api/vehicles/available-devices';
      const url = excludeVehicleId ? `${baseUrl}?excludeVehicleId=${excludeVehicleId}` : baseUrl;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao buscar dispositivos disponíveis');
    }
  },
);

/**
 * Thunk para deletar um veículo
 */
export const deleteVehicle = createAsyncThunk(
  'fleet/deleteVehicle',
  async (id, { rejectWithValue }) => {
    try {
      const url = CORE_API_URL ? `${CORE_API_URL}/api/vehicles/${id}` : `/api/vehicles/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        
        // Tratar diferentes tipos de erro
        if (status === 404) {
          return rejectWithValue(errorData.message || 'Veículo não encontrado');
        }
        
        throw new Error(errorData.message || `HTTP ${status}: ${response.statusText}`);
      }
      
      // Retornar o ID para remover da lista
      return id;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao deletar veículo');
    }
  },
);

const fleetSlice = createSlice({
  name: 'fleet',
  initialState: {
    items: [], // Lista de veículos agrupados para o mapa de frota
    vehicles: [], // Lista de veículos cadastrados (CRUD)
    selectedPlate: null,
    loading: false,
    fleetMapLoading: false,
    vehiclesLoading: false,
    mutating: false,
    error: null,
    vehiclesLastFetchedAt: 0,
    availableDevicesForVehicle: [], // Dispositivos livres para vincular (não usados por outros veículos)
    availableDevicesLoading: false,
  },
  reducers: {
    setSelectedPlate: (state, action) => {
      state.selectedPlate = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFleetMap.pending, (state) => {
        state.fleetMapLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFleetMap.fulfilled, (state, action) => {
        state.fleetMapLoading = false;
        state.loading = state.vehiclesLoading || state.mutating;
        state.items = action.payload || [];
        state.error = null;
      })
      .addCase(fetchFleetMap.rejected, (state, action) => {
        state.fleetMapLoading = false;
        state.loading = state.vehiclesLoading || state.mutating;
        state.error = action.payload || 'Erro desconhecido ao buscar mapa de frota';
      })
      // fetchVehicles
      .addCase(fetchVehicles.pending, (state) => {
        state.vehiclesLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.vehiclesLoading = false;
        state.loading = state.fleetMapLoading || state.mutating;
        state.vehicles = action.payload || [];
        state.vehiclesLastFetchedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.vehiclesLoading = false;
        state.loading = state.fleetMapLoading || state.mutating;
        state.error = action.payload || 'Erro desconhecido ao buscar veículos';
      })
      // addVehicle
      .addCase(addVehicle.pending, (state) => {
        state.mutating = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = null;
        // Adicionar novo veículo ao início da lista
        state.vehicles.unshift(action.payload);
        state.vehiclesLastFetchedAt = Date.now();
      })
      .addCase(addVehicle.rejected, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = action.payload || 'Erro desconhecido ao criar veículo';
      })
      // updateVehicle
      .addCase(updateVehicle.pending, (state) => {
        state.mutating = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = null;
        // Atualizar veículo na lista
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
        state.vehiclesLastFetchedAt = Date.now();
      })
      .addCase(updateVehicle.rejected, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = action.payload || 'Erro desconhecido ao atualizar veículo';
      })
      // deleteVehicle
      .addCase(deleteVehicle.pending, (state) => {
        state.mutating = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = null;
        // Remover veículo da lista usando o ID retornado
        state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
        state.vehiclesLastFetchedAt = Date.now();
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.mutating = false;
        state.loading = state.fleetMapLoading || state.vehiclesLoading;
        state.error = action.payload || 'Erro desconhecido ao deletar veículo';
      })
      // fetchAvailableDevicesForVehicle
      .addCase(fetchAvailableDevicesForVehicle.pending, (state) => {
        state.availableDevicesLoading = true;
      })
      .addCase(fetchAvailableDevicesForVehicle.fulfilled, (state, action) => {
        state.availableDevicesLoading = false;
        state.availableDevicesForVehicle = action.payload || [];
      })
      .addCase(fetchAvailableDevicesForVehicle.rejected, (state) => {
        state.availableDevicesLoading = false;
        state.availableDevicesForVehicle = [];
      });
  },
});

export const { setSelectedPlate, clearError } = fleetSlice.actions;
export const fleetReducer = fleetSlice.reducer;
export const fleetActions = fleetSlice.actions;
