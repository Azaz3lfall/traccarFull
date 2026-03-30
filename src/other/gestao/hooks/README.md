# Hooks Customizados - Sistema de Gestão de Frota

## 🎣 Hooks Reutilizáveis

Este diretório contém hooks customizados que encapsulam lógica comum e reduzem a duplicação de código.

### 🧩 Hooks Disponíveis

#### 1. **useReportExport.js**
- **Propósito**: Gerencia a lógica de exportação de relatórios
- **Funcionalidades**:
  - Exportação de relatórios de viagens
  - Exportação de relatórios de custos extras
  - Exportação de relatórios de consumo
  - Formatação automática de dados
  - Geração de nomes de arquivo únicos
- **Retorna**:
  - `getVehicleName`: Função para obter nome do veículo
  - `exportTripReport`: Exporta relatório de viagens
  - `exportExtraCostReport`: Exporta relatório de custos extras
  - `exportConsumptionReport`: Exporta relatório de consumo
  - `exportSpecificReport`: Exporta relatório baseado no tipo

#### 2. **usePhotoModal.js**
- **Propósito**: Gerencia o estado do modal de visualização de fotos
- **Funcionalidades**:
  - Controle de abertura/fechamento do modal
  - Armazenamento da foto selecionada
  - Limpeza automática do estado
- **Retorna**:
  - `photoModalOpen`: Estado de abertura do modal
  - `selectedPhoto`: Caminho da foto selecionada
  - `handleOpenPhotoModal`: Função para abrir o modal
  - `handleClosePhotoModal`: Função para fechar o modal

### 🎯 Benefícios dos Hooks

1. **Separação de Responsabilidades**: Lógica de negócio separada da UI
2. **Reutilização**: Hooks podem ser usados em múltiplos componentes
3. **Testabilidade**: Lógica isolada é mais fácil de testar
4. **Manutenibilidade**: Mudanças centralizadas em um local
5. **Performance**: Uso de `useCallback` para otimização

### 📊 Estatísticas de Refatoração

- **Funções consolidadas**: 6
- **Linhas de código reduzidas**: ~200
- **Hooks criados**: 2
- **Reutilização**: 100% dos hooks são reutilizáveis

### 🔧 Como Usar

```jsx
// Exemplo de uso do useReportExport
const { exportSpecificReport } = useReportExport(vehicles);

const handleExport = (type, format) => {
  const data = getDataByType(type);
  exportSpecificReport(type, data, format);
};

// Exemplo de uso do usePhotoModal
const { 
  photoModalOpen, 
  selectedPhoto, 
  handleOpenPhotoModal, 
  handleClosePhotoModal 
} = usePhotoModal();

// No JSX
<Button onClick={() => handleOpenPhotoModal(photoPath)}>
  Ver Foto
</Button>
```

### 🚀 Próximos Passos

- [ ] Adicionar testes unitários para os hooks
- [ ] Implementar cache para dados de exportação
- [ ] Adicionar suporte a múltiplos formatos de exportação
- [ ] Criar hook para gerenciamento de filtros
- [ ] Implementar hook para paginação de tabelas




