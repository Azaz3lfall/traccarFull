# Melhorias Pendentes — Traccar Custom

Levantamento realizado em 2026-05-15. Itens organizados por categoria e prioridade.

---

## Melhorias Estéticas

### E1 · Legenda de estados no mapa
**Prioridade**: Alta | **Esforço**: ~2h

Adicionar um mini-painel fixo no canto inferior do mapa com a legenda das 4 cores de estado dos ícones de veículo.

```
● Verde   — Em movimento
● Azul    — Online / parado
● Amarelo — Ignição ligada / parado
● Vermelho — Offline
```

**Onde implementar**: `src/main/MainMap.jsx` ou novo componente `src/map/legend/MapStatusLegend.jsx`

---

### E2 · Animação nos ícones de estado
**Prioridade**: Alta | **Esforço**: ~2h

- Ícones `idle` (amarelo): pulso suave para indicar "vivo mas parado"
- Ícones `offline`: opacidade reduzida (60%) — visualmente recuados
- Implementado via `icon-opacity` expression no MapLibre, sem custo de performance

**Onde implementar**: `src/map/MapPositions.js` — adicionar paint expression por estado na layer de símbolos

---

### E3 · Popup do mapa mais rico
**Prioridade**: Alta | **Esforço**: ~1 dia

Melhorar o popup que aparece ao clicar num marcador. Atualmente mostra: nome, endereço, última comunicação.

Adicionar:
- Velocidade atual (se `driving`)
- Tempo nesse estado (ex: "parado há 2h 15min")
- Badge colorido de estado em vez de texto puro
- Botão direto "Ver detalhes" que abre o StatusCard do veículo

**Onde implementar**: `src/map/MapPositions.js` — função `createMarkerPopupHTML()`

---

### E4 · Lista de veículos — indicador visual de estado
**Prioridade**: Média | **Esforço**: ~3h

Evoluir o `DeviceRow` de um ponto colorido para:
- Barra lateral colorida (4px) na cor do estado atual
- Velocidade exibida inline quando `driving` (ex: "72 km/h")
- Ícone animado para `idle` (pulso)

**Onde implementar**: `src/main/DeviceRow.jsx`, `src/components/FloatingDeviceList.jsx`

---

### E5 · Cluster do mapa — breakdown visual por estado
**Prioridade**: Média | **Esforço**: ~1 dia

No popup ao hover do cluster, adicionar um mini resumo:
- "3 em movimento · 2 online · 1 offline"
- Ou pequenos dots coloridos representando cada veículo

**Onde implementar**: `src/map/MapPositions.js` — função `createClusterPopupHTML()`

---

### E6 · Corrigir cores hardcoded para usar o tema MUI
**Prioridade**: Baixa | **Esforço**: ~3h

`FloatingStatusCard.jsx` usa cores hardcoded (`#3B82F6`, `#6B7280`, `#1F2937`, etc.) em vez de `theme.palette.*`. Em dark/light mode pode causar contraste ruim.

**Onde implementar**: `src/components/FloatingStatusCard.jsx` — substituir hex literals por referências ao tema

---

## Melhorias Funcionais

### F1 · Filtro rápido por estado na lista de veículos
**Prioridade**: Alta | **Esforço**: ~meio dia

Botões de filtro rápido no topo da lista:

```
[ Todos ] [ Em movimento ] [ Online ] [ Idle ] [ Offline ]
   47          12              18         8        9
```

Com contadores ao vivo que atualizam conforme o estado dos dispositivos muda via WebSocket.

**Onde implementar**: `src/components/FloatingDeviceList.jsx` — adicionar filtro por estado antes do filtro de busca

---

### F2 · Painel de resumo da frota em tempo real
**Prioridade**: Alta | **Esforço**: ~1 dia

Widget colapsável (ou barra superior) mostrando:
- Total online / offline / em movimento / idle
- Alertas ativos no momento
- KM percorridos hoje pela frota (soma)

**Onde implementar**: Novo componente `src/components/FleetSummaryBar.jsx`, integrar em `src/main/MainPage.jsx`

---

### F3 · Notificações browser (Push API)
**Prioridade**: Alta | **Esforço**: ~1 dia

Usar a Web Push Notification API para notificar utilizadores com o tab em background quando houver alarme. O sistema já recebe eventos via WebSocket — falta apenas disparar `new Notification(...)` após `Notification.requestPermission()`.

**Onde implementar**: `src/SocketController.jsx` — interceptar eventos de alarme e disparar notificação nativa

---

### F4 · Cores dinâmicas no replay de trajetos
**Prioridade**: Média | **Esforço**: ~1 dia

Durante o replay, o ícone do veículo muda de cor conforme os dados de cada posição histórica:
- Verde se `speed > 0.5`
- Amarelo se `ignition === true && speed === 0`
- Azul se online parado

Usar a mesma lógica de estado já implementada em `MapPositions.js`.

**Onde implementar**: `src/other/ReplayPage.jsx`, `src/map/MapPositions.js` — passar `showStatus: true` também no modo replay

