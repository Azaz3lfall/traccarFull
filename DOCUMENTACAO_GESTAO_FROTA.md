# Documentação do Sistema de Gestão de Frota

Este documento descreve a arquitetura e o funcionamento do módulo de **gestão de frota**, incluindo backend (Core Service) e frontend (React/Redux), integrado ao Traccar para rastreamento de veículos.

## Arquitetura: Dois processos, um banco

O sistema usa **dois processos Node.js** que compartilham o mesmo banco `fleet_core`:

| Processo | Porta | Arquivo | Responsabilidade |
|----------|-------|---------|------------------|
| **Core** | 4000 | `src/addons/traccar_wrapper/core/core.js` | Frota, clientes, veículos (`/api/fleet`, `/api/clients`, `/api/vehicles`) |
| **Gestão** | 3666 | `src/addons/gestao_backend/server.js` | Auth, motoristas, abastecimentos, custos, manutenções, viagens, relatórios, app motorista (`/gestao/*`, `/api/drivers`, `/app/motorista/*`) |

Ambos usam o pool de `src/addons/traccar_wrapper/db/index.js` e o banco `fleet_core`. O frontend faz proxy para cada um conforme o prefixo da rota (ver seção 3.1).

---

## 1. Visão geral

O sistema de gestão de frota permite:

- **Cadastro de clientes** (PF/PJ) no banco local, com vínculo opcional a usuários do Traccar.
- **Cadastro de veículos** por cliente, com placa única, dados opcionais (marca, modelo, cor, ano, apelido, detalhes da instalação) e **associação a um ou mais rastreadores** (dispositivos do Traccar).
- **Listagem e CRUD** de veículos na tela de configurações e em um popover “Gerenciar Veículos” no mapa.
- **Mapa de frota**: exibição no mapa principal apenas dos veículos do Core (com `device_id` principal), com filtro por cliente para usuários não administradores.

**Stack:**

- **Backend:** Node.js (Express), PostgreSQL (banco `fleet_core`), autenticação via sessão Traccar.
- **Frontend:** React, Redux Toolkit, Material-UI, Vite (proxy para o Core).

---

## 2. Backend (Core Service)

### 2.1 Servidor

O backend da frota roda como um serviço separado (Core Wrapper), iniciado por:

- **Arquivo:** `src/addons/traccar_wrapper/core/core.js`
- **Porta:** `process.env.CORE_PORT || 4000`
- **Variáveis de ambiente:** carregadas do `.env` na raiz do projeto (caminho relativo ao `core.js`).

**Rotas registradas:**

| Prefixo           | Router           | Descrição                          |
|------------------|------------------|------------------------------------|
| `GET /`          | -                | Health check do serviço             |
| `/api/fleet`     | fleetRoutes      | Mapa de frota (veículos com device) |
| `/api/clients`   | clientsRoutes    | CRUD de clientes                    |
| `/api/vehicles`  | vehiclesRoutes   | CRUD de veículos                   |

**Middleware global:** CORS habilitado, `express.json()` para corpo JSON.

### 2.2 Banco de dados

- **Conexão:** `src/addons/traccar_wrapper/db/index.js` (pool PostgreSQL).
- **Variável:** `DATABASE_URL` (ex.: `postgresql://user:pass@host:5432/fleet_core`).
- **Schema inicial:** `scripts/fleet_core_init.sql`.

**Tabelas principais:**

- **clients** – Clientes (PF/PJ), com `traccar_user_id` opcional para vincular ao usuário Traccar.
- **vehicles** – Veículos: `client_id`, `plate` (única), `make`, `model`, `color`, `year`, `notes`, `nickname`, `installation_details`, `created_at`. A coluna `device_id` existe por compatibilidade mas o vínculo oficial é via `vehicle_devices`.
- **vehicle_devices** – Relação N:N veículo ↔ dispositivo: `vehicle_id`, `device_id`, `is_primary`. O primeiro dispositivo é tratado como principal (ex.: para o mapa).

