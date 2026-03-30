# Documentação do Módulo Reseller (Revendas)

Este documento descreve todas as funções, estruturas, rotas e configurações do módulo de Revendas (Resellers).

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Diretórios](#estrutura-de-diretórios)
3. [Armazenamento de Dados](#armazenamento-de-dados)
4. [Rotas e Endpoints](#rotas-e-endpoints)
5. [Funções Auxiliares](#funções-auxiliares)
6. [Build de Apps Mobile](#build-de-apps-mobile)
7. [Nginx e SSL](#nginx-e-ssl)
8. [Configuração Frontend](#configuração-frontend)

---

## Visão Geral

O módulo **Reseller** permite que usuários administradores criem e gerenciem **revendas** (white-label) da plataforma de rastreamento. Cada revenda possui:

- Domínio próprio (`appUrl`)
- Marcação visual (logo, favicon, ícone do app, ícone de notificação)
- Limites (resellers, devices, users)
- Build de apps mobile (APK, AAB, iOS) com Flutter

### Porta e Inicialização

- **Porta:** `PORT` (default: 3333)
- **Script:** `start-resellers-server.sh` (PM2)
- **Diretório de dados:** `/opt/addons/resellers/data`
- **Diretório de imagens:** `/opt/addons/resellers/data/images`

---

## Estrutura de Diretórios

```
src/addons/reseller/
├── resellersServer.mjs      # Servidor Express principal
├── start-resellers-server.sh # Script de inicialização (PM2)
├── traccar-manager/         # Código-fonte Flutter (Traccar Manager)
├── package.json
├── node_modules/
└── DOCUMENTACAO_RESELLER.md
```

**Config frontend:** `src/config/resellersConfig.js`

---

## Armazenamento de Dados

### Formato de Arquivos

- **JSON:** Um arquivo `.json` por revenda em `/opt/addons/resellers/data/`
- **Padrão novo:** `reseller_{currentDomain}_{appUrl}_{parentUserId}_{resellerId}.json`
- **Padrão legado:** `reseller_{appUrl}_{parentUserId}_{resellerId}.json`

### Estrutura do Objeto Revenda

| Campo | Tipo | Descrição |
|-------|------|-----------|
| currentDomain | string | Domínio atual (gps, etc.) |
| parentUserId | number | ID do usuário pai (admin) |
| parentUser | string | Nome do pai |
| parentEmail | string | Email do pai |
| resellerId | string/number | ID da revenda |
| resellerUser | string | Nome do revendedor |
| resellerEmail | string | Email do revendedor |
| companyName | string | Nome da empresa |
| logotype | string | Caminho do logo (images/...) |
| favicon | string | Caminho do favicon |
| appImage | string | Ícone do app mobile |
| notificationIcon | string | Ícone de notificação |
| appUrl | string | Domínio da revenda |
| whatsapp | string | WhatsApp |
| billingEmail | string | Email de cobrança |
| supportEmail | string | Email de suporte |
| resellerLimit | number | Limite de sub-revendas |
| deviceLimit | number | Limite de dispositivos |
| userLimit | number | Limite de usuários |
| status | string | active, etc. |
| createdAt | string | Data de criação |
| savedAt | string | Data de salvamento |
| updatedAt | string | Data de atualização |
| filename | string | Nome do arquivo JSON |

---

## Rotas e Endpoints

### Health e Info

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (status, uptime) |

### Revendas (CRUD)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/resellers/list` | Listar revendas (parentUserId, currentDomain) |
| GET | `/api/resellers` | Legacy – mensagem de uso do POST |
| POST | `/api/resellers` | Criar revenda (FormData ou JSON) |
| PUT | `/api/resellers/:id` | Atualizar revenda |
| POST | `/api/resellers/delete` | Excluir revenda (currentDomain, appUrl, parentUserId) |

### Logs

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/resellers/logs` | Obter logs por domínio |
| POST | `/api/resellers/logs/delete` | Excluir logs por domínio |

### Build de Apps

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/resellers/build` | Iniciar build (apk, aab, ios, ios_simulator, ios_device, both) |
| GET | `/api/resellers/build/status/:appUrl` | Status do build (?parentUserId, currentDomain, buildType) |
| GET | `/api/resellers/download` | Download do build (?appUrl, buildType) |
| POST | `/api/resellers/clean-apps` | Limpar builds (appUrl, resellerId, cleanType) |

### Upload e Imagens

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/upload` | Upload de imagem (campo `image`, body: appUrl, parentUserId, resellerId) |
| GET | `/images/*` | Servir imagens estáticas |
| GET | `/api/reseller-logo` | Logo e favicon em base64 (?domain) |

### Domínio e Verificação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/check-domain` | Verificar propagação DNS (domain) |
| POST | `/api/reseller-check` | Verificar se userId é revendedor |
| POST | `/api/domain-lookup` | Buscar dados por domínio (retorna data + imageBase64) |

### Nginx e Utilitários

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/nginx/update-configs` | Atualizar configs nginx existentes |
| POST | `/api/data` | Endpoint genérico JSON (recebe body) |

---

## Funções Auxiliares

### Utilitários Gerais

| Função | Descrição |
|--------|-----------|
| `generateUniqueFilename(appUrl, parentUserId, resellerId, extension)` | Gera nome único para arquivo |
| `getDirectorySize(dirPath)` | Calcula tamanho recursivo do diretório |
| `logStep(domain, step, message, error)` | Registra passo em `global.resellerLogs` (últimos 100 por domínio) |

### DNS e Domínio

| Função | Descrição |
|--------|-----------|
| `checkDomainPropagation(domain)` | Verifica resolução DNS do domínio |

### Build Lock

| Função | Descrição |
|--------|-----------|
| `getBuildLockFilePath(resellerDirName, buildType)` | Caminho do arquivo de lock |
| `isBuildActive(resellerDirName, buildType)` | Verifica se build está ativo (memória ou lock > 2h = stale) |
| `createBuildLock(resellerDirName, buildType)` | Cria lock de build |
| `removeBuildLock(resellerDirName, buildType)` | Remove lock |
| `cleanupStaleBuildLocks()` | Remove locks com mais de 2 horas (startup) |

### Imagens

| Função | Descrição |
|--------|-----------|
| `copyAppImages(resellerDirPath, resellerData)` | Copia appImage e notificationIcon para Android/iOS |
| `resizeAndCopyImage(sourcePath, targetPath, width, height, isNotificationIcon)` | Redimensiona com Sharp (PNG) |
| `copyFaviconForWebApp(resellerData)` | Copia favicon para public/ do web app |

### Build Flutter

| Função | Descrição |
|--------|-----------|
| `buildFlutterApp(resellerDirPath, resellerData, resellerDirName, buildType)` | Executa `flutter build apk/aab/ios` |

**buildType:** `apk`, `aab`, `ios`, `ios_simulator`, `ios_device`, `both`

---

## Build de Apps Mobile

### Fluxo

1. **POST /api/resellers/build** – Recebe dados da revenda, retorna imediatamente
2. **Background:** Copia `traccar-manager/` → `reseller_{currentDomain}_{appUrl}_{parentUserId}_{resellerId}/`
3. Atualiza: `pubspec.yaml`, `AndroidManifest.xml`, `Info.plist`, `brand.dart`, `main_screen.dart`
4. Copia imagens (appImage, notificationIcon) para ícones Android/iOS
5. Executa `flutter clean`, `flutter pub get`, `flutter build apk/aab/ios`
6. Copia APK/AAB para `{appUrl}.apk`, `{appUrl}.aab` em DATA_DIR
7. Remove lock ao finalizar

### Padrões de Build

- **Package name:** Mantido `org.traccar.manager` (Firebase)
- **Display name:** `companyName`
- **URL padrão:** `https://{appUrl}`
- **google-services.json:** Usado do source (único FCM)

### Status de Build

- `NOT_BUILDED` – Nenhum arquivo gerado
- `BUILDING` – Build em andamento (lock ativo)
- `BUILDED` – APK/AAB/iOS disponível

---

## Nginx e SSL

### Funções

| Função | Descrição |
|--------|-----------|
| `createNginxConfig(appUrl)` | Cria `/etc/nginx/sites-available/{appUrl}.conf` |
| `enableNginxSite(appUrl)` | Cria symlink em sites-enabled |
| `reloadNginx(domain)` | Recarrega nginx (systemctl/service/nginx -s) |
| `setupSSL(appUrl, email)` | Certbot --nginx para HTTPS |
| `setupResellerNginx(appUrl, billingEmail)` | Config + enable + reload + SSL |
| `disableNginxSite(appUrl)` | Remove symlink |
| `removeNginxConfig(appUrl)` | Remove arquivo de config |
| `cleanupResellerNginx(appUrl)` | Disable + remove + reload |
| `updateExistingNginxConfigs()` | Atualiza configs antigas com novo template (gzip, etc.) |

### Template Nginx

- Proxy para `http://127.0.0.1:8082`
- GZIP habilitado
- Headers de segurança (X-Frame-Options, etc.)
- Cache para assets estáticos (30d)

---

## Configuração Frontend

Arquivo: `src/config/resellersConfig.js`

| Propriedade | Descrição |
|-------------|-----------|
| `RESELLERS_SERVER_URL` | URL do servidor (VITE_RESELLERS_SERVER_URL ou default) |
| `ENDPOINTS.LIST` | POST list |
| `ENDPOINTS.CREATE` | POST create |
| `ENDPOINTS.UPDATE(id)` | PUT update |
| `ENDPOINTS.DELETE` | POST delete |
| `ENDPOINTS.UPLOAD` | POST upload |
| `ENDPOINTS.CHECK` | `/api/reseller-check` (relativo) |
| `ENDPOINTS.CHECK_DOMAIN` | `/api/check-domain` (relativo) |
| `ENDPOINTS.LOGS` | POST logs |
| `ENDPOINTS.LOGS_DELETE` | POST logs delete |
| `ENDPOINTS.BUILD` | POST build |
| `ENDPOINTS.BUILD_STATUS(...)` | GET build status |
| `ENDPOINTS.DOWNLOAD(...)` | GET download |
| `ENDPOINTS.RESELLER_LOGO(domain)` | GET logo (relativo) |
| `ENDPOINTS.CLEAN_APPS` | POST clean-apps |

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (default: 3333) |
| `FLUTTER_ROOT` | Caminho do Flutter |
| `ANDROID_HOME` | Caminho do Android SDK |
| `JAVA_HOME` | Caminho do Java |

---

## Multer (Upload)

- **Destino:** `IMAGES_DIR` (`/opt/addons/resellers/data/images`)
- **Limite:** 2 MB
- **Tipos:** PNG apenas
- **Campos FormData:** `image`, `favicon`, `appImage`, `notificationIcon`

---

## Inicialização

1. `ensureDirectories()` – Cria `/opt/addons/resellers`, `data`, `images`
2. `cleanupStaleBuildLocks()` – Remove locks antigos
3. `updateExistingNginxConfigs()` – Atualiza configs nginx após listen
