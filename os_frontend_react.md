# Guia de Implementação: Frontend React (Gestão Administrativa)

Este documento detalha como integrar o Painel Administrativo em React com o backend do OSSys.

## 1. Configuração Inicial
*   **Base URL:** `http://localhost:3888`
*   **Biblioteca Recomendada:** Axios para requisições HTTP.

## 2. Fluxos Principais

### A. Dashboard
*   **Ação:** Listar todas as OS para contadores.
*   **Endpoint:** `GET /os-api/work-orders`
*   **Dica:** Filtre no frontend para exibir totais de "PENDING", "IN_PROGRESS" e "COMPLETED".

### B. Gestão de Técnicos
*   **Listagem:** `GET /traccar-api/users`
    *   Exibe todos os usuários do Traccar.
    *   Use o campo `is_technician` para mostrar um toggle/checkbox.
*   **Ação Toggle:** `POST /traccar-api/toggle-technician`
    *   Payload: `{ "traccar_user_id": ID, "status": true/false }`

### C. Criação de Ordem de Serviço
*   **Select de Clientes:** Use `GET /traccar-api/users` para popular a lista de clientes.
*   **Select de Técnicos:** Use `GET /traccar-api/users` filtrando apenas onde `is_technician === true`.
*   **Envio:** `POST /os-api/work-orders`
    *   Campos: `customer_id`, `technician_id`, `type`, `description`, `vehicle_plate`, `vehicle_model`.

### D. Visualização de Detalhes
*   **Endpoint:** `GET /os-api/work-orders/:id`
*   **Exibição:** Mostra os dados da OS, o Checklist JSON formatado e uma galeria com as imagens retornadas em `attachments`.
*   **Imagens:** As imagens podem ser acessadas via `http://localhost:3888/os-uploads/os_ID/nome_arquivo.jpg`.

## 3. Sugestões de UI/UX
*   Use **Tailwind CSS** para um design moderno e responsivo.
*   Implemente **Lucide React** para ícones.
*   Use **React Router** para navegação entre Dashboard, Lista de OS e Gestão de Usuários.