Scripts de migração relevantes:

- `scripts/fleet_core_init.sql` – Schema inicial (clients, vehicles).
- `scripts/fleet_core_gestao_tables.sql` – Tabelas de gestão (drivers, driver_users, driver_vehicles, refuelings, custos, maintenances, trips, sync_schedule, etc.).
- `scripts/add_device_id_to_vehicles.sql` – Adiciona `device_id` em `vehicles` (compatibilidade).
- `scripts/migrate_to_many_devices.sql` – Cria `vehicle_devices` e migra dados de `vehicles.device_id`.
- `scripts/add_nickname_installation_details_to_vehicles.sql` – Adiciona `nickname` (VARCHAR 255) e `installation_details` (TEXT).

### 2.3 Autenticação

- **Arquivo:** `src/middleware/authMiddleware.js`.
- As rotas de **veículos** e **frota** usam `router.use(authenticate)`: a sessão do Traccar é validada (ex.: `GET /api/session`) e o usuário é anexado em `req.user`.
- **Filtro de segurança:**
  - **Super admin:** usuário com `email === 'evangelista1908@gmail.com'` ou `administrator === true` ou `admin === true` enxerga todos os clientes/veículos.
  - **Demais usuários:** apenas dados do cliente cujo `traccar_user_id` corresponde a `req.user.id`.

### 2.4 API de Veículos (`/api/vehicles`)

| Método   | Rota      | Descrição |
|----------|-----------|-----------|
| GET      | `/`       | Lista veículos (com `client_name`, `device_id` principal, `deviceIds`). Filtro por cliente se não for super admin. |
| GET      | `/:id`    | Detalhe de um veículo (com `devices` e `client_name`). |
| POST     | `/`       | Cria veículo. Corpo: `client_id`, `plate` (obrigatórios), `make`, `model`, `color`, `year`, `notes`, `nickname`, `installation_details`, `deviceIds` (array). |
| PUT      | `/:id`    | Atualiza veículo (mesmos campos). Substitui vínculos em `vehicle_devices`. |
| DELETE   | `/:id`    | Remove veículo (CASCADE remove `vehicle_devices`). |

**Comportamento importante:**

- `deviceIds`: array de IDs de dispositivos do Traccar; o primeiro é tratado como principal (`is_primary = true`).
- Após criar/atualizar veículo com `deviceIds`, o backend chama `syncTraccarPermissions(client_id, deviceIds)` em background: cria permissões no Traccar (`userId` do cliente ↔ `deviceId`) quando o cliente tem `traccar_user_id`.
- Respostas de erro: 400 (validação), 404 (não encontrado), 409 (placa duplicada), 503 (banco indisponível).

### 2.5 API de Frota (`/api/fleet`)

| Método | Rota   | Descrição |
|--------|--------|-----------|
| GET    | `/map` | Lista veículos para o **mapa**: apenas veículos com pelo menos um dispositivo; retorna `device_id` (principal), `devices` (array com `id`, `is_primary`). Mesmo filtro de segurança por cliente. |

### 2.6 API de Clientes (`/api/clients`)

| Método   | Rota      | Descrição |
|----------|-----------|-----------|
| GET      | `/`       | Lista todos os clientes (sem filtro por usuário no código atual). |
| GET      | `/:id`    | Um cliente por ID. |
| POST     | `/`       | Cria cliente. Campos: `type` (PF/PJ), `name` (obrigatórios), `tax_id`, `address`, `contact_phone`, `email`, `traccar_user_id`, `active`. |
| PUT      | `/:id`    | Atualiza cliente. |
| DELETE   | `/:id`    | Remove cliente. |

(Os detalhes de validação e códigos de erro estão em `src/routes/clientsRoutes.js`.)

### 2.7 API de Operação (Gestão de Frota)

