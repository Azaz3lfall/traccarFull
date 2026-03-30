Aqui estão os requisitos e o plano de execução:

1. Requisitos Funcionais
A. Gestão de Chips (Lista de Chips)
CRUD Completo: Cadastro de ICCID, Número (MSISDN), Operadora (Claro, Algar, etc.), Plano de Dados (MBytes) e Status (Ativo/Inativo).

Controle Financeiro: Campo para valor do custo mensal do chip.

Vínculo com Dispositivo: (Opcional, mas recomendado) Associar um chip cadastrado a um deviceId específico do Traccar.

Importação em Lote: Botão "Cadastro em Lote" (via CSV/Excel) como mostra o print.

B. Gestão de SMS e Templates
Repositório de Templates: Criar mensagens pré-definidas com placeholders (ex: Bloquear carro: #SEU_PIN#,1).

Histórico de Envios: Log de quem enviou, para qual número, o conteúdo da mensagem, data/hora e o status de entrega.

Integração com Gateway: Conectar com uma API de SMS (como Twilio, Zenvia, Infobip ou um modem local via Gammu).

C. Integração com Interface Traccar
Botão na Aba Devices: Um novo ícone ou opção no menu "Ações" de cada veículo que abra o Modal de envio.

Auto-preenchimento: O modal deve puxar automaticamente o número do chip vinculado àquele dispositivo.

2. Arquitetura Técnica Sugerida
Para manter a performance e não "quebrar" o Traccar original em futuras atualizações:

Backend (Node.js + PostgreSQL)
Banco de Dados: Crie novas tabelas no seu PostgreSQL (sim_cards, sms_templates, sms_history).

API: Desenvolva endpoints REST para gerenciar essas tabelas.

Webhooks: Se o seu Gateway de SMS permitir, configure um webhook para atualizar o status do SMS (Enviado -> Entregue) em tempo real.

Frontend (React)
Painel Administrativo: Uma página dedicada para a "Lista de Chips" e "Templates".

Customização do Traccar Web: * Você precisará modificar o código do traccar-web (se estiver usando a versão moderna em React).

Injete um componente de botão no DeviceView que dispare o seu modal customizado.

3. Ideias para Execução e Diferenciais
O "Pulo do Gato" na Integração
Em vez de apenas enviar o SMS, você pode fazer o sistema identificar o protocolo do rastreador.

Exemplo: Se o dispositivo for um Suntech, o template de "Bloqueio" já carrega o comando ST300CMD.... Se for um Coban, carrega stop123456. Isso torna o sistema inteligente.

Gateway de Custo Zero (Android)
Se você não quiser pagar APIs caras de SMS (Twilio), você pode criar um pequeno App Android (ou usar um pronto) que transforma um celular comum com chip ilimitado em um gateway de SMS que recebe comandos via HTTP da sua aplicação Node.js.

Auditoria e Logs
Como você tem cinco filhos e provavelmente um dia a dia corrido, o "Histórico de SMS" é seu melhor amigo. Garanta que ele mostre qual usuário do sistema disparou o comando, para evitar bloqueios acidentais e ter controle total.

Estrutura do BD gestao_telecom:
postgres=# CREATE DATABASE gestao_telecom;
CREATE DATABASE
postgres=# CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nivel_acesso VARCHAR(20) DEFAULT 'OPERADOR', -- ADMIN, OPERADOR
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE
postgres=# CREATE TABLE sms_gateways (
    id SERIAL PRIMARY KEY,
    nome_provedor VARCHAR(50) NOT NULL, -- Ex: "Twilio", "Modem_Android"
    api_key TEXT,
    api_secret TEXT,
    url_endpoint TEXT,
    ativo BOOLEAN DEFAULT TRUE
);
CREATE TABLE
postgres=# CREATE TABLE chips (
    id SERIAL PRIMARY KEY,
    codigo_referencia INTEGER,
    broker VARCHAR(50),
    operadora VARCHAR(30) NOT NULL,
    numero VARCHAR(20) UNIQUE NOT NULL,
    iccid VARCHAR(25) UNIQUE NOT NULL,
    valor_custo DECIMAL(10, 2) DEFAULT 0.00,
    mbytes_plano INTEGER DEFAULT 20,
    status VARCHAR(20) DEFAULT 'ATIVO', -- ATIVO, INATIVO, TESTE
    traccar_device_id INTEGER, -- Apenas o ID para referência cruzada via código
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE
postgres=# CREATE TABLE sms_templates (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    tags_disponiveis VARCHAR(255), -- Ex: "{{nome}}, {{placa}}"
    criado_por INTEGER REFERENCES usuarios(id)
);
CREATE TABLE
postgres=# CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    chip_id INTEGER REFERENCES chips(id),
    numero_destino VARCHAR(20) NOT NULL,
    mensagem_corpo TEXT NOT NULL,
    status_entrega VARCHAR(20) DEFAULT 'PENDENTE', -- SUCESSO, ERRO, PENDENTE
    erro_mensagem TEXT,
    referencia_externa_id VARCHAR(100) -- ID que a API de SMS retorna
);
CREATE TABLE
postgres=# \l
                                     List of databases
      Name      |    Owner    | Encoding | Collate |  Ctype  |      Access privileges      
----------------+-------------+----------+---------+---------+-----------------------------
 fleet_core     | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =Tc/postgres               +
                |             |          |         |         | postgres=CTc/postgres      +
                |             |          |         |         | gestao=c/postgres
 gestao_frota   | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =Tc/postgres               +
                |             |          |         |         | postgres=CTc/postgres      +
                |             |          |         |         | gestao=CTc/postgres
 gestao_telecom | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | 
 ossys          | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =Tc/postgres               +
                |             |          |         |         | postgres=CTc/postgres      +
                |             |          |         |         | os_user=CTc/postgres
 postgres       | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | 
 template0      | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =c/postgres                +
                |             |          |         |         | postgres=CTc/postgres
 template1      | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =c/postgres                +
                |             |          |         |         | postgres=CTc/postgres
 traccar        | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | =Tc/postgres               +
                |             |          |         |         | postgres=CTc/postgres      +
                |             |          |         |         | traccaruser=CTc/postgres
 traccar_os     | postgres    | UTF8     | C.UTF-8 | C.UTF-8 | 
 traccarnew     | traccaruser | UTF8     | C.UTF-8 | C.UTF-8 | 
 traccarrenew   | traccaruser | UTF8     | C.UTF-8 | C.UTF-8 | =Tc/traccaruser            +
                |             |          |         |         | traccaruser=CTc/traccaruser
(11 rows)

postgres=# 
