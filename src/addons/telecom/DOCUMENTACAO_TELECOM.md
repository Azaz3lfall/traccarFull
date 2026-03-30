# Documentação do Módulo Telecom

Este documento descreve todas as funções, estruturas, rotas e configurações do módulo de Telecomunicações (SMS, chips, templates).

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Banco de Dados](#banco-de-dados)
4. [Rotas e Endpoints](#rotas-e-endpoints)
5. [Services](#services)
6. [Gateways SMS](#gateways-sms)

---

## Visão Geral

O módulo **Telecom** gerencia:

- **Chips:** Cadastro e vínculo com dispositivos Traccar
- **Templates SMS:** Mensagens pré-definidas
- **Batch Templates:** Sequência de templates com delay
- **SMS:** Envio via Comtele ou Voxter (conforme operadora)
- **Reset de Simcard:** Via API Voxter (operadoras suportadas)

### Gateways SMS

| Gateway | Operadoras | Uso |
|---------|------------|-----|
| **Voxter** | Claro, Emnify | SMS e reset |
| **Comtele** | Algar, Vivo, etc. | SMS |

---

## Estrutura de Diretórios

```
src/addons/telecom/
├── routes/
│   ├── index.js        # Registro e sync devices→chips
│   ├── chips.js        # CRUD de chips
│   ├── templates.js    # Templates SMS
│   ├── batchTemplates.js  # Configurações em lote
│   ├── sms.js          # Envio e histórico SMS, reset
│   └── voxter.js       # Simcards Voxter (direto)
├── services/
│   ├── comteleSms.js   # API Comtele
│   └── voxterApi.js    # API Voxter (Lara M2M)
├── db/
│   └── index.js        # Pool PostgreSQL (gestao_telecom)
├── scripts/
│   ├── verifyVoxterCredentials.js
│   └── syncDevicesToChips.js
└── DOCUMENTACAO_TELECOM.md
```

---

## Banco de Dados

**Variável:** `DATABASE_TELECOM_URL` ou `DATABASE_URL`  
**Banco:** `gestao_telecom`

### Tabela `chips`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL | PK |
| codigo_referencia | INTEGER | Código interno |
| broker | VARCHAR(50) | Broker |
| operadora | VARCHAR(30) | N/A, Emnify, Claro, Algar, Vivo, etc. |
| numero | VARCHAR(20) | Número da linha (único) |
| iccid | VARCHAR(50) | ICCID (único) |
| valor_custo | DECIMAL | Custo mensal |
| mbytes_plano | INTEGER | MB do plano |
| status | VARCHAR(20) | ATIVO, etc. |
| traccar_device_id | INTEGER | FK para device Traccar |
| data_cadastro | TIMESTAMP | Data de cadastro |

### Tabela `sms_templates`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL | PK |
| titulo | VARCHAR(100) | Nome do template |
| mensagem | TEXT | Corpo da mensagem |
| tags_disponiveis | VARCHAR(255) | Tags para substituição |
| criado_por | INTEGER | FK usuarios |

### Tabela `sms_batch_templates`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL | PK |
| nome | VARCHAR(100) | Nome da configuração |
| template_ids | INTEGER[] | IDs dos templates (ordem) |
| delay_entre_sms | INTEGER | Segundos entre cada SMS |
| criado_em | TIMESTAMP | Data de criação |

### Tabela `sms_logs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL | PK |
| data_envio | TIMESTAMP | Data/hora do envio |
| usuario_id | INTEGER | Quem enviou |
| chip_id | INTEGER | Chip usado |
| numero_destino | VARCHAR(20) | Número de destino |
| mensagem_corpo | TEXT | Mensagem enviada |
| status_entrega | VARCHAR(20) | SUCESSO, ERRO, PENDENTE |
| gateway | VARCHAR(20) | Voxter, Comtele |
| erro_mensagem | TEXT | Mensagem de erro |
| referencia_externa_id | VARCHAR(100) | ID externo (Comtele) |

---

## Rotas e Endpoints

### Prefixo Base: `/gestao/telecom`

---

### Chips (`/gestao/telecom/chips`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/chips` | Listar (page, limit, sort, order, search) |
| GET | `/chips/available` | Chips disponíveis (?deviceId) |
| GET | `/chips/by-device/:deviceId` | Chip por dispositivo |
| POST | `/chips` | Criar chip |
| POST | `/chips/batch` | Criar em lote (rows) |
| POST | `/chips/batch-remove` | Excluir em lote (ids) |
| PUT | `/chips/:id` | Atualizar (incl. traccar_device_id) |
| DELETE | `/chips/:id` | Excluir |

---

### Templates (`/gestao/telecom/templates`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/templates` | Listar templates |
| POST | `/templates` | Criar |
| PUT | `/templates/:id` | Atualizar |
| DELETE | `/templates/:id` | Excluir |

---

### Batch Templates (`/gestao/telecom/batch-templates`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/batch-templates` | Listar |
| POST | `/batch-templates` | Criar |
| PUT | `/batch-templates/:id` | Atualizar |
| DELETE | `/batch-templates/:id` | Excluir |

---

### SMS (`/gestao/telecom/sms`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/sms/send` | Enviar SMS (numero, mensagem, deviceId) |
| POST | `/sms/send-batch` | Enviar sequência (numero/deviceId, batchTemplateId) |
| GET | `/sms/history` | Histórico (month, year, search, page, limit) |
| POST | `/sms/reset` | Reset de simcard (deviceId) |

---

### Voxter (`/gestao/telecom/voxter`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/voxter/simcards` | Listar simcards (page, search) |
| POST | `/voxter/simcards/sms` | Enviar SMS (line, payload) |
| POST | `/voxter/simcards/:id/reset` | Reset por ID do simcard |

---

### Sync

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/gestao/telecom/sync/devices-to-chips` | Sincronizar devices Traccar (com phone) → chips |

---

## Services

### `comteleSms.js`

| Função | Descrição |
|--------|-----------|
| `sendSms(receivers, content, apiKey)` | POST para Comtele API v2 |

**URL:** `https://sms.comtele.com.br/api/v2/send`  
**Body:** `{ Sender: 'Traccar', Receivers, Content }`  
**Header:** `auth-key`

---

### `voxterApi.js`

| Função | Descrição |
|--------|-----------|
| `listSimcards(page, search)` | Lista simcards (paginação e busca) |
| `sendSms(line, payload)` | Envia SMS (Claro/Emnify) |
| `resetSimcard(simcardId)` | Reset de simcard |
| `authenticate()` | Obtém Bearer token |
| `getBearerToken()` | Token em cache (5h TTL) |

**Base URL:** `VOXTER_BASE_URL` ou `https://lara.voxter.com.br:8080/api`

---

## Gateways SMS

### Lógica de Escolha (sms.js)

1. **Por operadora do chip:** Se operadora = Emnify ou Claro → Voxter
2. **Fallback:** Se operadora N/A ou chip não encontrado → consulta Voxter por número; se simcard suportar SMS (Claro/Emnify) → Voxter
3. **Demais:** Comtele

### Reset de Simcard

**Operadoras suportadas:** Emnify, Algar, Claro, Vivo, NLT, Links Field

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_TELECOM_URL` | PostgreSQL gestao_telecom |
| `COMTELE_API_KEY` | Chave API Comtele |
| `VOXTER_EMAIL` | Email Voxter |
| `VOXTER_PASSWORD` | Senha Voxter |
| `VOXTER_ACCESS_TOKEN` | Token de acesso Voxter |
| `VOXTER_BASE_URL` | URL base API (opcional) |
| `TRACCAR_API_URL` | Para sync devices→chips |

---

## Stub Routes (sem DB)

Quando `DATABASE_TELECOM_URL` não está configurado, as rotas SMS e batch-templates retornam **503** com mensagem informativa. As rotas Voxter continuam funcionando (não dependem do pool).
