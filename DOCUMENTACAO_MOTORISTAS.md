# Documentação: Módulo de Gestão de Motoristas

Este documento descreve o funcionamento da página de Motoristas no sistema de Gestão de Frota e o processo de cadastro de novos condutores.

## 1. Visão Geral da Página
A página de **Gestão Operacional de Motoristas** é o centro de controle para todos os condutores da frota. Ela permite visualizar, editar, excluir e configurar como cada motorista interage com o sistema e com os veículos.

### Componentes Principais:
*   **Dashboard de Associação**: Exibe um resumo das sincronizações e status das associações.
*   **Configuração de Sincronização Agendada**: Permite definir horários automáticos para atualizar os dados com o servidor Traccar.
*   **Lista de Motoristas**: Uma tabela contendo as informações essenciais de cada condutor.
*   **Histórico de Associações**: Registro detalhado de quem dirigiu qual veículo e em qual período.

---

## 2. Funcionalidades da Tabela de Motoristas

Para cada motorista na lista, o administrador tem acesso às seguintes colunas e ações:

*   **Nome e Usuário**: Identificação básica do motorista no sistema.
*   **CPF**: Documento de identificação formatado.
*   **Tipo de Associação**:
    *   **Manual**: O motorista é vinculado ao veículo manualmente pelo sistema.
    *   **Automático**: O sistema identifica o motorista via iButton, RFID ou Cartão de Condutor.
*   **Veículos Associados**: Quantidade de veículos que o motorista tem permissão para operar.
*   **Ações de Gestão (Ícones)**:
    *   ✅ **Completar Cadastro**: Aparece para motoristas que foram importados mas possuem dados faltantes.
    *   🔄 **Configurar Associação**: Define as regras de identificação (ID do cartão/tag).
    *   🚗 **Gerenciar Veículos**: Abre uma lista para selecionar quais carros o motorista pode acessar.
    *   📝 **Editar Dados**: Altera informações como CNH, Telefone e Categoria.

---

## 3. Processo de Cadastro de Novo Motorista

O cadastro é realizado através do botão **"Novo Motorista"**. O sistema segue um fluxo inteligente para garantir a integridade dos dados tanto no sistema de gestão quanto no rastreamento (Traccar).

### Passo a Passo do Cadastro:

1.  **Dados Pessoais**:
    *   **Nome Completo**: Nome do condutor.
    *   **CPF**: Validado em tempo real para garantir que o documento seja real e único.
2.  **Habilitação (CNH)**:
    *   **Número da CNH**: Validado automaticamente.
    *   **Categoria**: Seleção obrigatória (A, B, C, D, E, etc.).
    *   **Validade**: Data de vencimento para controle de renovação.
3.  **Acesso ao Sistema (Conta de Usuário)**:
    *   **Username**: Gerado automaticamente com base no nome (ex: "João Silva" vira "joao.silva"), mas pode ser editado.
    *   **Senha**: Mínimo de 6 caracteres.
    *   *Nota: Esta conta permite que o motorista utilize aplicativos mobile ou sistemas de login no veículo.*
4.  **Sincronização Automática**:
    *   Ao clicar em **"Cadastrar"**, o sistema tenta primeiro criar o motorista no servidor Traccar.
    *   Se o Traccar estiver offline, o cadastro é salvo localmente com o status **"Pendente"** para sincronização futura.

---

## 4. Dicas de Uso
*   **Sincronizar do Traccar**: Utilize este botão se você já cadastrou motoristas diretamente na plataforma de rastreamento e deseja importá-los para o módulo de gestão.
*   **Categorias de CNH**: Mantenha as categorias atualizadas para que o sistema possa alertar se um motorista tentar operar um veículo para o qual não está habilitado (em fases futuras).

