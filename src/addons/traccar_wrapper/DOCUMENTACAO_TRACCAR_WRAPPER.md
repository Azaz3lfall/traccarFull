# Documentação do Módulo Traccar Wrapper

Este documento descreve todas as funções, estruturas e componentes do wrapper que integra o Traccar com o Fleet Core.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Banco de Dados](#banco-de-dados)
4. [Core Service](#core-service)
5. [Utilitários](#utilitários)
6. [Regras de Negócio](#regras-de-negócio)

---

## Visão Geral

O **Traccar Wrapper** fornece:

- **Pool de conexão** ao banco Fleet Core (clients, vehicles, vehicle_devices)
- **Core Service:** API REST para frota, clientes e veículos
- **fetchGroupedVehicles:** Agrupamento de devices por placa com enriquecimento do DB

### Conceito: Veículo Wrapper

- O sistema exibe **Veículos** no mapa, não dispositivos isolados
- Um veículo agrupa 1 ou mais dispositivos
- **Vínculo:** Atributo `PLACA` no campo `attributes` do device no Traccar
- Dispositivos sem `PLACA` = **Estoque** (não aparecem no mapa)

---

## Estrutura de Diretórios

```
src/addons/traccar_wrapper/
├── core/
│   ├── core.js              # Servidor Express (porta CORE_PORT)
│   └── start-core-server.sh # Script de inicialização
├── db/
│   └── index.js             # Pool PostgreSQL (DATABASE_URL)
├── fetchGroupedVehicles.js  # Função de agrupamento por placa
├── BLUEPRINT.md             # Especificação do projeto
└── DOCUMENTACAO_TRACCAR_WRAPPER.md
```

---

## Banco de Dados

**Variável:** `DATABASE_URL`  
**Uso:** Fleet Core (clients, vehicles, vehicle_devices, drivers, etc.)

### Configuração (`db/index.js`)

- Pool `pg.Pool` com `DATABASE_URL`
- Fallback: `DB_PASSWORD` sobrescreve senha da URL
- Teste de conexão ao iniciar
- Exporta `pool` e `default`

---

## Core Service

**Porta:** `CORE_PORT` (default: 4000)

### Rotas Registradas

| Prefixo | Arquivo | Descrição |
|---------|---------|-----------|
| `/api/fleet` | fleetRoutes.js | Mapa de frota, etc. |
| `/api/clients` | clientsRoutes.js | CRUD de clientes |
| `/api/vehicles` | vehiclesRoutes.js | CRUD de veículos |

### Endpoints Principais (conforme BLUEPRINT)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Health check |
| GET | `/api/fleet/map` | Veículos agrupados para o mapa |

**Lógica do mapa:**
- Busca veículos em `vehicles` + `clients`
- Filtra por `client_id` se usuário não for super admin
- Retorna `device_id` principal (vehicle_devices.is_primary)
- Array `devices` para carrossel de múltiplos rastreadores

---

## Utilitários

### `fetchGroupedVehicles(options)`

Agrupa devices do Traccar por placa e enriquece com dados do Postgres.

**Parâmetros:**
- `options.baseURL` – URL da API Traccar (default: TRACCAR_API_URL)
- `options.auth` – `{ username, password }` (default: TRACCAR_EMAIL, TRACCAR_PASSWORD)

**Retorno:**
```javascript
[
  {
    plate: string,
    client_name: string | null,
    make: string | null,
    model: string | null,
    devices: Object[]  // devices do Traccar com attributes.PLACA
  }
]
```

**Lógica:**
1. GET `/api/devices?all=true&excludeAttributes=false`
2. Filtra devices com `attributes.PLACA` preenchido
3. Agrupa por placa
4. Enriquece com `vehicles` + `clients` (client_name, make, model)

---

## Regras de Negócio (BLUEPRINT)

### Veículos e Dispositivos

- **Sem hierarquia:** Todos os dispositivos do veículo têm o mesmo peso
- **Visualização:** Navegação por setas no card de status
- **Sincronia:** Ao vincular device a veículo, injeta `{"PLACA": "ABC-1234"}` em attributes
- **Invisibilidade:** Devices sem PLACA não aparecem em `/api/fleet/map`

### Gestão de Pessoas

| Entidade | Onde é gerenciada |
|----------|-------------------|
| Clientes (PF/PJ) | Fleet Core + Traccar (traccar_user_id) |
| Técnicos | Módulo OS (Ordem de Serviço) |
| Motoristas | Traccar nativo (tc_drivers) + Gestão Backend |

### Vínculo Device–Veículo

- **POST /api/vehicles/bind:** Recebe `vehicle_plate`, `traccar_device_id`
- Atualiza device no Traccar: `attributes.PLACA = vehicle_plate`

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL Fleet Core |
| `DB_PASSWORD` | Override da senha (opcional) |
| `TRACCAR_API_URL` | URL da API Traccar |
| `TRACCAR_EMAIL` | Usuário admin Traccar |
| `TRACCAR_PASSWORD` | Senha admin Traccar |
| `CORE_PORT` | Porta do Core Service |

---

## Dependências

- **gestao_backend:** Usa `traccar_wrapper/db` como pool principal
- **fleetRoutes, clientsRoutes, vehiclesRoutes:** Importados de `src/routes/`
- **authMiddleware:** Autenticação nas rotas do Core