Estas rotas rodam no **gestao_backend** (porta 3666) e complementam o Core. Todas utilizam `vehicle_id` do tipo UUID referenciando a tabela `vehicles`.

| Domínio | Método | Rota | Descrição |
|---------|--------|------|-----------|
| **Abastecimento** | POST | `/gestao/refuelings` | Registra abastecimento vinculado a vehicle_id (UUID). |
| | GET | `/gestao/abastecimentos/todos` | Lista histórico de abastecimentos. |
| | PUT | `/gestao/abastecimentos/:id` | Atualiza abastecimento. |
| | DELETE | `/gestao/abastecimentos/:id` | Remove abastecimento. |
| **Motoristas** | GET | `/gestao/drivers` | Lista motoristas (SGF). |
| | GET | `/gestao/drivers/:id` | Detalhe de um motorista. |
| | POST | `/gestao/drivers` | Cria motorista e usuário de acesso. |
| | PUT | `/gestao/drivers/:id` | Atualiza motorista. |
| | POST | `/gestao/drivers/sync` | Sincroniza motoristas com Traccar. |
| | PUT | `/gestao/drivers/:id/vehicles` | Associa veículos ao motorista. |
| **Custos** | GET | `/gestao/custos` | Lista custos extras. |
| | POST | `/gestao/custos` | Registra custo. |
| | PUT | `/gestao/custos/:id` | Atualiza custo. |
| | DELETE | `/gestao/custos/:id` | Remove custo. |
| **Manutenções** | GET | `/gestao/maintenances` | Lista manutenções. |
| | POST | `/gestao/maintenances` | Registra manutenção. |
| | PUT | `/gestao/maintenances/:id` | Atualiza manutenção. |
| | DELETE | `/gestao/maintenances/:id` | Remove manutenção. |
| **Viagens** | POST | `/gestao/trips/iniciar` | Inicia jornada. |
| | GET | `/gestao/trips` | Lista viagens. |
| | PUT | `/gestao/trips/:id/finalizar` | Finaliza viagem. |
| | PUT | `/gestao/trips/:id/cancelar` | Cancela viagem. |
| **Relatórios** | GET | `/gestao/relatorios/*` | distancia-abastecimentos, custo-abastecimento-total, custos-extras, custos-por-viagem, custos-por-categoria, consumo-medio. |

Autenticação: sessão Traccar (cookie). O middleware `requireAuthAndFilter` valida a sessão e popula `req.userVehicleIds` (UUIDs dos veículos permitidos) com base em `vehicle_devices` e permissões do Traccar.

### 2.8 Tabelas de Gestão (fleet_core)

Além de `clients`, `vehicles` e `vehicle_devices`, o banco `fleet_core` inclui:

| Tabela | Descrição |
|--------|-----------|
| **drivers** | Motoristas: `id`, `name`, `cpf`, `cnh_number`, `cnh_category`, `cnh_validity`, `phone`, `unique_id`, `traccar_user_id`, `association_type`, `status`, etc. |
| **driver_users** | Contas de acesso dos motoristas (login/senha): `driver_id`, `username`, `password_hash`, `is_active`. |
| **driver_vehicles** | Associação motorista ↔ veículo: `driver_id`, `vehicle_id` (UUID). |
| **refuelings** | Abastecimentos: `vehicle_id` (UUID), `driver_id`, `refuel_date`, `odometer`, `liters_filled`, `total_cost`, `is_full_tank`, `foto_bomba`, `foto_odometro`, `posto_nome`, `cidade`, `viagem_id`. |
| **custos** | Custos extras: `vehicle_id` (UUID), `driver_id`, `viagem_id`, `tipo_custo`, `descricao`, `valor`, `data_custo`, `foto_path`. |
| **maintenances** | Manutenções: `vehicle_id` (UUID), `maintenance_date`, `description`, `cost`, `odometer`, `provider_name`, `foto_path`. |
| **trips** | Viagens: `vehicle_id` (UUID), `driver_id`, `start_city`, `end_city`, `is_round_trip`, `start_date`, `end_date`, `status`, `distancia_total`. |

