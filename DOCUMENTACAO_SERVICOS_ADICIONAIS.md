# Documentação dos Serviços Adicionais

Este documento detalha todos os serviços adicionais do sistema Traccar Custom, incluindo suas APIs, configurações e funcionalidades.

---

## 📋 Índice

1. [JTT Server](#jtt-server)
2. [Reseller Server](#reseller-server)
3. [Gestão Backend](#gestão-backend)
4. [OS Backend](#os-backend)

---

## 🚀 JTT Server

### Visão Geral

O **JTT Server** é um servidor Node.js que processa mensagens do protocolo GPS JTT, especialmente para dispositivos que enviam arquivos de mídia (vídeos, fotos) via FTP ou HTTP.

**Localização:** `src/addons/jtt-server/jtt-server.mjs`  
**Porta:** `3334`  
**Protocolo:** HTTP/HTTPS

### Configuração

```javascript
// Configurações principais
const MEDIA_SERVER = 'https://midia.rastreadorautoram.com.br';
const TRACCAR_SERVER_URL = 'http://rast.rastreadorautoram.com.br:5055';
const PORT = 3334;
```

### CORS

O servidor permite requisições de:
- `*.rastreadorautoram.com.br`
- `*.codeartisan.cloud`
- `192.168.*.*` (HTTP e HTTPS)

### Endpoints

#### 1. Download de Arquivo MP4 (com modelo de dispositivo)

**GET** `/:imei/:name/MP4/:deviceModel`

**Descrição:** Baixa arquivo MP4 específico de um dispositivo.

**Parâmetros:**
- `imei` (path): IMEI do dispositivo
- `name` (path): Nome do arquivo
- `deviceModel` (path): Modelo do dispositivo

**Resposta:**
- `200`: Arquivo MP4
- `404`: Arquivo não encontrado
- `500`: Erro no servidor

**Exemplo:**
```bash
GET /123456789012345/VIDEO001/MP4/JT701
```

---

#### 2. Download de Arquivo MP4 (sem modelo)

**GET** `/:imei/:name/MP4`

**Descrição:** Baixa arquivo MP4 sem especificar modelo.

**Parâmetros:**
- `imei` (path): IMEI do dispositivo
- `name` (path): Nome do arquivo

**Resposta:**
- `200`: Arquivo MP4
- `404`: Arquivo não encontrado

---

#### 3. Download de Arquivo (com modelo)

**GET** `/:imei/:name/:deviceModel`

**Descrição:** Baixa arquivo genérico com modelo especificado.

**Parâmetros:**
- `imei` (path): IMEI do dispositivo
- `name` (path): Nome do arquivo
- `deviceModel` (path): Modelo do dispositivo

**Resposta:**
- `200`: Arquivo solicitado
- `404`: Arquivo não encontrado

---

#### 4. Download de Arquivo (sem modelo)

**GET** `/:imei/:name`

**Descrição:** Baixa arquivo genérico sem especificar modelo.

**Parâmetros:**
- `imei` (path): IMEI do dispositivo
- `name` (path): Nome do arquivo

**Resposta:**
- `200`: Arquivo solicitado
- `404`: Arquivo não encontrado

---

#### 5. Upload via FTP

**POST** `/ftpupload`

**Descrição:** Recebe upload de arquivos via FTP de dispositivos GPS.

**Body:** Dados binários do arquivo

**Headers:**
- `Content-Type`: Tipo do arquivo
- `Content-Length`: Tamanho do arquivo

**Processamento:**
- Valida arquivo com FFmpeg (para vídeos)
- Verifica estabilidade do arquivo
- Move para diretório apropriado
- Envia para servidor de mídia

**Resposta:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "filePath": "/path/to/file"
}
```

---

#### 6. Listar Arquivos

**POST** `/getFileList`

**Descrição:** Lista arquivos disponíveis para um dispositivo.

**Body:**
```json
{
  "imei": "123456789012345",
  "deviceModel": "JT701"
}
```

**Resposta:**
```json
{
  "files": [
    {
      "name": "VIDEO001.mp4",
      "size": 1024000,
      "date": "2025-01-22T10:30:00Z"
    }
  ]
}
```

---

#### 7. Push GPS/HB

**POST** `/pushURL/pushgps` ou `/pushURL/pushhb`

**Descrição:** Recebe dados de GPS ou heartbeat do dispositivo.

**Body:** Dados do protocolo JTT

**Processamento:**
- Processa dados GPS
- Envia para Traccar Server
- Atualiza posição do dispositivo

---

#### 8. Push FTP File Upload / Resource List

**POST** `/pushURL/pushftpfileupload` ou `/pushURL/pushresourcelist`

**Descrição:** Recebe notificações de upload de arquivo ou lista de recursos.

**Body:** Dados do protocolo JTT

**Processamento:**
- Processa lista de arquivos
- Atualiza cache de arquivos disponíveis
- Resolve requisições pendentes de lista de arquivos

---

### Funcionalidades Especiais

#### Validação de Vídeos com FFmpeg

O servidor valida arquivos de vídeo usando FFmpeg para detectar corrupção:

```javascript
async function testVideoFile(videoPath) {
  // Extrai frame de teste
  // Detecta truncamento ou corrupção
  // Retorna status de validação
}
```

**Indicadores de corrupção detectados:**
- "Truncated VUI"
- "Invalid data"
- "Error while decoding"
- "Corrupt"
- "Moov atom not found"

#### Sistema de Estabilização de Arquivos

O servidor aguarda arquivos estabilizarem antes de processar:

```javascript
async function waitForFileStable(filePath, maxWaitMs = 5000) {
  // Verifica tamanho e modificação
  // Aguarda estabilização
  // Retorna quando arquivo está pronto
}
```

#### Verificação de Tamanho de Arquivo

Sistema de verificação periódica (30 verificações, 30s entre cada):

```javascript
async function checkFileSize(filePath) {
  // Verifica tamanho até 30 vezes
  // Considera estável após 4 verificações consecutivas
  // Remove arquivos que continuam crescendo
}
```

---

## 🏢 Reseller Server

### Visão Geral

O **Reseller Server** é um servidor Node.js completo para gerenciamento de revendedores e construção de aplicativos mobile Flutter customizados com branding.

**Localização:** `src/addons/reseller/resellersServer.mjs`  
**Porta:** `3333` (padrão, configurável via `PORT`)  
**Protocolo:** HTTP/HTTPS

### Configuração

#### Variáveis de Ambiente

```bash
FLUTTER_ROOT=/opt/flutter          # Caminho do Flutter SDK
ANDROID_HOME=/root/Android          # Caminho do Android SDK
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Caminho do Java
PORT=3333                          # Porta do servidor (opcional)
```

#### Diretórios

```javascript
const DATA_DIR = '/opt/addons/resellers/data';
const IMAGES_DIR = path.join(DATA_DIR, 'images');
```

#### Proxy Nginx (produção)

Quando o frontend é servido em um domínio (ex.: `rast.rastreadorautoram.com.br`) e o Reseller Server roda em outra porta ou host, as requisições para `/api/resellers/*` precisam ser encaminhadas via proxy reverso. Use o snippet em `nginx-resellers-proxy.conf` na raiz do projeto:

```nginx
include /caminho/para/traccar-custom/nginx-resellers-proxy.conf;
```

O arquivo inclui `location` para: `/api/resellers`, `/api/upload`, `/api/domain-lookup`, `/api/reseller-logo`, `/api/reseller-check` e `/api/check-domain`. Por padrão encaminha para `http://127.0.0.1:3333`; se o servidor rodar em outro host, altere `proxy_pass` no arquivo.

### Endpoints

#### 1. Health Check

**GET** `/health`

**Descrição:** Verifica status do servidor.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-22T10:30:00Z"
}
```

---

#### 2. Listar Revendedores

**GET** `/api/resellers`

**Descrição:** Lista todos os revendedores cadastrados.

**Resposta:**
```json
[
  {
    "id": 1,
    "app_url": "revendedor1.rastreadorautoram.com.br",
    "parent_user_id": 123,
    "name": "Revendedor 1",
    "logo_url": "/api/reseller-logo?appUrl=revendedor1",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

#### 3. Criar Revendedor

**POST** `/api/resellers`

**Descrição:** Cria um novo revendedor.

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `app_url` (string): URL do aplicativo (ex: `revendedor1.rastreadorautoram.com.br`)
- `parent_user_id` (number): ID do usuário pai no Traccar
- `name` (string): Nome do revendedor
- `logo` (file, opcional): Arquivo de logo (PNG, JPG, SVG)
- `package_name` (string, opcional): Nome do pacote Android
- `app_name` (string, opcional): Nome do aplicativo

**Resposta:**
```json
{
  "success": true,
  "reseller": {
    "id": 1,
    "app_url": "revendedor1.rastreadorautoram.com.br",
    "parent_user_id": 123,
    "name": "Revendedor 1"
  }
}
```

---

#### 4. Atualizar Revendedor

**PUT** `/api/resellers/:id`

**Descrição:** Atualiza informações de um revendedor.

**Content-Type:** `multipart/form-data`

**Parâmetros:**
- `id` (path): ID do revendedor

**Body (Form Data):**
- `app_url` (string, opcional)
- `name` (string, opcional)
- `logo` (file, opcional)
- `package_name` (string, opcional)
- `app_name` (string, opcional)

**Resposta:**
```json
{
  "success": true,
  "reseller": { ... }
}
```

---

#### 5. Deletar Revendedor

**POST** `/api/resellers/delete`

**Descrição:** Deleta um revendedor.

**Body:**
```json
{
  "id": 1
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Revendedor deletado com sucesso"
}
```

---

#### 6. Construir Aplicativo

**POST** `/api/resellers/build`

**Descrição:** Inicia processo de build de aplicativo Flutter para um revendedor.

**Body:**
```json
{
  "reseller_id": 1,
  "platform": "android",  // "android" ou "ios"
  "build_type": "release"  // "debug" ou "release"
}
```

**Resposta:**
```json
{
  "success": true,
  "build_id": "build_1234567890",
  "message": "Build iniciado",
  "app_url": "revendedor1.rastreadorautoram.com.br"
}
```

**Processo de Build:**
1. Clona/copia projeto Flutter base
2. Aplica branding (logo, cores, nome)
3. Configura package name e app name
4. Executa `flutter build apk` ou `flutter build ipa`
5. Salva APK/IPA no diretório de builds
6. Atualiza status do build

---

#### 7. Status do Build

**GET** `/api/resellers/build/status/:appUrl`

**Descrição:** Verifica status de um build em andamento.

**Parâmetros:**
- `appUrl` (path): URL do aplicativo

**Resposta:**
```json
{
  "status": "building",  // "building", "completed", "failed"
  "progress": 50,
  "message": "Compilando aplicativo...",
  "build_id": "build_1234567890"
}
```

**Status possíveis:**
- `building`: Build em andamento
- `completed`: Build concluído com sucesso
- `failed`: Build falhou

---

#### 8. Download do Aplicativo

**GET** `/api/resellers/download`

**Descrição:** Baixa arquivo APK/IPA construído.

**Query Parameters:**
- `appUrl`: URL do aplicativo
- `platform`: `android` ou `ios`
- `build_type`: `debug` ou `release`

**Resposta:**
- `200`: Arquivo APK/IPA
- `404`: Arquivo não encontrado

---

#### 9. Verificar Domínio

**POST** `/api/check-domain`

**Descrição:** Verifica se um domínio está propagado corretamente.

**Body:**
```json
{
  "domain": "revendedor1.rastreadorautoram.com.br"
}
```

**Resposta:**
```json
{
  "success": true,
  "domain": "revendedor1.rastreadorautoram.com.br",
  "ipAddress": "192.168.1.100",
  "message": "Domain is properly propagated"
}
```

---

#### 10. Upload de Logo

**POST** `/api/upload`

**Descrição:** Faz upload de logo de revendedor.

**Content-Type:** `multipart/form-data`

**Body:**
- `image` (file): Arquivo de imagem (PNG, JPG, SVG)

**Resposta:**
```json
{
  "success": true,
  "url": "/api/reseller-logo?appUrl=revendedor1&hash=abc123"
}
```

---

#### 11. Obter Logo

**GET** `/api/reseller-logo`

**Descrição:** Retorna logo de um revendedor.

**Query Parameters:**
- `appUrl`: URL do aplicativo
- `hash` (opcional): Hash para cache busting

**Resposta:**
- `200`: Imagem do logo
- `404`: Logo não encontrado

---

#### 12. Logs de Build

**POST** `/api/resellers/logs`

**Descrição:** Obtém logs de build de um revendedor.

**Body:**
```json
{
  "app_url": "revendedor1.rastreadorautoram.com.br",
  "limit": 50
}
```

**Resposta:**
```json
{
  "logs": [
    {
      "timestamp": "2025-01-22T10:30:00Z",
      "level": "info",
      "message": "Build iniciado"
    }
  ]
}
```

---

#### 13. Deletar Logs

**POST** `/api/resellers/logs/delete`

**Descrição:** Deleta logs antigos.

**Body:**
```json
{
  "app_url": "revendedor1.rastreadorautoram.com.br",
  "days": 30
}
```

**Resposta:**
```json
{
  "success": true,
  "deleted": 150
}
```

---

#### 14. Limpar Aplicativos Antigos

**POST** `/api/resellers/clean-apps`

**Descrição:** Remove builds antigos para liberar espaço.

**Body:**
```json
{
  "days": 30  // Remover builds mais antigos que X dias
}
```

**Resposta:**
```json
{
  "success": true,
  "deleted": 10,
  "freedSpace": "2.5 GB"
}
```

---

#### 15. Atualizar Configurações Nginx

**POST** `/api/nginx/update-configs`

**Descrição:** Atualiza configurações do Nginx para todos os revendedores.

**Resposta:**
```json
{
  "success": true,
  "updated": 5,
  "message": "Configurações Nginx atualizadas"
}
```

---

#### 16. Verificar Revendedor

**POST** `/api/reseller-check`

**Descrição:** Verifica se um revendedor existe e está ativo.

**Body:**
```json
{
  "app_url": "revendedor1.rastreadorautoram.com.br"
}
```

**Resposta:**
```json
{
  "exists": true,
  "active": true,
  "reseller": { ... }
}
```

---

#### 17. Domain Lookup

**POST** `/api/domain-lookup`

**Descrição:** Faz lookup DNS de um domínio.

**Body:**
```json
{
  "domain": "revendedor1.rastreadorautoram.com.br"
}
```

**Resposta:**
```json
{
  "success": true,
  "ip": "192.168.1.100",
  "domain": "revendedor1.rastreadorautoram.com.br"
}
```

---

### Funcionalidades Especiais

#### Auto-detecção de Ambiente

O servidor detecta automaticamente:
- Flutter SDK (`FLUTTER_ROOT`)
- Android SDK (`ANDROID_HOME`)
- Java (`JAVA_HOME`)

#### Geração de Configuração Nginx

O servidor gera automaticamente configurações Nginx para cada revendedor:

```nginx
server {
    listen 80;
    server_name revendedor1.rastreadorautoram.com.br;
    
    location / {
        proxy_pass http://127.0.0.1:8082;
        # ... configurações de proxy
    }
}
```

#### Sistema de Build Assíncrono

Builds são executados em background com:
- Rastreamento de progresso
- Logs em tempo real
- Notificações de conclusão
- Limpeza automática de builds antigos

---

## 🚗 Gestão Backend

### Visão Geral

O **Gestão Backend** é um servidor que gerencia frotas, viagens, motoristas, abastecimentos e custos extras. Integra com o Traccar para sincronização de dados.

**Base URL:** `/gestao`  
**Porta Backend:** `3666` (configurável)  
**Proxy Vite:** Configurado em `vite.config.js`

### Configuração

```javascript
// vite.config.js
proxy: {
  '/gestao': 'http://localhost:3666'
}
```

### Autenticação

O sistema usa autenticação baseada em cookies/sessão do Traccar:

```javascript
// authManager.js
class AuthManager {
  async makeRequestWithFallback(endpoint, options) {
    // Tenta primeiro no backend de gestão
    // Se falhar, faz fallback para Traccar API
  }
}
```

### Endpoints

#### Veículos

##### Listar Veículos

**GET** `/gestao/vehicles`

**Query Parameters:**
- `user_id` (opcional): Filtrar por usuário
- `confirmed` (opcional): Apenas veículos confirmados (`true`)

**Resposta:**
```json
[
  {
    "id": 1,
    "traccar_id": 123,
    "name": "Veículo 1",
    "plate": "ABC-1234",
    "confirmed": true,
    "user_id": 1
  }
]
```

---

##### Sincronizar Veículos do Traccar

**POST** `/gestao/vehicles/sync`

**Descrição:** Sincroniza veículos do Traccar com o sistema de gestão.

**Resposta:**
```json
{
  "success": true,
  "synced": 10,
  "message": "Veículos sincronizados"
}
```

---

##### Confirmar Veículo

**PUT** `/gestao/vehicles/:id/confirm`

**Descrição:** Confirma um veículo no sistema.

**Body:**
```json
{
  "name": "Veículo 1",
  "plate": "ABC-1234"
}
```

**Resposta:**
```json
{
  "success": true,
  "vehicle": { ... }
}
```

---

##### Atribuir Veículo a Usuário

**PUT** `/gestao/vehicles/:id/assign`

**Body:**
```json
{
  "userId": 1
}
```

---

#### Motoristas

##### Listar Motoristas

**GET** `/gestao/drivers`

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "cpf": "123.456.789-00",
    "phone": "(11) 99999-9999",
    "cnh": "123456789",
    "cnh_category": "B",
    "traccar_user_id": 456,
    "association_type": "manual"  // "manual" ou "automatic"
  }
]
```

---

##### Criar Motorista

**POST** `/gestao/drivers`

**Body:**
```json
{
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "phone": "(11) 99999-9999",
  "cnh": "123456789",
  "cnh_category": "B",
  "createInTraccar": false  // Criar usuário no Traccar?
}
```

**Resposta:**
```json
{
  "success": true,
  "driver": { ... }
}
```

---

##### Atualizar Motorista

**PUT** `/gestao/drivers/:id`

**Body:**
```json
{
  "name": "João Silva",
  "phone": "(11) 88888-8888"
}
```

---

##### Completar Motorista

**PUT** `/gestao/drivers/:id/complete`

**Descrição:** Completa cadastro de motorista com dados adicionais.

**Body:**
```json
{
  "address": "Rua Exemplo, 123",
  "email": "joao@example.com",
  "birth_date": "1990-01-01"
}
```

---

##### Atualizar Senha do Motorista

**PUT** `/gestao/drivers/:id/password`

**Body:**
```json
{
  "new_password": "novaSenha123"
}
```

---

##### Deletar Motorista

**DELETE** `/gestao/drivers/:id`

**Resposta:**
```json
{
  "success": true,
  "message": "Motorista deletado"
}
```

---

##### Obter Veículos do Motorista

**GET** `/gestao/drivers/:id/vehicles`

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "Veículo 1",
    "plate": "ABC-1234"
  }
]
```

---

##### Atualizar Veículos do Motorista

**PUT** `/gestao/drivers/:id/vehicles`

**Body:**
```json
{
  "vehicle_ids": [1, 2, 3]
}
```

---

##### Sincronizar Motoristas do Traccar

**POST** `/gestao/drivers/sync`

**Descrição:** Sincroniza motoristas do Traccar para o SGF.

**Resposta:**
```json
{
  "success": true,
  "synced": 5
}
```

---

##### Sincronizar Associações de Motoristas

**POST** `/gestao/drivers/sync-associations`

**Descrição:** Sincroniza associações automáticas de motoristas.

**Resposta:**
```json
{
  "success": true,
  "synced": 3
}
```

---

##### Sincronizar Motorista Específico

**POST** `/gestao/drivers/:id/sync`

**Descrição:** Sincroniza um motorista específico.

**Resposta:**
```json
{
  "success": true,
  "driver": { ... }
}
```

---

##### Atualizar Tipo de Associação

**PUT** `/gestao/drivers/:id/association-type`

**Body:**
```json
{
  "association_type": "automatic",  // "manual" ou "automatic"
  "traccar_user_id": 456  // Opcional
}
```

---

##### Estatísticas de Associação

**GET** `/gestao/drivers/association-stats`

**Resposta:**
```json
{
  "total": 10,
  "manual": 5,
  "automatic": 5,
  "pending": 0
}
```

---

##### Histórico do Motorista

**GET** `/gestao/drivers/:id/history`

**Query Parameters:**
- `limit` (opcional, padrão: 50)
- `offset` (opcional, padrão: 0)

**Resposta:**
```json
{
  "history": [
    {
      "timestamp": "2025-01-22T10:30:00Z",
      "action": "created",
      "details": "..."
    }
  ],
  "total": 100
}
```

---

#### Viagens

##### Listar Viagens

**GET** `/gestao/trips`

**Query Parameters:**
- `status` (opcional): Filtrar por status (`open`, `closed`, `cancelled`)

**Resposta:**
```json
[
  {
    "id": 1,
    "vehicle_id": 1,
    "driver_id": 1,
    "start_date": "2025-01-22T08:00:00Z",
    "end_date": null,
    "status": "open",
    "distance": 0
  }
]
```

---

##### Iniciar Viagem

**POST** `/gestao/trips/iniciar`

**Body:**
```json
{
  "vehicle_id": 1,
  "driver_id": 1,
  "start_date": "2025-01-22T08:00:00Z"
}
```

**Resposta:**
```json
{
  "success": true,
  "trip": { ... }
}
```

---

##### Finalizar Viagem

**PUT** `/gestao/trips/:id/finalizar`

**Body:**
```json
{
  "distancia_total": 150.5
}
```

**Resposta:**
```json
{
  "success": true,
  "trip": { ... }
}
```

---

##### Cancelar Viagem

**PUT** `/gestao/trips/:id/cancelar`

**Resposta:**
```json
{
  "success": true,
  "trip": { ... }
}
```

---

#### Abastecimentos

##### Listar Abastecimentos

**GET** `/gestao/abastecimentos/todos`

**Resposta:**
```json
[
  {
    "id": 1,
    "vehicle_id": 1,
    "date": "2025-01-22T10:00:00Z",
    "liters": 50.0,
    "price_per_liter": 5.50,
    "total_cost": 275.00,
    "odometer": 10000,
    "photos": ["photo1.jpg", "photo2.jpg"]
  }
]
```

---

##### Criar Abastecimento

**POST** `/gestao/refuelings`

**Body:**
```json
{
  "vehicle_id": 1,
  "date": "2025-01-22T10:00:00Z",
  "liters": 50.0,
  "price_per_liter": 5.50,
  "odometer": 10000
}
```

**Resposta:**
```json
{
  "success": true,
  "refuel": { ... }
}
```

---

##### Atualizar Abastecimento

**PUT** `/gestao/abastecimentos/:id`

**Body:**
```json
{
  "liters": 55.0,
  "price_per_liter": 5.60
}
```

---

##### Deletar Abastecimento

**DELETE** `/gestao/abastecimentos/:id`

**Resposta:**
```json
{
  "success": true
}
```

---

#### Custos Extras

##### Listar Custos Extras

**GET** `/gestao/custos`

**Resposta:**
```json
[
  {
    "id": 1,
    "vehicle_id": 1,
    "category": "Manutenção",
    "description": "Troca de óleo",
    "cost": 150.00,
    "date": "2025-01-22T10:00:00Z"
  }
]
```

---

##### Criar Custo Extra

**POST** `/gestao/custos`

**Body:**
```json
{
  "vehicle_id": 1,
  "category": "Manutenção",
  "description": "Troca de óleo",
  "cost": 150.00,
  "date": "2025-01-22T10:00:00Z"
}
```

**Resposta:**
```json
{
  "success": true,
  "cost": { ... }
}
```

---

##### Atualizar Custo Extra

**PUT** `/gestao/custos/:id`

**Body:**
```json
{
  "cost": 200.00,
  "description": "Troca de óleo e filtro"
}
```

---

##### Deletar Custo Extra

**DELETE** `/gestao/custos/:id`

**Resposta:**
```json
{
  "success": true
}
```

---

#### Relatórios

##### Relatório de Custos Extras

**GET** `/gestao/relatorios/custos-extras`

**Query Parameters:**
- `start_date`: Data inicial (ISO 8601)
- `end_date`: Data final (ISO 8601)
- `vehicle_id` (opcional): Filtrar por veículo

**Resposta:**
```json
{
  "total": 1500.00,
  "by_category": {
    "Manutenção": 800.00,
    "Lavagem": 200.00,
    "Outros": 500.00
  },
  "items": [ ... ]
}
```

---

##### Relatório de Custos por Viagem

**GET** `/gestao/relatorios/custos-por-viagem`

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `vehicle_id` (opcional)

**Resposta:**
```json
{
  "trips": [
    {
      "trip_id": 1,
      "distance": 150.5,
      "total_cost": 300.00,
      "costs": [ ... ]
    }
  ]
}
```

---

##### Relatório de Custos por Categoria

**GET** `/gestao/relatorios/custos-por-categoria`

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `vehicle_id` (opcional)

**Resposta:**
```json
{
  "categories": {
    "Manutenção": 800.00,
    "Lavagem": 200.00
  },
  "total": 1000.00
}
```

---

##### Relatório de Consumo Médio

**GET** `/gestao/relatorios/consumo-medio`

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `vehicle_id` (opcional)

**Resposta:**
```json
{
  "average_consumption": 10.5,  // km/l
  "total_distance": 1500.0,
  "total_fuel": 142.86,
  "by_vehicle": [ ... ]
}
```

---

##### Relatório de Distância entre Abastecimentos

**GET** `/gestao/relatorios/distancia-abastecimentos`

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `vehicle_id` (opcional)

**Resposta:**
```json
{
  "refuels": [
    {
      "date": "2025-01-22T10:00:00Z",
      "distance_since_last": 500.0,
      "liters": 50.0
    }
  ]
}
```

---

##### Relatório de Custo Total de Abastecimento

**GET** `/gestao/relatorios/custo-abastecimento-total`

**Query Parameters:**
- `start_date`: Data inicial
- `end_date`: Data final
- `vehicle_id` (opcional)

**Resposta:**
```json
{
  "total_cost": 5000.00,
  "total_liters": 1000.0,
  "average_price": 5.00,
  "by_vehicle": [ ... ]
}
```

---

#### Histórico de Associações

##### Listar Histórico

**GET** `/gestao/association-history`

**Query Parameters:**
- `driver_id` (opcional): Filtrar por motorista
- `vehicle_id` (opcional): Filtrar por veículo
- `start_date` (opcional): Data inicial
- `end_date` (opcional): Data final
- `limit` (opcional, padrão: 50)
- `offset` (opcional, padrão: 0)

**Resposta:**
```json
{
  "history": [
    {
      "id": 1,
      "driver_id": 1,
      "vehicle_id": 1,
      "action": "associated",
      "timestamp": "2025-01-22T10:30:00Z"
    }
  ],
  "total": 100
}
```

---

#### Agendamento de Sincronização

##### Obter Configuração

**GET** `/gestao/sync-schedule`

**Resposta:**
```json
{
  "enabled": true,
  "interval_minutes": 60,
  "last_run": "2025-01-22T09:00:00Z",
  "next_run": "2025-01-22T10:00:00Z"
}
```

---

##### Atualizar Configuração

**PUT** `/gestao/sync-schedule`

**Body:**
```json
{
  "enabled": true,
  "interval_minutes": 60
}
```

**Resposta:**
```json
{
  "success": true,
  "schedule": { ... }
}
```

---

##### Executar Sincronização Agora

**POST** `/gestao/sync-schedule/run-now`

**Descrição:** Executa sincronização imediatamente, sem aguardar agendamento.

**Resposta:**
```json
{
  "success": true,
  "synced": 5,
  "message": "Sincronização executada"
}
```

---

##### Logs de Sincronização Agendada

**GET** `/gestao/scheduled-sync-logs`

**Query Parameters:**
- `limit` (opcional, padrão: 20)
- `offset` (opcional, padrão: 0)

**Resposta:**
```json
{
  "logs": [
    {
      "timestamp": "2025-01-22T09:00:00Z",
      "status": "success",
      "synced": 5,
      "message": "Sincronização concluída"
    }
  ],
  "total": 50
}
```

---

### Sistema de Fallback

O sistema implementa fallback automático:

1. **Tenta primeiro** no backend de gestão (`/gestao/*`)
2. **Se falhar**, faz fallback para Traccar API (`/api/*`)
3. **Mapeia endpoints** automaticamente:
   - `/vehicles` → `/devices`
   - `/drivers` → `/drivers`
   - `/trips` → `/devices`

---

## 🔧 OS Backend

### Visão Geral

O **OS Backend** é um servidor para gerenciamento de Ordens de Serviço (OS), técnicos e checklists. Integra com o Traccar para gerenciar usuários e técnicos.

**Base URL:** `/os-api`  
**Porta Backend:** `3888` (configurável)  
**Proxy Vite:** Configurado em `vite.config.js`

### Configuração

```javascript
// vite.config.js
proxy: {
  '/os-api': 'http://localhost:3888',
  '/traccar-api': 'http://localhost:3888',
  '/os-uploads': 'http://localhost:3888'
}
```

### Endpoints

#### Ordens de Serviço

##### Listar Todas as OS

**GET** `/os-api/work-orders`

**Resposta:**
```json
[
  {
    "id": 1,
    "customer_id": 123,
    "technician_id": 456,
    "type": "Manutenção",
    "description": "Troca de óleo",
    "vehicle_plate": "ABC-1234",
    "vehicle_model": "Civic",
    "status": "PENDING",  // "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"
    "created_at": "2025-01-22T08:00:00Z",
    "updated_at": "2025-01-22T10:30:00Z",
    "checklist": {
      "items": [
        {
          "id": 1,
          "description": "Verificar nível de óleo",
          "completed": true
        }
      ]
    },
    "attachments": [
      "os_1/photo1.jpg",
      "os_1/photo2.jpg"
    ]
  }
]
```

---

##### Obter Detalhes de uma OS

**GET** `/os-api/work-orders/:id`

**Parâmetros:**
- `id` (path): ID da ordem de serviço

**Resposta:**
```json
{
  "id": 1,
  "customer_id": 123,
  "technician_id": 456,
  "type": "Manutenção",
  "description": "Troca de óleo",
  "vehicle_plate": "ABC-1234",
  "vehicle_model": "Civic",
  "status": "IN_PROGRESS",
  "created_at": "2025-01-22T08:00:00Z",
  "updated_at": "2025-01-22T10:30:00Z",
  "checklist": {
    "items": [
      {
        "id": 1,
        "description": "Verificar nível de óleo",
        "completed": true,
        "notes": "Óleo OK"
      }
    ]
  },
  "attachments": [
    "os_1/photo1.jpg",
    "os_1/photo2.jpg"
  ],
  "customer": {
    "id": 123,
    "name": "Cliente Exemplo"
  },
  "technician": {
    "id": 456,
    "name": "Técnico Exemplo"
  }
}
```

---

##### Criar OS

**POST** `/os-api/work-orders`

**Body:**
```json
{
  "customer_id": 123,
  "technician_id": 456,
  "type": "Manutenção",
  "description": "Troca de óleo e filtro",
  "vehicle_plate": "ABC-1234",
  "vehicle_model": "Civic"
}
```

**Resposta:**
```json
{
  "success": true,
  "work_order": {
    "id": 1,
    "status": "PENDING",
    ...
  }
}
```

---

##### Atualizar Status da OS

**PATCH** `/os-api/work-orders/:id/status`

**Body:**
```json
{
  "status": "IN_PROGRESS"  // "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"
}
```

**Resposta:**
```json
{
  "success": true,
  "work_order": { ... }
}
```

---

##### Deletar OS

**DELETE** `/os-api/work-orders/:id`

**Resposta:**
```json
{
  "success": true,
  "message": "Ordem de serviço deletada"
}
```

---

#### Checklist

##### Salvar Checklist

**POST** `/os-api/checklist`

**Body:**
```json
{
  "work_order_id": 1,
  "items": [
    {
      "description": "Verificar nível de óleo",
      "completed": true,
      "notes": "Óleo OK"
    },
    {
      "description": "Trocar filtro",
      "completed": false,
      "notes": ""
    }
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "checklist": { ... }
}
```

---

#### Fotos/Attachments

##### Upload de Fotos

**POST** `/os-api/work-orders/:id/photos`

**Content-Type:** `multipart/form-data`

**Body:**
- `photos` (file[]): Array de arquivos de imagem

**Resposta:**
```json
{
  "success": true,
  "attachments": [
    "os_1/photo1.jpg",
    "os_1/photo2.jpg"
  ]
}
```

---

##### Acessar Fotos

**GET** `/os-uploads/os_:id/:filename`

**Descrição:** Acessa arquivos de upload de uma OS.

**Parâmetros:**
- `id` (path): ID da OS
- `filename` (path): Nome do arquivo

**Resposta:**
- `200`: Arquivo de imagem
- `404`: Arquivo não encontrado

**Exemplo:**
```
GET /os-uploads/os_1/photo1.jpg
```

---

#### Técnicos (via Traccar API)

##### Listar Usuários/Técnicos

**GET** `/traccar-api/users`

**Descrição:** Lista todos os usuários do Traccar, incluindo técnicos.

**Resposta:**
```json
[
  {
    "id": 456,
    "name": "Técnico Exemplo",
    "email": "tecnico@example.com",
    "is_technician": true,  // Indica se é técnico
    "phone": "(11) 99999-9999"
  }
]
```

**Filtro de Técnicos:**
Para obter apenas técnicos, filtre no frontend:
```javascript
const technicians = users.filter(user => user.is_technician === true);
```

---

##### Toggle de Status de Técnico

**POST** `/traccar-api/toggle-technician`

**Body:**
```json
{
  "traccar_user_id": 456,
  "status": true  // true para tornar técnico, false para remover
}
```

**Resposta:**
```json
{
  "success": true,
  "user": {
    "id": 456,
    "is_technician": true
  }
}
```

---

### Status de OS

Os status possíveis são:

- **PENDING**: OS criada, aguardando início
- **IN_PROGRESS**: OS em andamento
- **COMPLETED**: OS concluída
- **CANCELLED**: OS cancelada

---

### Estrutura de Checklist

```json
{
  "items": [
    {
      "id": 1,
      "description": "Descrição do item",
      "completed": false,
      "notes": "Observações (opcional)"
    }
  ]
}
```

---

### Estrutura de Attachments

Os attachments são armazenados em:
```
/os-uploads/os_{work_order_id}/{filename}
```

**Exemplo:**
- OS ID: 1
- Arquivo: `photo1.jpg`
- URL: `/os-uploads/os_1/photo1.jpg`

---

## 🔄 Integração entre Serviços

### Fluxo de Dados

```
Frontend (React)
    ↓
Vite Proxy
    ↓
    ├──→ JTT Server (3334) - Mídia GPS
    ├──→ Reseller Server (3333) - Revendedores
    ├──→ Gestão Backend (3666) - Gestão de Frota
    └──→ OS Backend (3888) - Ordens de Serviço
            ↓
        Traccar API (5055) - Dados principais
```

### Proxy Configuration (vite.config.js)

```javascript
proxy: {
  '/api/socket': WS_BASE_URL,
  '/api/domain-lookup': 'http://localhost:3333',
  '/api/resellers': 'http://localhost:3333',
  '/api/upload': 'http://localhost:3333',
  '/os-api': 'http://localhost:3888',
  '/traccar-api': 'http://localhost:3888',
  '/os-uploads': 'http://localhost:3888',
  '/gestao': 'http://localhost:3666',
  '/api': API_BASE_URL
}
```

---

## 📝 Notas Importantes

### Autenticação

- **JTT Server**: Não requer autenticação (protocolo GPS)
- **Reseller Server**: Requer autenticação via cookies/sessão
- **Gestão Backend**: Usa fallback com Traccar API
- **OS Backend**: Integra com Traccar API para autenticação

### CORS

- **JTT Server**: Configurado para domínios específicos
- **Reseller Server**: Configurado via CORS middleware
- **Gestão/OS Backend**: Via proxy do Vite (sem CORS necessário)

### Logs

Todos os servidores implementam logging detalhado:
- Requisições HTTP
- Erros e exceções
- Processamento de arquivos
- Builds de aplicativos

### Performance

- **JTT Server**: Processamento assíncrono de arquivos
- **Reseller Server**: Builds em background com PM2
- **Gestão Backend**: Cache de dados frequentes
- **OS Backend**: Otimização de queries

---

## 🚀 Deploy e Produção

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'resellersServer',
      script: './src/addons/reseller/resellersServer.mjs',
      env: {
        FLUTTER_ROOT: '/opt/flutter',
        ANDROID_HOME: '/root/Android',
        JAVA_HOME: '/usr/lib/jvm/java-17-openjdk-amd64'
      }
    },
    {
      name: 'jttServer',
      script: './src/addons/jtt-server/jtt-server.mjs'
    }
  ]
};
```

### Nginx Configuration

Configurações Nginx são geradas automaticamente pelo Reseller Server para cada revendedor.

---

**Última Atualização:** 2025-01-22  
**Versão:** 1.0.0
