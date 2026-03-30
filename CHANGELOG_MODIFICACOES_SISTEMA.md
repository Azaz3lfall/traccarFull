# Changelog e Documentação das Modificações do Sistema

Este documento detalha as modificações realizadas no projeto Traccar Custom, incluindo a nova arquitetura, o papel do `traccar_wrapper`, as alterações no módulo de Gestão de Frota e os requisitos para integrar essas funcionalidades em aplicativos Flutter.

---

## 1. Visão Geral das Modificações

### 1.1 Resumo Executivo

O sistema passou por uma reestruturação significativa para suportar **gestão de frota** com regras de negócio específicas, separando a camada de rastreamento (Traccar) da camada de CRM e operação. As principais mudanças incluem:

| Área | Antes | Depois |
|------|-------|--------|
| **Entidades no mapa** | Dispositivos (devices) do Traccar | Veículos (agrupados por placa) |
| **Backend** | Apenas Traccar | Core (4000) + Gestão (3666) + Traccar |
| **Banco de dados** | Traccar nativo | PostgreSQL `fleet_core` (clients, vehicles, vehicle_devices, drivers, refuelings, etc.) |
| **Vínculo device ↔ veículo** | Não existia | Atributo `PLACA` no device + tabela `vehicle_devices` |
| **Identificadores** | device_id (integer) | vehicle_id (UUID) em toda a gestão |