**Importante:** Todas as tabelas de gestão usam `vehicle_id` (UUID) referenciando `vehicles.id`.

### 2.9 App do Motorista

O **aplicativo do motorista** (mobile ou web) usa autenticação **JWT independente** da sessão do Traccar.

- **Login:** POST `/auth/driver-login` com `username` e `password` → retorna um token JWT.
- **Rotas protegidas:** Todas sob `/app/motorista/*` exigem o header `Authorization: Bearer <token>`.
- **Middleware:** `requireJwtAuth` valida o token e anexa `req.driverId` (ID do motorista).

Rotas do app motorista:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/app/motorista/trips` | Lista viagens do motorista (query: `status`). |
| POST | `/app/motorista/custos` | Registra custo vinculado a viagem. |
| POST | `/app/motorista/custos-avulsos` | Registra custo avulso (sem viagem). |
| POST | `/app/motorista/refuelings` | Registra abastecimento. |
| PUT | `/app/motorista/trips/:id/finalizar` | Finaliza viagem. |
| GET | `/app/motorista/profile` | Perfil do motorista com veículos associados. |
| POST | `/app/motorista/upload` | Upload de foto (comprovante, etc.). |

---

## 3. Frontend

### 3.1 Proxy e URLs

No **Vite** (`vite.config.js`), em desenvolvimento as requisições são proxyadas conforme o prefixo:

| Prefixo | Destino | Processo |
|---------|---------|----------|
| `/api/fleet` | `http://localhost:4000` | Core |
| `/api/clients` | `http://localhost:4000` | Core |
| `/api/vehicles` | `http://localhost:4000` | Core |
| `/gestao` | `http://localhost:3666` | Gestão |

Em produção, o frontend usa as URLs configuradas (ex.: `VITE_API_BASE_URL` para o Traccar, proxy reverso para Core e Gestão).

### 3.2 Store Redux (frota e veículos)

**Arquivo:** `src/store/fleet.js`

- **Estado:** `items` (lista para o mapa, preenchida por `fetchFleetMap`), `vehicles` (lista para CRUD, preenchida por `fetchVehicles`), `selectedPlate`, `loading`, `error`.
- **Thunks:**
  - `fetchFleetMap()` – GET `/api/fleet/map`
  - `fetchVehicles()` – GET `/api/vehicles`
  - `addVehicle(vehicleData)` – POST `/api/vehicles`
  - `updateVehicle({ id, vehicleData })` – PUT `/api/vehicles/:id`
  - `deleteVehicle(id)` – DELETE `/api/vehicles/:id`
- **Actions síncronas:** `setSelectedPlate`, `clearError`.

Os thunks usam a mesma base de URL do Core (vinda de `getCoreApiUrl()` em `fleet.js`). Erros HTTP são tratados (409 placa duplicada, 404, 400, etc.) e armazenados em `state.fleet.error`.

**Clientes:** `src/store/clients.js` – `fetchClients`, `addClient`, `updateClient`, `deleteClient`, etc., para alimentar o combo de cliente no formulário de veículos.

**Dispositivos:** a lista de rastreadores vem do Traccar (ex.: `state.devices.allDevices`), usada no formulário de veículos para montar `deviceIds` e evitar vincular o mesmo dispositivo a mais de um veículo.

### 3.3 Páginas e componentes

- **VehiclesPage** (`src/settings/VehiclesPage.jsx`)
  - Página de **Cadastro de Veículos** dentro do fluxo de configurações.
  - Lista veículos em tabela (Placa, Apelido, Cliente, Marca, Modelo, Ano, Rastreadores, Ações).
  - Busca por placa, apelido, marca, modelo, cliente ou nome/IMEI do rastreador.
  - Dialog de novo/edição: Placa, Cliente (obrigatórios), Marca, Modelo, Cor, Ano, **Apelido**, **Detalhes da instalação**, Rastreador(es) (multiselect). Salvar chama `addVehicle` ou `updateVehicle` com `nickname` e `installation_details` no payload.
  - Usa `state.fleet.vehicles`, `state.clients.items`, `state.devices.allDevices` e dispatch de `fetchVehicles`, `addVehicle`, `updateVehicle`, `deleteVehicle`, `fleetActions.clearError`.

