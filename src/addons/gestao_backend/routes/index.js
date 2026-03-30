/**
 * Registra todas as rotas do gestao_backend unificado (exceto auth, que é registrada antes do middleware).
 */
import registerDriverRoutes from './drivers.js';
import registerVehicleRoutes from './vehicles.js';
import registerRefuelingRoutes from './refuelings.js';
import registerCustosRoutes from './custos.js';
import registerMaintenanceRoutes from './maintenances.js';
import registerTripRoutes from './trips.js';
import registerReportRoutes from './reports.js';
import registerMotoristaRoutes from './motorista.js';
import registerSyncRoutes from './sync.js';
import registerMiscRoutes from './misc.js';

export { default as registerAuthRoutes } from './auth.js';

export default function registerAllRoutes(app, ctx) {
    registerDriverRoutes(app, ctx);
    registerVehicleRoutes(app, ctx);
    registerRefuelingRoutes(app, ctx);
    registerCustosRoutes(app, ctx);
    registerMaintenanceRoutes(app, ctx);
    registerTripRoutes(app, ctx);
    registerReportRoutes(app, ctx);
    registerMotoristaRoutes(app, ctx);
    registerSyncRoutes(app, ctx);
    registerMiscRoutes(app, ctx);
}
