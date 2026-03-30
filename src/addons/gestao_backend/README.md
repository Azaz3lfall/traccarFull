# Gestão Backend Unificado (porta 3666)

Backend unificado do Sistema de Gestão de Frota (SGF). Usa **um único banco** `fleet_core` e consolida todas as rotas que antes estavam no SGF em `/var/www/sistema-gestao-frota`.

## Arquitetura

- **Banco:** `fleet_core` (PostgreSQL) — clients, vehicles, vehicle_devices, drivers, driver_users, driver_vehicles, refuelings, custos, trips, maintenances
- **Pool:** Usa o pool do `traccar_wrapper/db/index.js` (DATABASE_URL)
- **Autenticação:** Sessão Traccar (cookie) para rotas `/gestao` e `/api`; JWT para rotas `/app/motorista`

## Rotas principais

### Auth (sem middleware)
- POST `/auth/login`, `/auth/logout`, `/auth/driver-login`, `/auth/driver-logout`
- POST `/gestao/auth/sync` — sincroniza sessão via cookie

### Gestão (requireAuthAndFilter)
- **Drivers:** CRUD, sync, association-type, vehicles, password
- **Vehicles:** GET, PUT, sync
- **Refuelings/Abastecimentos:** CRUD
- **Custos:** CRUD
- **Maintenances:** CRUD
- **Trips:** iniciar, listar, finalizar, cancelar
- **Relatórios:** custos-extras, custos-por-viagem, custos-por-categoria, consumo-medio, distancia-abastecimentos, custo-abastecimento-total

### App Motorista (requireJwtAuth)
- `/app/motorista/trips`, `/app/motorista/custos`, `/app/motorista/custos-avulsos`
- `/app/motorista/refuelings`, `/app/motorista/profile`, `/app/motorista/upload`

### Sync (opcional)
- `/gestao/sync-schedule`, `/gestao/scheduled-sync-logs`, `/gestao/association-history`
- Requer tabelas: `sync_schedule`, `scheduled_sync_logs`, `association_history` (criar se necessário)

## Como rodar

```bash
node src/addons/gestao_backend/server.js
```

## Proxy Nginx (produção)

Em produção, o nginx deve encaminhar `/gestao` e `/app/motorista` para o gestao_backend (porta 3666). Use o snippet em `nginx-gestao-proxy.conf` na raiz do projeto:

```nginx
include /caminho/para/traccar-custom/nginx-gestao-proxy.conf;
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| DATABASE_URL | URL PostgreSQL (fleet_core) |
| TRACCAR_API_URL | URL da API Traccar |
| JWT_SECRET | Chave para tokens do app motorista |
| SESSION_SECRET | Chave para sessão Express |
| GESTAO_PORT | Porta (default 3666) |
| FRONTEND_URL | CORS origin (default *) |

## Estrutura

```
gestao_backend/
├── server.js           # Entrada principal
├── middleware/
│   ├── authAndFilter.js  # Sessão Traccar + filtro por veículos
│   └── jwtAuth.js        # Validação JWT (app motorista)
└── routes/
    ├── auth.js
    ├── drivers.js
    ├── vehicles.js
    ├── refuelings.js
    ├── custos.js
    ├── maintenances.js
    ├── trips.js
    ├── reports.js
    ├── motorista.js
    ├── sync.js
    └── misc.js
```

## Uploads

Arquivos enviados via Multer são salvos em `traccar-custom/uploads/`. A rota estática `/uploads` serve os arquivos.
