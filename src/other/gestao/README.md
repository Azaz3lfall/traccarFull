# Módulo de Gestão de Frota

Este módulo contém a implementação modularizada da página de gestão de frota do sistema Traccar.

## Estrutura

```
gestao/
├── components/           # Componentes React modulares
│   ├── TripsTab.jsx     # Aba de viagens
│   ├── DriversTab.jsx   # Aba de motoristas
│   ├── VehiclesTab.jsx  # Aba de veículos
│   ├── RefuelsTab.jsx   # Aba de abastecimentos
│   ├── ExtraCostsTab.jsx # Aba de custos extras
│   ├── ReportsTab.jsx   # Aba de relatórios de frota
│   ├── RefuelingReportsTab.jsx # Aba de relatórios de abastecimento
│   └── index.js         # Exportações dos componentes
├── hooks/               # Hooks customizados
│   ├── useGestaoData.js # Hook para dados principais
│   ├── useTrips.js      # Hook para operações de viagens
│   ├── useDrivers.js    # Hook para operações de motoristas
│   ├── useRefuels.js    # Hook para operações de abastecimentos
│   ├── useExtraCosts.js # Hook para operações de custos extras
│   └── index.js         # Exportações dos hooks
├── utils/               # Funções utilitárias
│   ├── formatters.js    # Funções de formatação
│   ├── exportUtils.js   # Funções de exportação
│   ├── apiUtils.js      # Funções de API
│   └── index.js         # Exportações das utilitárias
├── constants/           # Constantes e configurações
│   └── index.js         # Constantes do sistema
├── GestaoPageModular.jsx # Componente principal modularizado
├── index.js             # Exportações principais
└── README.md           # Este arquivo
```

## Componentes

### TripsTab
Gerencia viagens em aberto e histórico de viagens, incluindo:
- Formulário para iniciar nova viagem
- Lista de viagens em andamento
- Histórico de viagens finalizadas
- Modais para finalizar/cancelar viagens

### DriversTab
Gerencia motoristas da frota, incluindo:
- Formulário para adicionar novo motorista
- Lista de motoristas cadastrados
- Edição e exclusão de motoristas
- Validação de dados

### VehiclesTab
Gerencia veículos da frota, incluindo:
- Sincronização com o Traccar
- Lista de veículos
- Edição de informações dos veículos

### RefuelsTab
Gerencia abastecimentos, incluindo:
- Formulário para registrar abastecimento
- Histórico de abastecimentos
- Upload de fotos
- Edição e exclusão de registros

### ExtraCostsTab
Gerencia custos extras, incluindo:
- Formulário para registrar custo extra
- Lista de custos por categoria
- Edição e exclusão de registros

### ReportsTab
Gera relatórios de frota, incluindo:
- Filtros por período e veículo
- Gráficos de consumo
- Tabelas de dados
- Exportação em diferentes formatos

### RefuelingReportsTab
Gera relatórios de abastecimento, incluindo:
- Filtros avançados
- Análise de consumo
- Relatórios de custos
- Exportação de dados

## Hooks

### useGestaoData
Hook principal que gerencia todos os dados da gestão:
- Carregamento de veículos, motoristas, viagens, etc.
- Estados de loading e error
- Função de refresh dos dados

### useTrips
Hook para operações de viagens:
- Criação de novas viagens
- Finalização e cancelamento
- Gerenciamento de estados dos modais

### useDrivers
Hook para operações de motoristas:
- CRUD de motoristas
- Validação de dados
- Gerenciamento de usuários

### useRefuels
Hook para operações de abastecimentos:
- CRUD de abastecimentos
- Upload de arquivos
- Validação de dados

### useExtraCosts
Hook para operações de custos extras:
- CRUD de custos
- Categorização
- Validação de dados

## Utilitários

### formatters.js
Funções de formatação para:
- Moeda (formatCurrency)
- Data (formatDate)
- CPF, telefone, CNH
- Nomes de usuário

### exportUtils.js
Funções de exportação para:
- PDF (usando jsPDF)
- Excel (usando XLSX)
- CSV (usando Papa Parse)

### apiUtils.js
Funções para comunicação com a API:
- Requisições HTTP padronizadas
- CRUD para todas as entidades
- Tratamento de erros

## Constantes

### index.js
Constantes do sistema:
- URLs da API
- Configurações
- Opções de período
- Tipos de custo
- Categorias de CNH

## Uso

```jsx
import { GestaoPageModular } from './other/gestao';

// Usar o componente principal
<GestaoPageModular />
```

## Benefícios da Modularização

1. **Manutenibilidade**: Código organizado em módulos menores e específicos
2. **Reutilização**: Componentes e hooks podem ser reutilizados
3. **Testabilidade**: Cada módulo pode ser testado independentemente
4. **Escalabilidade**: Fácil adição de novas funcionalidades
5. **Legibilidade**: Código mais limpo e fácil de entender
6. **Separação de responsabilidades**: Cada arquivo tem uma responsabilidade específica

## Migração

A versão modularizada substitui o arquivo `GestaoPage.jsx` original, mantendo toda a funcionalidade mas com melhor organização e estrutura.