- **VehiclesContent** (exportado pelo mesmo arquivo)
  - Mesma lógica de lista + dialog de veículos, sem o layout de página (sem `PageLayout`/menu lateral).
  - Usado dentro do popover “Gerenciar Veículos” no mapa.

- **FloatingVehiclesPopover** (`src/components/FloatingVehiclesPopover.jsx`)
  - Popover que exibe **VehiclesContent** e título “Gerenciar Veículos”.
  - Abre a partir do mapa (ex.: botão “Veículos” na MainPage).

- **MainPage** (`src/main/MainPage.jsx`)
  - Usa `FloatingVehiclesPopover` e estado `vehiclesPopoverVisible`; botão na toolbar abre o popover de veículos.
  - O mapa usa `state.fleet.items` (ou equivalente) para desenhar veículos da frota; os IDs de dispositivos vêm de `fetchFleetMap` (ex.: `MapPositions.js` usa `state.fleet.items` e `device_id` principal).

- **MapPositions / mapa**
  - Consome a lista de veículos do mapa (`fleet.items`) para saber quais `device_id` exibir; múltiplos dispositivos por veículo são tratados via `device_id` principal retornado pelo Core.

### 3.4 Rotas e menu

- **VehiclesPage** pode ser acessada por rota em **Settings** (ex.: `/settings/vehicles`), se essa rota estiver configurada em `Navigation.jsx` e o item correspondente em `SettingsMenu.jsx`. (No código atual, o uso principal é via **VehiclesContent** no **FloatingVehiclesPopover**.)
- O menu de configurações e a MainPage têm entrada para abrir o gerenciamento de veículos (popover ou página, conforme implementado).

---

## 4. Modelo de dados (resumo)

### 4.1 Veículo (API e store)

- `id` (UUID)
- `client_id` (UUID)
- `plate` (string, única)
- `make`, `model`, `color`, `year` (opcionais)
- `notes`, `nickname`, `installation_details` (opcionais)
- `created_at`
- `client_name` (preenchido pelo backend em listagens)
- `device_id` (ID do dispositivo principal, para compatibilidade com mapa)
- `deviceIds` (array de IDs) ou `devices` (array de objetos com `id`, `is_primary`) – conforme endpoint

### 4.2 Cliente

- `id`, `type` (PF/PJ), `name`, `tax_id`, `address`, `contact_phone`, `email`, `traccar_user_id`, `active`, `created_at`

### 4.3 vehicle_devices

- `vehicle_id` (UUID), `device_id` (int), `is_primary` (boolean), chave primária (`vehicle_id`, `device_id`)

---

## 5. Fluxos principais

1. **Listar veículos (tela ou popover):**  
   `fetchVehicles()` → GET `/api/vehicles` → resposta gravada em `state.fleet.vehicles` → tabela e filtro de busca.

2. **Criar veículo:**  
   Preencher formulário (placa, cliente, opcionais, apelido, detalhes da instalação, rastreadores) → `addVehicle(vehicleData)` → POST `/api/vehicles` → backend insere em `vehicles` e em `vehicle_devices`, opcionalmente sincroniza permissões Traccar → Redux atualiza `vehicles` e fecha o dialog.

3. **Editar veículo:**  
   Clicar em Editar → preencher formulário com dados atuais (incl. `nickname`, `installation_details`) → `updateVehicle({ id, vehicleData })` → PUT `/api/vehicles/:id` → backend atualiza `vehicles` e substitui `vehicle_devices` → Redux atualiza a lista.

