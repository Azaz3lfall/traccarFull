# Documentação do Módulo Gestão Backend

Este documento descreve todas as funções, estruturas, rotas e configurações do backend de Gestão de Frota (`gestao_backend`).

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Rotas e Endpoints](#rotas-e-endpoints)
4. [Middleware](#middleware)
5. [Autenticação](#autenticação)
6. [Integrações](#integrações)

---

## Visão Geral

O **Gestão Backend** é o servidor unificado que centraliza:

- **Gestão de Frota:** veículos, motoristas, viagens, abastecimentos, manutenções, custos
- **Relatórios:** custos extras, custos por viagem, consumo médio, etc.
- **App Motorista:** API JWT para motoristas (viagens, custos, abastecimentos)
- **Integrações:** Telecom, OS Backend, Traccar

### Porta e Inicialização

- **Porta:** `GESTAO_PORT` (default: 3666)
- **Script:** `start-gestao-server.sh`

---

## Estrutura de Diretórios

```
src/addons/gestao_backend/
├── middleware/
│   ├── authAndFilter.js   # Auth via Traccar + filtro por veículos
│   └── jwtAuth.js         # Auth JWT para app motorista
├── routes/
│   ├── index.js           # Registro de todas as rotas
│   ├── auth.js            # Login/logout (admin e motorista)
│   ├── drivers.js         # Motoristas
│   ├── vehicles.js        # Veículos
│   ├── trips.js           # Viagens
│   ├── refuelings.js      # Abastecimentos
│   ├── maintenances.js    # Manutenções
│   ├── custos.js          # Custos extras
│   ├── reports.js         # Relatórios
│   ├── motorista.js       # API do app motorista (JWT)
│   ├── sync.js            # Histórico e agendamento de sync
│   └── misc.js            # Upload, imagens, devices, rota
├── utils/
│   └── errorResponse.js   # send500()
├── server.js              # Express app principal
└── DOCUMENTACAO_GESTAO_BACKEND.md
```

---

## Rotas e Endpoints

### Prefixos

- **Auth (público):** `/auth/*`
- **Gestão (session):** `/gestao/*`
- **API (session):** `/api/*`
- **App Motorista (JWT):** `/app/motorista/*`

---

### Auth (`auth.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login admin (Traccar session) |
| POST | `/auth/logout` | Logout admin |
| POST | `/auth/driver-login` | Login motorista (retorna JWT) |
| POST | `/auth/driver-logout` | Logout motorista |
| POST | `/gestao/auth/sync` | Sincroniza sessão com Traccar |

---

### Motoristas (`drivers.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/drivers` | Listar motoristas |
| GET | `/gestao/drivers/:id` | Detalhes do motorista |
| GET | `/gestao/drivers/association-stats` | Estatísticas de associação |
| GET | `/gestao/drivers/:id/vehicles` | Veículos do motorista |
| POST | `/gestao/drivers` | Criar motorista |
| PUT | `/gestao/drivers/:id` | Atualizar motorista |
| PUT | `/gestao/drivers/:id/vehicles` | Associar veículos |
| PUT | `/gestao/drivers/:id/association-type` | Tipo de associação (auto/manual) |
| PUT | `/gestao/drivers/:id/password` | Alterar senha |
| PUT | `/gestao/drivers/:id/complete` | Completar cadastro pendente |
| POST | `/gestao/drivers/:id/create-user` | Criar conta de usuário |
| POST | `/gestao/drivers/:id/sync` | Sincronizar associações (auto) |
| POST | `/gestao/drivers/sync` | Sincronizar motoristas do Traccar |
| POST | `/gestao/drivers/sync-associations` | Sincronizar todas as associações |
| DELETE | `/gestao/drivers/:id` | Excluir motorista |
| DELETE | `/api/drivers/:id` | Excluir motorista (alias) |
| GET | `/gestao/auth/user` | Usuário atual |

---

### Veículos (`vehicles.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/vehicles` | Listar veículos (com motorista associado) |
| GET | `/gestao/vehicles/sync` | Stub (veículos no fleet_core) |
| PUT | `/gestao/vehicles/:id` | Atualizar tank_capacity, initial_odometer |

---

### Viagens (`trips.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/trips` | Listar viagens |
| POST | `/gestao/trips/iniciar` | Iniciar viagem |
| PUT | `/gestao/trips/:id/finalizar` | Finalizar viagem |
| PUT | `/gestao/trips/:id/cancelar` | Cancelar viagem |

---

### Abastecimentos (`refuelings.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/gestao/refuelings` | Registrar abastecimento |
| GET | `/gestao/abastecimentos/todos` | Listar todos |
| GET | `/gestao/refuelings/vehicle/:vehicleId` | Por veículo |
| PUT | `/gestao/abastecimentos/:id` | Editar |
| DELETE | `/gestao/abastecimentos/:id` | Excluir |

---

### Manutenções (`maintenances.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/maintenances` | Listar (filtro: vehicle_id) |
| POST | `/gestao/maintenances` | Registrar |
| PUT | `/gestao/maintenances/:id` | Atualizar |
| DELETE | `/gestao/maintenances/:id` | Excluir |

---

### Custos (`custos.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/custos` | Listar custos |
| POST | `/gestao/custos` | Registrar custo |
| PUT | `/gestao/custos/:id` | Editar |
| DELETE | `/gestao/custos/:id` | Excluir |

---

### Relatórios (`reports.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/relatorios/custos-extras` | Custos avulsos (periodo, deviceId) |
| GET | `/gestao/relatorios/custos-por-viagem` | Custos por viagem finalizada |
| GET | `/gestao/relatorios/custos-por-categoria` | Agrupado por tipo_custo |
| GET | `/gestao/relatorios/consumo-medio` | Consumo médio (km/l) |
| GET | `/gestao/relatorios/distancia-abastecimentos` | Distância entre abastecimentos |
| GET | `/gestao/relatorios/custo-abastecimento-total` | Total gasto em combustível |

**Query params comuns:** `periodo` (mensal, semanal, anual, mes_anterior, personalizado), `deviceId`, `startDate`, `endDate`

---

### Sync (`sync.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/gestao/drivers/:id/history` | Histórico de associações |
| GET | `/gestao/association-history` | Histórico geral |
| GET | `/gestao/sync-schedule` | Configuração de sync |
| PUT | `/gestao/sync-schedule` | Atualizar schedule |
| POST | `/gestao/sync-schedule/run-now` | Stub (não implementado) |
| GET | `/gestao/scheduled-sync-logs` | Logs de sync agendado |

---

### Misc (`misc.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/devices` | IDs de dispositivos do usuário |
| GET | `/api/reports/route` | Rota do Traccar (deviceId, from, to) |
| POST | `/gestao/upload` | Upload de arquivo |
| GET | `/gestao/abastecimentos/image/:filename` | Servir imagem |
| GET | `/gestao/uploads/:filename` | Servir arquivo |

---

### App Motorista (`motorista.js`) – JWT

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/app/motorista/trips` | Viagens do motorista |
| GET | `/app/motorista/profile` | Perfil e veículos associados |
| POST | `/app/motorista/custos` | Registrar custo de viagem |
| POST | `/app/motorista/custos-avulsos` | Registrar custo avulso |
| POST | `/app/motorista/refuelings` | Registrar abastecimento |
| PUT | `/app/motorista/trips/:id/finalizar` | Finalizar viagem |
| POST | `/app/motorista/upload` | Upload de arquivo |

---

## Middleware

### `requireAuthAndFilter`

1. Valida sessão Traccar (cookie ou reauth com email/senha da sessão)
2. Define `req.currentUser`, `req.userIsAdmin`
3. Busca devices do usuário no Traccar
4. Resolve `vehicle_ids` via `vehicle_devices` (device_id → vehicle_id)
5. Define `req.userVehicleIds` ('ALL' para admin, array de UUIDs para usuário)
6. Define `req.userDeviceIds`
7. Carrega mapeamento customizado de `config/user-vehicles.json` (se existir)

### `requireJwtAuth`

- Header: `Authorization: Bearer <token>`
- Verifica JWT com `JWT_SECRET`
- Define `req.driverId` (ID do motorista)

---

## Autenticação

### Admin (Session)

- Login: `POST /auth/login` com `email`, `password`
- Sessão armazena `traccarCookie`, `userEmail`, `userPassword`
- Rotas protegidas: `/gestao/*`, `/api/*`

### Motorista (JWT)

- Login: `POST /auth/driver-login` com `username`, `password`
- Resposta: `{ token }` (expira em 24h)
- Rotas protegidas: `/app/motorista/*` com header `Authorization: Bearer <token>`

---

## Integrações

- **Traccar:** session, devices, drivers, reports
- **Fleet Core (traccar_wrapper/db):** clients, vehicles, vehicle_devices, drivers, trips, refuelings, maintenances, custos
- **Telecom:** registrado via `registerTelecomRoutes`
- **OS Backend:** registrado via `registerOSRoutes`

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL fleet_core |
| `TRACCAR_API_URL` | URL da API Traccar |
| `SESSION_SECRET` | Secret da sessão Express |
| `JWT_SECRET` | Secret para JWT do motorista |
| `GESTAO_PORT` | Porta do servidor |
| `FRONTEND_URL` | CORS origin |
