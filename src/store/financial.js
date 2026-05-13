import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const coreUrl = import.meta.env.VITE_CORE_API_URL || '';
const endpoint = (path) => (coreUrl ? `${coreUrl}${path}` : path);

function extractApiMessage(body, status) {
  if (!body) return `HTTP ${status}`;
  if (typeof body === 'string') return body;
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    return body.errors.map((item) => item?.description || item?.message || item?.code || 'Erro').join(' | ');
  }
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  if (body?.message && typeof body.message === 'object') {
    return JSON.stringify(body.message);
  }
  return `HTTP ${status}`;
}

async function parseJson(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractApiMessage(body, response.status));
  }
  return response.json();
}

export const fetchFinancialOverview = createAsyncThunk('financial/fetchOverview', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/overview')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchFinancialPlans = createAsyncThunk('financial/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/plans')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const saveFinancialPlan = createAsyncThunk('financial/savePlan', async (payload, { rejectWithValue }) => {
  try {
    const method = payload?.id ? 'PUT' : 'POST';
    const url = payload?.id ? endpoint(`/api/financial/plans/${payload.id}`) : endpoint('/api/financial/plans');
    const data = await parseJson(await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const deleteFinancialPlan = createAsyncThunk('financial/deletePlan', async (id, { rejectWithValue }) => {
  try {
    await parseJson(await fetch(endpoint(`/api/financial/plans/${id}`), { method: 'DELETE' }));
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchAsaasSettings = createAsyncThunk('financial/fetchAsaasSettings', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/settings/asaas')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const saveAsaasSettings = createAsyncThunk('financial/saveAsaasSettings', async (payload, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/settings/asaas'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const testAsaasConnection = createAsyncThunk('financial/testAsaasConnection', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/settings/asaas/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchClientFinancialProfiles = createAsyncThunk('financial/fetchProfiles', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/clients/profiles')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const saveClientFinancialProfile = createAsyncThunk('financial/saveProfile', async ({ clientId, ...body }, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint(`/api/financial/clients/${clientId}/profile`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const syncClientSubscription = createAsyncThunk('financial/syncSubscription', async (clientId, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint(`/api/financial/clients/${clientId}/sync-subscription`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const importAsaasData = createAsyncThunk('financial/importAsaasData', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/import/asaas'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchMyFinancialStatus = createAsyncThunk('financial/fetchMyStatus', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/me/status')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchMyInvoices = createAsyncThunk('financial/fetchMyInvoices', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/me/invoices')));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchInvoicePix = createAsyncThunk('financial/fetchInvoicePix', async (paymentId, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint(`/api/financial/me/invoices/${paymentId}/pix`)));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchInvoiceBoleto = createAsyncThunk('financial/fetchInvoiceBoleto', async (paymentId, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint(`/api/financial/me/invoices/${paymentId}/boleto`)));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const setClientAccessOverride = createAsyncThunk(
  'financial/setClientAccessOverride',
  async ({ clientId, allowAccess, reason }, { rejectWithValue }) => {
    try {
      return await parseJson(await fetch(endpoint(`/api/financial/clients/${clientId}/access-override`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowAccess: Boolean(allowAccess), reason: reason || '' }),
      }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const settleBillingCycleManually = createAsyncThunk(
  'financial/settleBillingCycleManually',
  async ({ cycleId, paidAmount, paidAt, note }, { rejectWithValue }) => {
    try {
      return await parseJson(await fetch(endpoint(`/api/financial/cycles/${cycleId}/manual-settlement`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paidAmount, paidAt, note }),
      }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchClientBillingHistory = createAsyncThunk(
  'financial/fetchClientBillingHistory',
  async ({ clientId, limit = 50, offset = 0 }, { rejectWithValue }) => {
    try {
      return await parseJson(await fetch(endpoint(`/api/financial/clients/${clientId}/billing-history?limit=${limit}&offset=${offset}`), { credentials: 'include' }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const bulkSyncAllClients = createAsyncThunk('financial/bulkSyncAllClients', async (_, { rejectWithValue }) => {
  try {
    return await parseJson(await fetch(endpoint('/api/financial/clients/bulk-sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const syncClientSubscriptionWithOptions = createAsyncThunk(
  'financial/syncClientSubscriptionWithOptions',
  async ({ clientId, billingType }, { rejectWithValue }) => {
    try {
      return await parseJson(await fetch(endpoint(`/api/financial/clients/${clientId}/sync-subscription`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ billingType }),
      }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchClientFinancialSummary = createAsyncThunk(
  'financial/fetchClientFinancialSummary',
  async (clientId, { rejectWithValue }) => {
    try {
      const response = await fetch(endpoint(`/api/financial/clients/${clientId}/summary`), {
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 403) {
        return rejectWithValue('Sem permissão. O resumo financeiro do cliente exige usuário administrador.');
      }
      if (response.status === 404) {
        const apiMsg = typeof body?.message === 'string' ? body.message : '';
        if (apiMsg.includes('Client not found') || body?.error === 'Not found') {
          return rejectWithValue(
            'Cliente não encontrado na base do Core. Confira se o ID está correto e se o cadastro existe no mesmo banco usado pela API /api/clients.',
          );
        }
        return rejectWithValue(
          'Rota /summary não encontrada (404). Atualize e reinicie o serviço Core (porta 4000) com o código que contém GET /api/financial/clients/:clientId/summary — não é causado apenas por falta de plano financeiro.',
        );
      }
      if (response.status === 503) {
        return rejectWithValue(extractApiMessage(body, response.status) || 'Core sem conexão com o banco de dados.');
      }
      if (!response.ok) {
        return rejectWithValue(extractApiMessage(body, response.status));
      }
      return body;
    } catch (error) {
      return rejectWithValue(error.message || 'Erro ao carregar resumo financeiro');
    }
  },
);

const financialSlice = createSlice({
  name: 'financial',
  initialState: {
    overview: null,
    plans: [],
    profiles: [],
    asaasSettings: null,
    myStatus: null,
    myInvoices: [],
    selectedPix: null,
    selectedBoleto: null,
    clientHistory: null,
    status: 'idle',
    actionStatus: 'idle',
    error: null,
  },
  reducers: {
    clearFinancialError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialOverview.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFinancialOverview.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.overview = action.payload;
      })
      .addCase(fetchFinancialOverview.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro ao carregar visão financeira';
      })
      .addCase(fetchFinancialPlans.fulfilled, (state, action) => {
        state.plans = action.payload || [];
      })
      .addCase(fetchClientFinancialProfiles.fulfilled, (state, action) => {
        state.profiles = action.payload || [];
      })
      .addCase(fetchAsaasSettings.fulfilled, (state, action) => {
        state.asaasSettings = action.payload || null;
      })
      .addCase(saveAsaasSettings.fulfilled, (state, action) => {
        state.asaasSettings = { ...(state.asaasSettings || {}), ...(action.payload || {}) };
      })
      .addCase(saveAsaasSettings.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao salvar configuração Asaas';
      })
      .addCase(testAsaasConnection.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao testar conexão com Asaas';
      })
      .addCase(saveFinancialPlan.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(saveFinancialPlan.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao salvar plano';
      })
      .addCase(deleteFinancialPlan.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(deleteFinancialPlan.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao remover plano';
      })
      .addCase(saveClientFinancialProfile.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(saveClientFinancialProfile.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao vincular plano ao cliente';
      })
      .addCase(syncClientSubscription.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(syncClientSubscription.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao sincronizar assinatura';
      })
      .addCase(importAsaasData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(importAsaasData.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(importAsaasData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Erro ao importar dados do Asaas';
      })
      .addCase(fetchMyFinancialStatus.fulfilled, (state, action) => {
        state.myStatus = action.payload || null;
      })
      .addCase(fetchMyFinancialStatus.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao consultar status financeiro do cliente';
      })
      .addCase(fetchMyInvoices.fulfilled, (state, action) => {
        state.myInvoices = action.payload?.invoices || [];
      })
      .addCase(fetchMyInvoices.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao consultar faturas do cliente';
      })
      .addCase(fetchInvoicePix.fulfilled, (state, action) => {
        state.selectedPix = action.payload || null;
      })
      .addCase(fetchInvoicePix.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao consultar Pix da fatura';
      })
      .addCase(fetchInvoiceBoleto.fulfilled, (state, action) => {
        state.selectedBoleto = action.payload || null;
      })
      .addCase(fetchInvoiceBoleto.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao consultar boleto da fatura';
      })
      .addCase(setClientAccessOverride.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao atualizar liberação manual de acesso';
      })
      .addCase(settleBillingCycleManually.rejected, (state, action) => {
        state.error = action.payload || 'Erro ao dar baixa manual na cobrança';
      })
      .addCase(fetchClientBillingHistory.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(fetchClientBillingHistory.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        state.clientHistory = action.payload || null;
      })
      .addCase(fetchClientBillingHistory.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload || 'Erro ao carregar histórico do cliente';
      })
      .addCase(bulkSyncAllClients.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(bulkSyncAllClients.fulfilled, (state) => {
        state.actionStatus = 'idle';
      })
      .addCase(bulkSyncAllClients.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload || 'Erro ao sincronizar clientes em lote';
      })
      .addCase(syncClientSubscriptionWithOptions.pending, (state) => {
        state.actionStatus = 'loading';
      })
      .addCase(syncClientSubscriptionWithOptions.fulfilled, (state) => {
        state.actionStatus = 'idle';
      })
      .addCase(syncClientSubscriptionWithOptions.rejected, (state, action) => {
        state.actionStatus = 'idle';
        state.error = action.payload || 'Erro ao sincronizar assinatura';
      });
  },
});

export const { clearFinancialError } = financialSlice.actions;
export const financialReducer = financialSlice.reducer;

