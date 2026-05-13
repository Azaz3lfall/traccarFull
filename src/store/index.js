import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { errorsReducer as errors } from './errors';
import { sessionReducer as session } from './session';
import { devicesReducer as devices } from './devices';
import { eventsReducer as events } from './events';
import { geofencesReducer as geofences } from './geofences';
import { groupsReducer as groups } from './groups';
import { driversReducer as drivers } from './drivers';
import { maintenancesReducer as maintenances } from './maintenances';
import { calendarsReducer as calendars } from './calendars';
import { resellersReducer as resellers } from './resellers';
import { fleetReducer as fleet } from './fleet';
import { clientsReducer as clients } from './clients';
import { usersReducer as users } from './users';
import { financialReducer as financial } from './financial';
import throttleMiddleware from './throttleMiddleware';

const reducer = combineReducers({
  errors,
  session,
  devices,
  events,
  geofences,
  groups,
  drivers,
  maintenances,
  calendars,
  resellers,
  fleet,
  clients,
  users,
  financial,
});

export { errorsActions } from './errors';
export { sessionActions } from './session';
export { devicesActions, fetchAllDevices } from './devices';
export { eventsActions } from './events';
export { geofencesActions } from './geofences';
export { groupsActions } from './groups';
export { driversActions } from './drivers';
export { maintenancesActions } from './maintenances';
export { calendarsActions } from './calendars';
export { resellersActions } from './resellers';
export { fleetActions, fetchFleetMap, fetchVehicles, fetchAvailableDevicesForVehicle, addVehicle, updateVehicle, deleteVehicle } from './fleet';
export { clientsActions, fetchClients, addClient, updateClient, deleteClient } from './clients';
export { usersActions, fetchTraccarUsers } from './users';
export {
  clearFinancialError,
  fetchFinancialOverview,
  fetchFinancialPlans,
  saveFinancialPlan,
  deleteFinancialPlan,
  fetchAsaasSettings,
  saveAsaasSettings,
  testAsaasConnection,
  fetchClientFinancialProfiles,
  saveClientFinancialProfile,
  syncClientSubscription,
  importAsaasData,
  fetchMyFinancialStatus,
  fetchMyInvoices,
  fetchInvoicePix,
  fetchInvoiceBoleto,
  setClientAccessOverride,
  settleBillingCycleManually,
  fetchClientFinancialSummary,
  fetchClientBillingHistory,
  bulkSyncAllClients,
  syncClientSubscriptionWithOptions,
} from './financial';

export default configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(throttleMiddleware),
});