---

### F5 · Exportação CSV da lista filtrada
**Prioridade**: Média | **Esforço**: ~3h

Botão "Exportar CSV" na `FloatingDeviceList` que exporta os veículos com os filtros ativos:
- Campos: nome, placa, status, última posição (lat/lon), velocidade, última comunicação

**Onde implementar**: `src/components/FloatingDeviceList.jsx` — adicionar botão no header da lista

---

### F6 · Aviso de expiração de sessão
**Prioridade**: Média | **Esforço**: ~2h

Quando a sessão está prestes a expirar, mostrar modal:
> "A sua sessão irá expirar em 5 minutos. Deseja continuar?"

Evita que o utilizador perca trabalho não guardado ou seja redirecionado sem aviso.

**Onde implementar**: `src/SocketController.jsx` ou `src/middleware/authMiddleware.js`

---

### F7 · Busca global melhorada
**Prioridade**: Baixa | **Esforço**: ~1 dia

A busca atual filtra apenas por nome/placa visível. Melhorar para:
- Buscar por motorista associado
- Buscar por grupo
- Buscar por endereço atual do veículo
- Resultados agrupados por categoria

**Onde implementar**: `src/main/MainToolbar.jsx`, `src/main/useFilter.js`

---

## Dívida Técnica

### T1 · Remover console.log de produção
**Prioridade**: Alta | **Esforço**: ~2h

Ficheiros com logs de debug expostos em produção:
- `src/routes/gestaoRoutes.js` (~20 logs com dados de requisição)
- `src/routes/vehiclesRoutes.js` (~5 logs)
- `src/other/gestao/hooks/useGestaoData.js` (logs com emoji 🔍)
- `src/main/MainPage.jsx` (~15 console.error)

**Ação**: Remover ou substituir por um logger condicional (`if (import.meta.env.DEV) console.log(...)`)

---

### T2 · Dividir FloatingStatusCard.jsx
**Prioridade**: Alta | **Esforço**: ~2 dias

Com 10.822 linhas é o maior risco de regressão do projeto. Qualquer mudança neste ficheiro pode partir funcionalidades não relacionadas.

Divisão sugerida:
```
FloatingStatusCard/
├── index.jsx              (~200 linhas — shell + tabs)
├── StatusInfoTab.jsx      (~800 linhas — info, endereço, comandos)
├── SensorsTab.jsx         (~600 linhas — telemetria, gráficos)
├── MediaTab.jsx           (~400 linhas — vídeo, fotos)
├── AlarmsTab.jsx          (~300 linhas — histórico de alarmes)
└── hooks/
    └── useStatusCard.js   (~200 linhas — lógica partilhada)
```

---

### T3 · Decompor MainPage.jsx
**Prioridade**: Alta | **Esforço**: ~3 dias

Com 5.055 linhas e 64 `useState`, qualquer mudança pode ter side effects inesperados. O props drilling para ~20 componentes `Floating*` dificulta rastrear o fluxo de dados.

**Ação sugerida**:
1. Criar `MainPageContext` para o estado dos painéis (aberto/fechado)
2. Mover a lógica de cada popover para dentro do próprio componente
3. Reduzir MainPage para ~800 linhas (layout + orquestração)

---

### T4 · Code splitting dos painéis flutuantes
**Prioridade**: Média | **Esforço**: ~1 dia

Os ~20 painéis `Floating*` são todos carregados no bundle inicial mesmo que nunca sejam abertos. Usar `React.lazy()` + `Suspense` reduziria o tempo de carregamento inicial.

**Onde implementar**: `src/main/MainPage.jsx` — converter imports estáticos em `lazy(() => import(...))`

---

### T5 · Otimizar re-renders em MapPositions
**Prioridade**: Média | **Esforço**: ~3h

`createFeature()` é recriado a cada render. Com muitos veículos, isso é custoso.

**Ação**: Envolver `features` e `selectedFeatures` em `useMemo` com dependências precisas.

**Onde implementar**: `src/map/MapPositions.js` — linhas 825-885

---

## Ordem de Implementação Sugerida

Para máximo impacto com mínimo esforço:

| # | Item | Tempo | Impacto |
|---|------|-------|---------|
| 1 | E1 — Legenda de estados | 2h | Alto visual |
| 2 | F1 — Filtro por estado na lista | 4h | Alto funcional |
| 3 | E2 — Animação idle/offline | 2h | Médio visual |
| 4 | E3 — Popup do mapa melhorado | 1 dia | Alto usabilidade |
| 5 | F3 — Notificações browser | 1 dia | Alto operacional |
| 6 | T1 — Remover console.logs | 2h | Segurança |
| 7 | F2 — Painel resumo frota | 1 dia | Alto funcional |
| 8 | F5 — Exportar CSV | 3h | Médio funcional |
| 9 | T2 — Dividir StatusCard | 2 dias | Estabilidade |
| 10 | T3 — Decompor MainPage | 3 dias | Manutenibilidade |
