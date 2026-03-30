# Troubleshooting: SMS e Reset de Simcard (500 Internal Server Error)

## Erros comuns e soluções

### 1. "A chave de acesso informada é inválida e não pode efetuar uma requisição na API"

**Causa:** A chave da API Comtele (`COMTELE_API_KEY`) está inválida, expirada ou o backend não recarregou o `.env`.

**Solução:**
- Acesse o painel da Comtele (https://sms.comtele.com.br) e gere uma nova chave de API
- Atualize o arquivo `.env` na raiz do projeto:
  ```
  COMTELE_API_KEY=sua-nova-chave-aqui
  ```
- **IMPORTANTE:** Reinicie o backend de Gestão (porta 3666). O `.env` é carregado apenas na inicialização — alterações não têm efeito até reiniciar.
  - Se usa `yarn start`: pare (Ctrl+C) e execute `yarn start` novamente.
  - Se usa PM2 ou systemd: reinicie o serviço correspondente.

### 2. "Cannot POST /gestao/telecom/sms/reset" ou "Rota não encontrada"

**Causa:** O backend de Gestão não está acessível ou as rotas não estão configuradas.

**Soluções:**

1. **Se o backend Gestão está em outro host:** Configure no `.env`:
   ```
   VITE_GESTAO_API_URL=https://seu-backend-gestao.com
   ```
   Rebuild o frontend após alterar.

2. **Verificar se o backend está rodando:**
   ```bash
   cd src/addons/gestao_backend
   node server.js
   # ou: GESTAO_PORT=3666 node server.js
   ```

3. **Verificar o proxy nginx:**
   - O nginx deve incluir o arquivo `nginx-gestao-proxy.conf`
   - O bloco `location /gestao` deve fazer proxy para `http://127.0.0.1:3666`
   - Exemplo no server block:
     ```nginx
     include /caminho/para/traccar-custom/nginx-gestao-proxy.conf;
     ```

4. **Verificar DATABASE_TELECOM_URL:**
   - O módulo Telecom precisa do banco `gestao_telecom`
   - No `.env`:
     ```
     DATABASE_TELECOM_URL=postgres://user:pass@localhost:5432/gestao_telecom
     ```

### 3. "Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL"

**Causa:** O pool do banco de dados Telecom não foi inicializado.

**Solução:**
- Configure `DATABASE_TELECOM_URL` no `.env`
- Execute o script de criação das tabelas: `scripts/gestao_telecom_schema.sql`
- Reinicie o backend

### 4. Erro 500 ao enviar via Voxter

**Causa:** Credenciais Voxter inválidas ou token expirado.

**Solução:**
- Verifique no `.env`:
  ```
  VOXTER_EMAIL=seu-email
  VOXTER_PASSWORD=sua-senha
  VOXTER_ACCESS_TOKEN=seu-token
  ```
- O token de acesso pode precisar ser renovado no painel Lara Voxter
- **Verificar credenciais:** execute o script de diagnóstico:
  ```bash
  node src/addons/telecom/scripts/verifyVoxterCredentials.js
  ```

## Diferenciação de operadoras (SMS)

| Operadora | Gateway SMS |
|-----------|-------------|
| Emnify    | Voxter      |
| Demais (Claro, Algar, Vivo, etc.) | Comtele |

O chip é identificado pela coluna `operadora` na tabela `chips`. Se a operadora for `N/A` ou o chip não existir, o sistema consulta a Voxter para verificar se o número está lá (Emnify); se estiver, usa Voxter e atualiza o chip automaticamente. Caso contrário, usa Comtele.

## 5. Configurar credenciais pelo painel (sem reiniciar)

Desde a versão com suporte a `sms_gateway_config`, é possível configurar as credenciais (Comtele e Voxter) diretamente no painel SMS:

1. Acesse **Configurações > Painel SMS** (como administrador)
2. Aba **Credenciais dos Gateways**
3. Preencha e salve — as alterações entram em vigor imediatamente

**Pré-requisito:** execute a migration para criar a tabela:
```bash
psql -U postgres -d gestao_telecom -f scripts/gestao_telecom_gateway_config.sql
```

## Checklist de configuração

- [ ] Backend de Gestão rodando na porta 3666
- [ ] Nginx configurado com proxy para /gestao
- [ ] DATABASE_TELECOM_URL configurado
- [ ] Tabelas gestao_telecom criadas (chips, sms_logs, etc.)
- [ ] COMTELE_API_KEY válida (para chips não-Emnify)
- [ ] VOXTER_* configurados (para chips Emnify)
