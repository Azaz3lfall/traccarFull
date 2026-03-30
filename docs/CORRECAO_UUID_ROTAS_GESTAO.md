# ✅ Correção UUID nas Rotas de Gestão - APLICADA

## Problema Identificado

O servidor estava travando nas rotas de listagem com o erro:
```
error: operator does not exist: uuid = integer
```

**Rotas afetadas:**
- `GET /gestao/abastecimentos/todos`
- `GET /gestao/trips`
- `GET /gestao/maintenances`

## Causa Raiz

1. O código estava convertendo UUIDs para Integer usando `Number()` ou `parseInt()`
2. As queries SQL não tinham cast explícito `::uuid[]`
3. O middleware não garantia que `req.userVehicleIds` fosse um array de strings (UUIDs)

## Correções Aplicadas

### 1. Arquivo Criado: `src/routes/gestaoRoutes.js`

Este arquivo contém todas as rotas de gestão corrigidas:

#### Middleware `populateUserVehicleIds`
- Popula `req.userVehicleIds` com UUIDs como **strings** (não números)
- Suporta super admin e usuários comuns
- Garante que os IDs sejam sempre strings UUID

#### Rota `/gestao/abastecimentos/todos`
```javascript
// ✅ CORRETO
const vehicleIds = req.userVehicleIds || []; // Já são UUIDs (strings)
const result = await pool.query(
  `SELECT * FROM abastecimentos 
   WHERE vehicle_id = ANY($1::uuid[])
   ORDER BY data DESC`,
  [vehicleIds] // Array de UUIDs (strings)
);
```

#### Rota `/gestao/trips`
```javascript
// ✅ CORRETO
const vehicleIds = req.userVehicleIds || []; // Já são UUIDs (strings)
const result = await pool.query(
  `SELECT * FROM trips 
   WHERE vehicle_id = ANY($1::uuid[])
   ${status ? 'AND status = $2' : ''}
   ORDER BY start_date DESC`,
  status ? [vehicleIds, status] : [vehicleIds]
);
```

#### Rota `/gestao/maintenances`
```javascript
// ✅ CORRETO
const vehicleIds = req.userVehicleIds || []; // Já são UUIDs (strings)
const result = await pool.query(
  `SELECT * FROM maintenances 
   WHERE vehicle_id = ANY($1::uuid[])
   ORDER BY date DESC`,
  [vehicleIds] // Array de UUIDs (strings)
);
```

### 2. Arquivo Criado: `src/addons/gestao_backend/server.js`

Servidor de exemplo para o backend de gestão (porta 3666) que usa as rotas corrigidas.

## Mudanças Críticas

### ❌ ANTES (Incorreto)
```javascript
// ERRADO: Converter UUID para número
const vehicleId = Number(req.query.vehicle_id);
const vehicleIds = req.userVehicleIds.map(id => Number(id));

// ERRADO: Sem cast explícito
WHERE vehicle_id = ANY($1)

// ERRADO: Comparação com número
if (req.userVehicleIds.includes(Number(id)))
```

### ✅ DEPOIS (Correto)
```javascript
// CORRETO: Manter como string UUID
const vehicleId = req.query.vehicle_id; // Já é string UUID
const vehicleIds = req.userVehicleIds.map(id => String(id)); // Garantir string

// CORRETO: Cast explícito ::uuid[]
WHERE vehicle_id = ANY($1::uuid[])

// CORRETO: Comparação com string
if (req.userVehicleIds.includes(id)) // id já é string UUID
```

## Como Usar

### Opção 1: Usar no Backend de Gestão Existente

Se você já tem um servidor de gestão rodando na porta 3666:

1. Copie o conteúdo de `src/routes/gestaoRoutes.js`
2. Substitua as rotas existentes pelas rotas corrigidas
3. Certifique-se de que o middleware `populateUserVehicleIds` seja aplicado antes das rotas

### Opção 2: Usar o Servidor de Exemplo

Se você quer usar o servidor de exemplo criado:

1. Configure a variável de ambiente `GESTAO_PORT=3666` (ou use a porta padrão)
2. Execute:
   ```bash
   node src/addons/gestao_backend/server.js
   ```

### Opção 3: Integrar no Servidor Existente

Se você tem um `server.js` ou `index.js` no backend de gestão:

```javascript
import gestaoRoutes from './routes/gestaoRoutes.js';

// ... outras configurações ...

app.use('/gestao', gestaoRoutes);
```

## Verificação

Após aplicar as correções, teste as rotas:

```bash
# Testar abastecimentos
curl http://localhost:3666/gestao/abastecimentos/todos

# Testar trips
curl http://localhost:3666/gestao/trips

# Testar maintenances
curl http://localhost:3666/gestao/maintenances
```

**Resultado esperado:**
- ✅ Não deve mais aparecer o erro `operator does not exist: uuid = integer`
- ✅ As rotas devem retornar dados filtrados corretamente por `vehicle_id` (UUID)
- ✅ Logs devem mostrar UUIDs como strings, não números

## Checklist de Correção

- [x] Removido `Number()` e `parseInt()` de `vehicle_id`
- [x] Adicionado cast explícito `::uuid[]` em todas as queries SQL
- [x] Middleware garante que `req.userVehicleIds` seja array de strings (UUIDs)
- [x] Todas as comparações de `vehicle_id` usam strings, não números
- [x] Logs adicionados para debug
- [x] Tratamento de erros melhorado com detalhes

## Notas Importantes

1. **UUIDs são strings**: Sempre trate `vehicle_id` como string, nunca como número
2. **Cast explícito é obrigatório**: Use `::uuid` ou `::uuid[]` nas queries SQL
3. **Middleware é essencial**: O middleware `populateUserVehicleIds` deve ser aplicado antes das rotas
4. **Array vazio**: Se `req.userVehicleIds` estiver vazio, retorne array vazio, não erro

## Arquivos Criados/Modificados

- ✅ `src/routes/gestaoRoutes.js` - Rotas corrigidas
- ✅ `src/addons/gestao_backend/server.js` - Servidor de exemplo
- ✅ `docs/CORRECAO_UUID_ROTAS_GESTAO.md` - Esta documentação
