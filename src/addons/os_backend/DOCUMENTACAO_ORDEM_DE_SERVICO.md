# Documentação do Módulo Ordem de Serviço (OS)

Este documento descreve todas as funções, estruturas, rotas e configurações do backend de Ordem de Serviço (`os_backend`).

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Banco de Dados](#banco-de-dados)
4. [Rotas e Endpoints](#rotas-e-endpoints)
5. [Controllers](#controllers)
6. [Services](#services)
7. [Configurações](#configurações)

---

## Visão Geral

O módulo **Ordem de Serviço (OS)** permite gerenciar ordens de serviço para instalação, manutenção e remoção de rastreadores em veículos. Integra-se com:

- **Traccar**: usuários (clientes/técnicos), dispositivos e autenticação
- **Fleet Core**: clientes, veículos e vínculo dispositivo-veículo

### Tipos de OS

| Tipo | Descrição |
|------|-----------|
| `INSTALACAO` | Instalação de novo rastreador no veículo |
| `MANUTENCAO` | Manutenção/troca de equipamento (remove antigos, adiciona novos) |
| `REMOCAO` | Remoção de rastreador(es) do veículo |

### Status da OS

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando início |
| `IN_PROGRESS` | Em andamento |
| `COMPLETED` | Concluída |
| `CANCELLED` | Cancelada |

---

## Estrutura de Diretórios

```
src/addons/os_backend/
├── config/
│   └── multer.js          # Configuração de upload de arquivos
├── controllers/
│   ├── os.controller.js   # CRUD de OS, checklist, fotos, assinatura
│   └── traccar.controller.js  # Login, usuários, técnicos, dispositivos
├── db/
│   └── index.js           # Pool de conexão PostgreSQL (gestao_os)
├── routes/
│   ├── index.js           # Registro das rotas e middleware
│   ├── os.routes.js       # Rotas da API de OS
│   └── traccar.routes.js  # Rotas da API Traccar
├── services/
│   └── traccar.service.js # Chamadas à API do Traccar
└── DOCUMENTACAO_ORDEM_DE_SERVICO.md  # Este arquivo
```

---

## Banco de Dados

### Schema: `os_module`

#### Tabela `work_orders`

Ordens de serviço.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL | Chave primária |
| `customer_id` | INTEGER | ID do cliente (Traccar user ou fleet_core client) |
| `technician_id` | INTEGER | ID do técnico (Traccar user) |
| `device_id` | INTEGER | ID do dispositivo (legado, uso único) |
| `status` | VARCHAR(50) | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| `type` | VARCHAR(50) | INSTALACAO, MANUTENCAO, REMOCAO |
| `description` | TEXT | Descrição do serviço |
| `vehicle_plate` | VARCHAR(20) | Placa do veículo |
| `vehicle_model` | VARCHAR(100) | Modelo do veículo |
| `scheduled_at` | TIMESTAMP | Data/hora agendada |
| `created_at` | TIMESTAMP | Data de criação |
| `completed_at` | TIMESTAMP | Data de conclusão |
| `equipment_type` | JSONB | Tipo(s) de equipamento |
| `equipment_model` | VARCHAR(100) | Modelo do equipamento |
| `equipment_serial` | VARCHAR(100) | Número de série |
| `chip_number` | VARCHAR(50) | Número do chip |
| `lock_type` | JSONB | Tipo(s) de trava |
| `device_imei` | VARCHAR(50) | IMEI do dispositivo |
| `installation_details` | TEXT | Detalhes da instalação |
| `equipment_items` | JSONB | Array de equipamentos (múltiplos dispositivos) |
| `devices_to_remove` | INTEGER[] | IDs de dispositivos a remover |
| `delete_vehicle_if_empty` | BOOLEAN | Excluir veículo se ficar sem dispositivos |
| `vehicle_photo_path` | VARCHAR(512) | Caminho da foto do veículo |

**Índices:** `technician_id`, `customer_id`, `status`

#### Tabela `checklists`

Checklist por OS (1:1 com work_order).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL | Chave primária |
| `work_order_id` | INTEGER | FK para work_orders (UNIQUE) |
| `items` | JSONB | Array de itens do checklist |
| `technician_notes` | TEXT | Observações do técnico |
| `client_signature_path` | VARCHAR(512) | Caminho da assinatura do cliente |
| `created_at` | TIMESTAMP | Data de criação |

#### Tabela `attachments`

Fotos/anexos por OS.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | SERIAL | Chave primária |
| `work_order_id` | INTEGER | FK para work_orders |
| `file_path` | VARCHAR(512) | Caminho do arquivo |
| `file_type` | VARCHAR(50) | Tipo (ex: PHOTO) |
| `uploaded_at` | TIMESTAMP | Data do upload |

#### Tabela `technicians`

Técnicos autorizados (traccar_user_id = Traccar users.id).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `traccar_user_id` | INTEGER | PK, ID do usuário no Traccar |
| `created_at` | TIMESTAMP | Data de criação |

### Migrações

- `scripts/migrations/add_equipment_items.sql` – Coluna `equipment_items` (JSONB)
- `scripts/migrations/add_os_type_fields.sql` – Colunas `devices_to_remove`, `delete_vehicle_if_empty`
- `scripts/migrations/add_vehicle_photo_path.sql` – Coluna `vehicle_photo_path`

---

## Rotas e Endpoints

### Prefixo Base

- **OS API:** `/os-api`
- **Traccar API:** `/traccar-api`
- **Uploads estáticos:** `/os-uploads`

### Rotas OS (`/os-api`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/work-orders` | Criar ordem de serviço |
| GET | `/work-orders` | Listar ordens (filtro: `?technician_id=`) |
| GET | `/work-orders/:id` | Detalhes de uma OS |
| PATCH | `/work-orders/:id` | Atualizar OS |
| PATCH | `/work-orders/:id/status` | Atualizar status |
| DELETE | `/work-orders/:id` | Excluir OS |
| POST | `/checklist` | Salvar checklist e detalhes |
| POST | `/work-orders/:id/photos` | Upload de fotos (multipart, campo `photos`) |
| POST | `/work-orders/:id/signature` | Upload de assinatura (multipart, campo `signature`) |

### Rotas Traccar (`/traccar-api`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/login` | Autenticar no Traccar |
| GET | `/users` | Listar usuários (com flag `is_technician`) |
| POST | `/users` | Criar cliente |
| POST | `/toggle-technician` | Ativar/desativar técnico |
| POST | `/link-device` | Vincular dispositivo a usuário |

### Rota Fleet Core (via `index.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/os-api/clients` | Listar clientes do fleet_core |

---

## Controllers

### `os.controller.js`

#### `createWorkOrder(req, res)`

Cria uma nova ordem de serviço.

**Body:** `customer_id`, `technician_id`, `device_id`, `type`, `description`, `vehicle_plate`, `vehicle_model`, `scheduled_at`

**Resposta:** 201 + objeto da OS criada

---

#### `getWorkOrders(req, res)`

Lista ordens de serviço.

**Query:** `technician_id` (opcional) – filtra por técnico

**Resposta:** Array de work_orders

---

#### `getWorkOrderDetails(req, res)`

Retorna detalhes completos de uma OS (work_order + checklist + attachments).

**Params:** `id` – ID da OS

**Resposta:** Objeto com `checklist` e `attachments` (URLs convertidas para `/os-uploads/`)

---

#### `updateWorkOrder(req, res)`

Atualiza dados da OS.

**Params:** `id`  
**Body:** `customer_id`, `technician_id`, `device_id`, `type`, `description`, `vehicle_plate`, `vehicle_model`, `scheduled_at`

**Resposta:** Objeto da OS atualizada

---

#### `updateStatus(req, res)`

Atualiza o status da OS. Ao marcar como `COMPLETED`:

1. Exige checklist preenchido
2. Integra com fleet_core:
   - **REMOCAO:** Remove dispositivos do veículo; opcionalmente exclui veículo se vazio
   - **MANUTENCAO:** Remove dispositivos antigos, adiciona novos de `equipment_items`
   - **INSTALACAO:** Adiciona dispositivos de `equipment_items` ao veículo
3. Atualiza `installation_details` e `foto_veiculo` no veículo

**Params:** `id`  
**Body:** `{ status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }`

**Resposta:** Objeto da OS atualizada

---

#### `deleteWorkOrder(req, res)`

Exclui uma OS (cascade em checklists e attachments).

**Params:** `id`

**Resposta:** `{ message: "Ordem de serviço excluída com sucesso" }`

---

#### `saveChecklist(req, res)`

Salva ou atualiza checklist e detalhes da OS.

**Body:**
- `work_order_id` (obrigatório)
- `items` – array de itens do checklist
- `technician_notes` / `installation_details` / `installationDetails`
- `equipment_type`, `equipment_model`, `equipment_serial`, `chip_number`, `lock_type`, `device_imei`
- `equipment_items` – array de objetos `{ equipment_type, device_id, device_imei, ... }`
- `vehicle_photo_path`
- `devices_to_remove` – array de device_id
- `delete_vehicle_if_empty` – boolean
- `osDetails` – objeto alternativo com campos em camelCase

**Resposta:** 201 + `{ message: "Checklist e detalhes salvos com sucesso" }`

---

#### `saveSignature(req, res)`

Salva assinatura do cliente (upload de imagem).

**Params:** `id` – work_order_id  
**File:** `signature` (multipart)

**Resposta:** `{ message: "Assinatura salva com sucesso", path }`

---

#### `uploadPhotos(req, res)`

Upload de múltiplas fotos para uma OS.

**Params:** `id` – work_order_id  
**Files:** `photos` (array, até 10)  
**Body:** `type` (opcional, ex: PHOTO)

**Resposta:** `{ message: "N fotos enviadas com sucesso" }`

---

### `traccar.controller.js`

#### `login(req, res)`

Autentica usuário no Traccar.

**Body:** `email`, `password`

**Resposta:** Dados do usuário autenticado

---

#### `createClient(req, res)`

Cria novo usuário no Traccar (cliente).

**Body:** `name`, `email`, `password`

**Resposta:** 201 + `{ message, user }`

---

#### `listUsers(req, res)`

Lista usuários do Traccar com flag `is_technician` (baseado em `os_module.technicians`).

**Resposta:** Array de usuários com `is_technician: true/false`

---

#### `toggleTechnicianStatus(req, res)`

Adiciona ou remove técnico da tabela `os_module.technicians`.

**Body:** `traccar_user_id`, `status` (boolean)

**Resposta:** `{ message: "Status de técnico atualizado com sucesso" }`

---

#### `verifyAndLinkDevice(req, res)`

Verifica se IMEI existe no Traccar; se não, cria dispositivo. Vincula dispositivo ao usuário.

**Body:** `uniqueId` (IMEI), `name`, `userId`

**Resposta:** `{ message: "Dispositivo vinculado com sucesso", device }`

---

## Services

### `traccar.service.js`

Serviço de integração com a API do Traccar.

| Função | Descrição |
|--------|-----------|
| `getUsers()` | GET /api/users |
| `createUser(userData)` | POST /api/users |
| `getDevices()` | GET /api/devices |
| `checkImeiExists(uniqueId)` | Verifica se IMEI existe |
| `createDevice(name, uniqueId)` | Cria dispositivo |
| `linkDeviceToUser(userId, deviceId)` | POST /api/permissions |
| `authenticate(email, password)` | POST /api/session |

**Variáveis de ambiente:** `TRACCAR_API_URL`, `TRACCAR_ADMIN_USER`/`TRACCAR_EMAIL`, `TRACCAR_ADMIN_PASS`/`TRACCAR_PASSWORD`

---

## Configurações

### `db/index.js`

- **Variável:** `DATABASE_OS_URL` ou `DATABASE_URL`
- **Banco:** `gestao_os` (se DATABASE_OS_URL) ou do URL
- **Pool:** `pg.Pool` exportado como `pool` e `default`

### `config/multer.js`

- **Diretório base:** `uploads/os/`
- **Estrutura:** `uploads/os/os_{id}/` por OS
- **Limite:** 10 MB por arquivo
- **Tipos:** jpeg, jpg, png, webp

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_OS_URL` | URL PostgreSQL do banco gestao_os |
| `TRACCAR_API_URL` | URL da API do Traccar |
| `TRACCAR_EMAIL` / `TRACCAR_ADMIN_USER` | Usuário admin Traccar |
| `TRACCAR_PASSWORD` / `TRACCAR_ADMIN_PASS` | Senha admin Traccar |

---

## Fluxo de Integração ao Completar OS

Quando `updateStatus` recebe `status: "COMPLETED"`:

1. Valida existência de checklist
2. Busca veículo no fleet_core por `vehicle_plate` e `customer_id`
3. Conforme `type`:
   - **REMOCAO:** Remove dispositivos (`devices_to_remove` ou todos do veículo); opcionalmente exclui veículo se `delete_vehicle_if_empty`
   - **MANUTENCAO:** Remove `devices_to_remove`, adiciona dispositivos de `equipment_items`
   - **INSTALACAO:** Adiciona dispositivos de `equipment_items`
4. Atualiza `installation_details` e `foto_veiculo` no veículo

---

## Utilitários Internos

### `toOsUploadUrl(filePath)` (os.controller.js)

Converte caminho absoluto do arquivo em URL relativa `/os-uploads/...` para servir via Express static.
