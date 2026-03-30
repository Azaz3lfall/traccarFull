# Correção UUID vs Integer - Backend de Gestão (porta 3666)

## Contexto

O banco `fleet_core` usa **UUID** para `vehicle_id` nas tabelas. As rotas de listagem do backend de Gestão (`/gestao/abastecimentos`, `/gestao/trips`, etc.) ainda podem estar filtrando por `device_id` (integer) ou comparando UUID com integer, gerando o erro:

```
error: operator does not exist: uuid = integer
```

## Onde aplicar

O backend de Gestão roda na porta **3666** e **não está neste repositório**. Procure o arquivo principal (ex.: `server.js`, `index.js` ou `app.js`) do serviço que escuta na porta 3666.

## Correções necessárias

### 1. Filtro por vehicle_id (UUID)

Nas rotas **GET** de listagem, use `req.userVehicleIds` (array de UUIDs) com cast explícito:

**Antes (incorreto):**
```sql
WHERE device_id = ANY($1)
-- ou
WHERE vehicle_id = $1  -- quando $1 era integer
```

**Depois (correto):**
```sql
WHERE vehicle_id = ANY($1::uuid[])
```

**Exemplo em JavaScript/Node:**
```javascript
// Middleware ou rota deve popular req.userVehicleIds com UUIDs dos veículos do usuário
const vehicleIds = req.userVehicleIds || []; // Array de UUIDs

const result = await pool.query(
  `SELECT * FROM abastecimentos 
   WHERE vehicle_id = ANY($1::uuid[])
   ORDER BY data DESC`,
  [vehicleIds]
);
```

### 2. Garantir req.userVehicleIds

O middleware de autenticação deve preencher `req.userVehicleIds` com os UUIDs dos veículos permitidos ao usuário:

```javascript
// Exemplo: obter veículos do cliente do usuário
const vehiclesResult = await pool.query(
  `SELECT id FROM fleet_core.vehicles 
   WHERE client_id = (SELECT id FROM fleet_core.clients WHERE traccar_user_id = $1)`,
  [req.user.id]
);
req.userVehicleIds = vehiclesResult.rows.map(r => r.id); // UUIDs
```

### 3. Rotas a revisar

- `GET /gestao/abastecimentos/todos` (ou equivalente)
- `GET /gestao/trips`
- `GET /gestao/custos`
- `GET /gestao/maintenances` (ou similar)
- Qualquer rota que filtre por `vehicle_id` ou `device_id` em tabelas com `vehicle_id` UUID

### 4. Senha do pool (client password must be a string)

Se o erro `client password must be a string` aparecer, garanta que a senha seja sempre string na configuração do pool:

```javascript
const config = {
  host: String(dbUrl.hostname || 'localhost'),
  port: parseInt(dbUrl.port || '5432', 10),
  database: String((dbUrl.pathname || '/').slice(1) || 'postgres'),
  user: String(dbUrl.username || 'postgres'),
  password: String(process.env.DB_PASSWORD ?? dbUrl.password ?? ''),
};
```

## Verificação

Após as alterações, teste as rotas de listagem. O erro `operator does not exist: uuid = integer` deve desaparecer.

---

## ✅ Correções Aplicadas no Repositório

### Rotas de Veículos (`src/routes/vehiclesRoutes.js`)

1. **GET `/api/vehicles`**: Adicionadas colunas `tank_capacity` e `initial_odometer` explicitamente na query
2. **GET `/api/vehicles/:id`**: 
   - Adicionadas colunas `tank_capacity` e `initial_odometer`
   - Adicionado cast `::uuid` no WHERE clause
3. **POST `/api/vehicles`**: Adicionados campos `tank_capacity` e `initial_odometer` no INSERT
4. **PUT `/api/vehicles/:id`**: 
   - Adicionados campos `tank_capacity` e `initial_odometer` no UPDATE
   - Adicionado cast `::uuid` no WHERE clause
5. **DELETE `/api/vehicles/:id`**: Adicionado cast `::uuid` no WHERE clause
6. **Todas as queries**: Adicionado cast `::uuid` onde `vehicle_id` é usado como parâmetro

### Arquivo de Exemplo Criado

Foi criado o arquivo `docs/GESTAO_ROUTES_FIX_EXAMPLE.js` com exemplos completos de como implementar as rotas de gestão (`/gestao/abastecimentos`, `/gestao/trips`, `/gestao/maintenances`) corretamente, incluindo:

- Middleware para popular `req.userVehicleIds` com UUIDs
- Uso correto de cast `::uuid[]` em queries SQL
- Remoção de `Number()` e `parseInt()` de `vehicle_id`
- Exemplos de código correto vs incorreto

**Nota**: As rotas de gestão (`/gestao/*`) rodam em um backend separado (porta 3666). Use o arquivo de exemplo como referência para aplicar as correções no servidor de gestão.