### 1.2 Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/Vite)                               │
│  Proxy: /api/fleet, /api/clients, /api/vehicles → 4000 | /gestao → 3666      │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
┌──────────────────────────────┐         ┌──────────────────────────────────────┐
│   CORE (porta 4000)          │         │   GESTÃO (porta 3666)                 │
│   traccar_wrapper/core       │         │   gestao_backend                      │
│   - /api/fleet/map           │         │   - /gestao/* (admin)                 │
│   - /api/clients             │         │   - /app/motorista/* (app motorista)   │
│   - /api/vehicles            │         │   - /auth/driver-login (JWT)          │
└──────────────────────────────┘         └──────────────────────────────────────┘
                    │                                    │
                    └────────────────┬───────────────────┘
                                     ▼
                    ┌──────────────────────────────────────┐
                    │   PostgreSQL (fleet_core)             │
                    │   Pool: traccar_wrapper/db/index.js   │
                    └──────────────────────────────────────┘
                                     │
                    ┌────────────────┴──────────────────────┐
                    ▼                                       ▼
         ┌─────────────────────┐              ┌─────────────────────────────┐
         │   Traccar API      │              │   Tabelas: clients,         │
         │   (devices, posições)│             │   vehicles, vehicle_devices,│
         └─────────────────────┘             │   drivers, refuelings,      │
                                              │   custos, maintenances, trips│
                                              └─────────────────────────────┘
```

---

## 2. Nova Função do traccar_wrapper

### 2.1 Conceito: "Veículo Wrapper"

O `traccar_wrapper` implementa o conceito de **Veículo Wrapper** definido no BLUEPRINT:

- O sistema **não exibe Dispositivos** no mapa principal; exibe **Veículos**.
- Um **Veículo** é um container que agrupa **1 ou mais Dispositivos** (rastreadores).
- **Regra de agrupamento:** A ligação entre Dispositivos e Veículos é feita pelo atributo `PLACA` no campo `attributes` do dispositivo no Traccar.
- **Estoque:** Dispositivos sem o atributo `PLACA` são considerados "em estoque" e não aparecem no mapa.

### 2.2 Componentes do traccar_wrapper

| Arquivo/Pasta | Função |
|---------------|--------|
| `db/index.js` | Pool PostgreSQL compartilhado. Usado pelo **Core** e pelo **Gestão**. Carrega `DATABASE_URL` do `.env`. |
| `core/core.js` | Servidor Express na porta 4000. Registra rotas `/api/fleet`, `/api/clients`, `/api/vehicles`. |
| `fetchGroupedVehicles.js` | Função auxiliar: busca devices do Traccar, filtra por `attributes.PLACA`, agrupa por placa e enriquece com dados do Postgres (clients, vehicles). |

### 2.3 Responsabilidades do Core (traccar_wrapper)

1. **API de Frota (`/api/fleet/map`):**
   - Retorna veículos para o mapa com `device_id` principal e array `devices` (para carrossel no card de status).
   - Filtro de segurança: super admin vê todos; demais usuários veem apenas veículos do cliente vinculado ao `traccar_user_id`.

2. **API de Clientes (`/api/clients`):**
   - CRUD de clientes (PF/PJ) com dados de CRM e vínculo opcional `traccar_user_id`.

3. **API de Veículos (`/api/vehicles`):**
   - CRUD de veículos com placa única, marca, modelo, cor, ano, apelido, detalhes da instalação.
   - Associação N:N com dispositivos via `vehicle_devices` (device_id, is_primary).
   - Ao criar/atualizar, injeta `PLACA` nos `attributes` dos dispositivos no Traccar e sincroniza permissões.

### 2.4 Banco de Dados (fleet_core)

**Tabelas principais:**

- **clients** – Clientes com `traccar_user_id` opcional.
- **vehicles** – Veículos com `plate` única, `client_id`, `make`, `model`, `color`, `year`, `nickname`, `installation_details`, `tank_capacity`, `initial_odometer`, `vehicle_type`, `foto_veiculo`.
- **vehicle_devices** – Relação N:N: `vehicle_id` (UUID), `device_id` (int), `is_primary` (boolean).

**Scripts de migração (ordem sugerida):**

1. `scripts/fleet_core_init.sql`
2. `scripts/add_device_id_to_vehicles.sql`
3. `scripts/migrate_to_many_devices.sql`
4. `scripts/add_nickname_installation_details_to_vehicles.sql`
5. `scripts/fleet_core_gestao_tables.sql` (drivers, refuelings, custos, maintenances, trips, etc.)
6. `scripts/add_vehicle_type_to_vehicles.sql` (se aplicável)

---

## 3. Modificações no Módulo de Gestão de Frota

### 3.1 Unificação do Backend

O **gestao_backend** (porta 3666) consolida todas as rotas operacionais que antes podiam estar em sistemas separados:

- **Autenticação:** Sessão Traccar (cookie) para painel admin; JWT para app motorista.
- **Middleware:** `requireAuthAndFilter` valida sessão, popula `req.userVehicleIds` (UUIDs) e `req.userDeviceIds` com base em `vehicle_devices` e permissões Traccar.

### 3.2 Domínios de Gestão

| Domínio | Rotas principais | Tabela |
|---------|------------------|--------|
| Abastecimentos | POST/GET/PUT/DELETE `/gestao/refuelings`, `/gestao/abastecimentos/*` | refuelings |
| Motoristas | CRUD `/gestao/drivers`, sync, vehicles | drivers, driver_users, driver_vehicles |
| Custos | CRUD `/gestao/custos` | custos |
| Manutenções | CRUD `/gestao/maintenances` | maintenances |
| Viagens | iniciar, listar, finalizar, cancelar | trips |
| Relatórios | `/gestao/relatorios/*` | várias |

**Importante:** Todas as tabelas usam `vehicle_id` (UUID) referenciando `vehicles.id`.

### 3.3 Correção UUID

Foi aplicada correção para evitar o erro `operator does not exist: uuid = integer`:

- `vehicle_id` deve ser tratado sempre como **string UUID**, nunca como número.
- Queries SQL devem usar cast explícito: `WHERE vehicle_id = ANY($1::uuid[])`.
- O middleware garante que `req.userVehicleIds` seja array de strings (UUIDs).

### 3.4 App do Motorista

O aplicativo do motorista (mobile ou web) usa autenticação **JWT independente**:

- **Login:** `POST /auth/driver-login` com `username` e `password` → retorna `{ token }`.
- **Rotas protegidas:** Header `Authorization: Bearer <token>`.
- **Middleware:** `requireJwtAuth` valida o token e anexa `req.driverId`.

**Rotas do app motorista:**

| Método | Rota | Descrição |
|--------|------|------------|
| GET | `/app/motorista/trips` | Lista viagens do motorista (query: `status`) |
| POST | `/app/motorista/custos` | Registra custo vinculado a viagem |
| POST | `/app/motorista/custos-avulsos` | Registra custo avulso (sem viagem) |
| POST | `/app/motorista/refuelings` | Registra abastecimento |
| PUT | `/app/motorista/trips/:id/finalizar` | Finaliza viagem |
| GET | `/app/motorista/profile` | Perfil com veículos associados |
| POST | `/app/motorista/upload` | Upload de foto (comprovante) |

**Proxy Nginx:** Em produção, o nginx deve encaminhar `/gestao` e `/app/motorista` para o gestao_backend (porta 3666). Ver `nginx-gestao-proxy.conf`.

---

## 4. Detalhamento do Projeto (Estrutura)

### 4.1 Processos e Portas

| Processo | Porta | Arquivo | Responsabilidade |
|----------|-------|---------|------------------|
| **Core** | 4000 | `src/addons/traccar_wrapper/core/core.js` | Frota, clientes, veículos |
| **Gestão** | 3666 | `src/addons/gestao_backend/server.js` | Auth, motoristas, abastecimentos, custos, manutenções, viagens, relatórios, app motorista |
| **Resellers** | 3333 | `src/addons/reseller/resellersServer.mjs` | Revendedores, build de apps Flutter |
| **Traccar** | 8082 | (externo) | Rastreamento, devices, posições |

### 4.2 Proxy Vite (desenvolvimento)

```
/api/fleet, /api/clients, /api/vehicles  → http://localhost:4000
/gestao                                  → http://localhost:3666
/api/resellers, /api/upload, etc.        → http://localhost:3333
/api                                     → VITE_API_BASE_URL (Traccar)
```

### 4.3 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `CORE_PORT` | Porta do Core (padrão 4000) |
| `GESTAO_PORT` | Porta do Gestão (padrão 3666) |
| `DATABASE_URL` | URL PostgreSQL (banco fleet_core) |
| `TRACCAR_API_URL` | Base da API Traccar |
| `TRACCAR_EMAIL` | Usuário admin Traccar |
| `TRACCAR_PASSWORD` | Senha do usuário Traccar |
| `JWT_SECRET` | Chave para tokens do app motorista |
| `SESSION_SECRET` | Chave para sessão Express (gestao_backend) |
| `VITE_CORE_API_URL` | URL do Core no frontend |
| `VITE_API_BASE_URL` | URL do Traccar no frontend |

---

## 5. Requisitos para Aplicar no App Flutter

### 5.1 App do Motorista (Flutter)

Para integrar um app Flutter que funcione como **aplicativo do motorista**, é necessário:

#### 5.1.1 Autenticação

- **Endpoint:** `POST {BASE_URL}/auth/driver-login`
- **Body (JSON):** `{ "username": "string", "password": "string" }`
- **Resposta:** `{ "message": "...", "token": "jwt_string" }`
- **Uso:** Armazenar o token e enviar em todas as requisições: `Authorization: Bearer <token>`

#### 5.1.2 Base URL

- Em produção: URL do domínio onde o gestao_backend está exposto (ex.: `https://rast.dominio.com.br`).
- O nginx deve encaminhar `/auth` e `/app/motorista` para a porta 3666.

#### 5.1.3 Identificadores: vehicle_id é UUID

- **Todos** os `vehicle_id` retornados e enviados são **strings UUID** (ex.: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`).
- **Nunca** converter para inteiro. Usar como string em toda a aplicação Flutter.

#### 5.1.4 Endpoints a Implementar

| Funcionalidade | Método | Rota | Body/Query |
|----------------|--------|------|------------|
| Login | POST | `/auth/driver-login` | `username`, `password` |
| Perfil | GET | `/app/motorista/profile` | - |
| Listar viagens | GET | `/app/motorista/trips` | `?status=EM_ANDAMENTO` |
| Iniciar viagem | POST | `/gestao/trips/iniciar` | `vehicle_id`, `driver_id`, `start_city`, `end_city`, `is_round_trip` |
| Finalizar viagem | PUT | `/app/motorista/trips/:id/finalizar` | `distancia_total` |
| Registrar abastecimento | POST | `/app/motorista/refuelings` | `vehicle_id`, `refuel_date`, `odometer`, `liters_filled`, `total_cost`, `is_full_tank`, `posto_nome`, `cidade`, `foto_bomba`, `foto_odometro`, `viagem_id` |
| Registrar custo | POST | `/app/motorista/custos` | `vehicle_id`, `viagem_id`, `tipo_custo`, `descricao`, `valor`, `foto_path` |
| Custo avulso | POST | `/app/motorista/custos-avulsos` | `vehicle_id`, `tipo_custo`, `descricao`, `valor`, `foto_path` |
| Upload de foto | POST | `/app/motorista/upload` | `multipart/form-data`, campo `file` |

#### 5.1.5 Validações de Permissão

- O motorista só pode registrar custos/abastecimentos em **veículos associados** a ele (`driver_vehicles`).
- O motorista só pode finalizar viagens que **ele iniciou** (`trips.driver_id = req.driverId`).
- O backend retorna 403 quando o acesso é negado.

#### 5.1.6 Formato de Datas

- Usar ISO 8601 quando possível (ex.: `2025-02-13T14:30:00Z`).
- Para `refuel_date`, o backend aceita formatos comuns de data.

### 5.2 App Flutter Principal (Monitoramento/Admin)

Se o app Flutter for um cliente de monitoramento (similar ao web) ou um app admin:

#### 5.2.1 Autenticação

- Usar a API de sessão do Traccar (`POST /api/session` com email/senha).
- Ou, se houver integração com o gestao_backend, usar `POST /auth/login` e manter o cookie de sessão.

#### 5.2.2 API de Frota

- **GET** `{CORE_URL}/api/fleet/map` – Lista veículos para o mapa.
- Requer cookie de sessão Traccar no header.
- Resposta: array de objetos com `id`, `plate`, `nickname`, `device_id`, `devices`, `client_name`, etc.

#### 5.2.3 API de Veículos

- **GET** `{CORE_URL}/api/vehicles` – Lista veículos (CRUD).
- **GET** `{CORE_URL}/api/vehicles/:id` – Detalhe de um veículo.
- **POST** `{CORE_URL}/api/vehicles` – Criar veículo (client_id, plate, deviceIds, etc.).
- **PUT** `{CORE_URL}/api/vehicles/:id` – Atualizar veículo.
- **DELETE** `{CORE_URL}/api/vehicles/:id` – Remover veículo.

#### 5.2.4 Posições em Tempo Real

- As posições dos dispositivos vêm do **Traccar** (WebSocket ou API de posições).
- O mapa deve usar o `device_id` principal de cada veículo para buscar posições no Traccar.
- O conceito de "veículo" no mapa é apenas uma camada de agrupamento; as coordenadas vêm dos devices.

### 5.3 App Flutter Reseller (traccar-manager)

O app em `src/addons/reseller/traccar-manager` é um app Flutter white-label para revendedores. Para builds customizados:

- O **resellersServer** (porta 3333) gerencia builds e logos.
- Ver `DOCUMENTACAO_SERVICOS_ADICIONAIS.md` e `src/addons/reseller/README-SETUP.md` para detalhes de build.
- Em produção, configurar `nginx-resellers-proxy.conf` para encaminhar `/api/resellers/*` ao servidor de revendas.

### 5.4 Checklist de Integração Flutter

- [ ] Configurar base URL do backend (Core e/ou Gestão).
- [ ] Implementar login (Traccar session ou driver JWT).
- [ ] Tratar `vehicle_id` sempre como string UUID.
- [ ] Incluir header `Authorization: Bearer <token>` em rotas do app motorista.
- [ ] Incluir cookie de sessão em rotas que usam autenticação Traccar.
- [ ] Tratar códigos 401 (não autenticado), 403 (acesso negado), 404, 500.
- [ ] Implementar refresh de token ou novo login quando 401.
- [ ] Para uploads, usar `multipart/form-data` com campo `file`.
- [ ] Validar permissões no app (ex.: só mostrar veículos associados ao motorista).

---

## 6. Referências

| Documento | Descrição |
|-----------|-----------|
| `DOCUMENTACAO_GESTAO_FROTA.md` | Documentação completa do módulo de gestão de frota |
| `src/addons/traccar_wrapper/BLUEPRINT.md` | Regras de negócio e conceito de Veículo Wrapper |
| `src/addons/gestao_backend/README.md` | Rotas e configuração do backend de gestão |
| `DOCUMENTACAO_MOTORISTAS.md` | Processo de cadastro e gestão de motoristas |
| `docs/FIX_UUID_GESTAO_BACKEND.md` | Correções UUID no backend |
| `docs/CORRECAO_UUID_ROTAS_GESTAO.md` | Detalhes da correção aplicada |
| `dashcam_flutter_integration.md` | Integração de câmeras dashcam no Flutter |
| `nginx-gestao-proxy.conf` | Snippet nginx para gestão |
| `nginx-resellers-proxy.conf` | Snippet nginx para resellers |

---

*Documento gerado para referência das modificações do sistema Traccar Custom.*