4. **Excluir veículo:**  
   Confirmar exclusão → `deleteVehicle(id)` → DELETE `/api/vehicles/:id` → Redux remove o item da lista.

5. **Mapa de frota:**  
   `fetchFleetMap()` → GET `/api/fleet/map` → resposta em `state.fleet.items` → mapa usa apenas veículos com `device_id` para exibir posições (dispositivo principal).

---

## 6. Migrações e scripts SQL

Ordem sugerida para banco novo ou atualização:

1. `scripts/fleet_core_init.sql` – Cria extensão UUID, tabelas `clients` e `vehicles` (sem `nickname`/`installation_details`).
2. `scripts/add_device_id_to_vehicles.sql` – Adiciona `device_id` em `vehicles` (se ainda não existir).
3. `scripts/migrate_to_many_devices.sql` – Cria `vehicle_devices`, migra dados e comenta a coluna legada.
4. `scripts/add_nickname_installation_details_to_vehicles.sql` – Adiciona `nickname` e `installation_details`.

Execução (exemplo):

```bash
psql -U usuario -d fleet_core -f scripts/fleet_core_init.sql
psql -U usuario -d fleet_core -f scripts/add_device_id_to_vehicles.sql
psql -U usuario -d fleet_core -f scripts/migrate_to_many_devices.sql
psql -U usuario -d fleet_core -f scripts/add_nickname_installation_details_to_vehicles.sql
```

---

## 7. Variáveis de ambiente

| Variável           | Descrição |
|--------------------|-----------|
| `CORE_PORT`        | Porta do Core (padrão 4000). |
| `GESTAO_PORT`      | Porta do Gestão (padrão 3666). |
| `DATABASE_URL`     | URL de conexão PostgreSQL (banco fleet_core). |
| `TRACCAR_API_URL`  | Base da API Traccar (ex.: https://rast.dominio.com.br). |
| `TRACCAR_EMAIL`    | Usuário admin Traccar (para sessão e permissões). |
| `TRACCAR_PASSWORD` | Senha do usuário Traccar. |
| `JWT_SECRET`       | Chave para assinatura dos tokens do app motorista. |
| `SESSION_SECRET`   | Chave para sessão Express (gestao_backend). |

O frontend usa `VITE_CORE_API_URL` e o proxy do Vite encaminha `/gestao` para a porta do gestao_backend.

---

## 8. Referência rápida de arquivos

| Camada   | Arquivo / Pasta |
|----------|------------------|
| Backend Core | `src/addons/traccar_wrapper/core/core.js` |
| Backend Gestão | `src/addons/gestao_backend/server.js`, `src/addons/gestao_backend/routes/*.js` |
| DB       | `src/addons/traccar_wrapper/db/index.js` |
| Rotas Core | `src/routes/fleetRoutes.js`, `src/routes/vehiclesRoutes.js`, `src/routes/clientsRoutes.js` |
| Auth Core | `src/middleware/authMiddleware.js` |
| Auth Gestão | `src/addons/gestao_backend/middleware/authAndFilter.js`, `jwtAuth.js` |
| Store    | `src/store/fleet.js`, `src/store/clients.js` |
| UI       | `src/settings/VehiclesPage.jsx`, `src/components/FloatingVehiclesPopover.jsx`, `src/other/gestao/*` |
| Mapa     | `src/main/MainPage.jsx`, `src/map/MapPositions.js` (uso de fleet.items) |
| SQL      | `scripts/fleet_core_init.sql`, `scripts/migrate_to_many_devices.sql`, `scripts/add_nickname_installation_details_to_vehicles.sql` |
| Proxy    | `vite.config.js` (proxy `/api/fleet`, `/api/clients`, `/api/vehicles` → 4000; `/gestao` → 3666) |

Esta documentação cobre o sistema de gestão de frota (backend e frontend) conforme implementado no projeto.
