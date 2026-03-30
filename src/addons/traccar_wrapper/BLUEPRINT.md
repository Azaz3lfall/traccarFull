Markdown
# Project Blueprint: Traccar Fleet Wrapper & Unified Management

## 1. Visão Geral e Arquitetura
O objetivo é desenvolver uma camada de aplicação (Frontend + Backend Core) que reorganiza as entidades do Traccar nativo para atender a regras de negócio específicas de gestão de frota.

**Conceito Chave: "Veículo Wrapper"**
* O sistema não exibe Dispositivos no mapa principal, exibe **Veículos**.
* Um Veículo é um container que agrupa 1 ou mais Dispositivos (Devices).
* **Regra de Agrupamento:** A ligação entre Dispositivos e Veículos é feita através do atributo `PLACA` (string) presente no campo `attributes` do dispositivo no Traccar.
* **Estoque:** Qualquer dispositivo no Traccar que **não** possua o atributo `PLACA` preenchido é considerado "Estoque" e não deve aparecer no mapa de monitoramento.

---

## 2. Regras de Negócio (The "Rules of Engagement")

### 2.1. Veículos e Dispositivos (A Lógica da Placa)
* **Não existe hierarquia:** Não há "Principal" ou "Secundário". Se um veículo tem 3 dispositivos (2 GSM, 1 Satelital), os 3 são tratados igualmente.
* **Visualização (Setas):** No Card de Status do Veículo, o usuário navega entre os dispositivos usando setas (`<` e `>`).
* **Sincronia:**
    * Ao criar um veículo no Novo Painel (ex: Placa ABC-1234), e vincular o IMEI X e Y:
    * O Backend deve atualizar o dispositivo X e Y no Traccar, injetando `{"PLACA": "ABC-1234"}` no campo attributes.
* **Invisibilidade:** Dispositivos sem o atributo `PLACA` são invisíveis no endpoint `/api/fleet/map`.

### 2.2. Gestão de Pessoas (Entidades Separadas)
A gestão de usuários é desacoplada em entidades específicas:
1.  **Clientes (PF/PJ):**
    * Possuem dados de CRM (CNPJ, Endereço, Contato).
    * Possuem um vínculo com um `traccar_user_id` (Login/Senha do Traccar) para acesso ao sistema.
    * *UX de Cadastro:* Wizard ou Abas. Passo 1: Dados Cadastrais (CRM). Passo 2: Dados de Acesso (Criação do User no Traccar).
2.  **Técnicos:**
    * Gerenciados exclusivamente pelo microsserviço de "Ordens de Serviço".
    * São usuários admins com permissões customizadas.
3.  **Motoristas:**
    * Mantém-se a estrutura nativa do Traccar (`tc_drivers`).

---

## 3. Estrutura de Banco de Dados (PostgreSQL - Core Service)

O Core Service armazena os dados de negócio que o Traccar não suporta (CRM).

```sql
-- Tabela de Clientes (Dados ricos de CRM)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) NOT NULL, -- 'PF' or 'PJ'
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20) UNIQUE, -- CPF/CNPJ
    full_address TEXT,
    contact_phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Vínculo com o Usuário de Login do Traccar
    traccar_user_id INT UNIQUE, 
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Veículos (O Agrupador)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    plate VARCHAR(20) UNIQUE NOT NULL, -- A CHAVE MÁGICA DE VÍNCULO
    make VARCHAR(50),  -- Marca (Volkswagen)
    model VARCHAR(50), -- Modelo (Constellation)
    color VARCHAR(30),
    year INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nota: Não há tabela de 'Devices' ou 'Stock'. 
-- O Core consulta o Traccar em tempo real ou cacheia a lista de devices,
-- filtrando pelo atributo 'PLACA'.
4. Definição da API (Backend Logic)
Endpoint: GET /api/fleet/map (O Agrupador)
Este endpoint é responsável por transformar a lista "flat" de devices do Traccar em uma lista hierárquica de Veículos.

Lógica do Algoritmo:

Buscar todos os devices do Traccar.

Filtrar devices onde attributes.PLACA existe.

Agrupar devices pela attributes.PLACA.

Cruzar com a tabela vehicles do Core DB para pegar dados extras (Marca, Modelo, Dono).

Retornar lista de objetos "Veículo".

Response Payload:

JSON
[
  {
    "vehicle_id": "uuid-core-db",
    "plate": "RSI1I47",
    "model": "FH 540 BARROSO",
    "client_name": "Transportadora X",
    "general_status": "ONLINE", // Lógica: Se 1 device estiver online, o veículo está online
    "devices": [
      {
        "index": 0,
        "name": "B1 RSI1I47 GSM",
        "imei": "862092067035695",
        "protocol": "teltonika",
        "last_update": "2 mins ago",
        "status": "online",
        "lat": -23.5,
        "lon": -46.6
      },
      {
        "index": 1,
        "name": "B1 RSI1I47 SAT",
        "imei": "0-4708291",
        "protocol": "iridium",
        "last_update": "28 mins ago",
        "status": "unknown",
        "lat": -23.5,
        "lon": -46.6
      }
    ]
  }
]
Endpoint: POST /api/vehicles/bind (Vínculo)
Vincula um device do estoque a um veículo. Ação:

Recebe { vehicle_plate: "ABC-1234", traccar_device_id: 50 }.

Chama API Traccar PUT /api/devices/50.

Atualiza o objeto attributes: { ...attributes, "PLACA": "ABC-1234" }.

5. Diretrizes de Frontend (UI/UX)
Página de Clientes:

Layout em abas ou Stepper.

Aba 1 (Dados): Formulário completo (Nome, Endereço, CPF). Salva em clients.

Aba 2 (Acesso): Formulário simplificado (Login, Senha). Cria o user na API do Traccar e salva o ID em clients.traccar_user_id.

Página de Veículos (Gestão):

CRUD de Veículos (Salva em vehicles).

Seção "Equipamentos Instalados": Lista os devices que possuem a PLACA deste veículo.

Botão "Adicionar Equipamento": Abre um modal listando devices do Traccar que NÃO têm atributo PLACA (Estoque). Ao selecionar, dispara o bind (injeta a placa no atributo).

Mapa / Monitoramento:

Renderiza apenas um ícone por PLACA.

Ao clicar, abre o Status Card.

Se devices.length > 1, exibe as setas de navegação no topo do card.

Ao clicar na seta, atualiza os dados do card (velocidade, ignição, endereço) com os dados do próximo device do array.