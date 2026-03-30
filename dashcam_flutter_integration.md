# Guia de Integração Dashcam (JC400) no App Flutter Nativo

Este documento detalha o funcionamento técnico da integração de câmeras dashcam (especialmente o modelo **Jimi JC400**) no sistema, permitindo que as mesmas funcionalidades do painel web sejam replicadas no aplicativo nativo em Flutter.

---

## 1. Configuração do Dispositivo (Traccar)

Para que o app saiba como se comunicar com a câmera, ele deve ler o atributo `iothub` cadastrado no dispositivo no Traccar. Esse atributo contém um JSON com as seguintes chaves:

- `iothubServer`: Servidor de comandos da Jimi (ex: `iothub.jimi.com`).
- `streamingServer`: Servidor que entrega o fluxo de vídeo FLV (ex: `stream.exemplo.com`).
- `token`: Token de autenticação da API Jimi.
- `deviceModel`: Modelo do dispositivo (deve ser `jc400`).

**Exemplo de JSON no atributo `iothub`:**
```json
{
  "iothubServer": "iothub.rastreadorautoram.com.br",
  "streamingServer": "stream.rastreadorautoram.com.br",
  "token": "seu_token_aqui",
  "deviceModel": "jc400"
}
```

---

## 2. Streaming ao Vivo (Live View)

O processo de visualização ao vivo para o JC400 não é direto; ele exige o envio de comandos para a câmera iniciar o envio do fluxo RTMP para o servidor de streaming.

### Passo 1: Resetar conexões existentes (Obrigatório)
Antes de iniciar qualquer stream, deve-se enviar um comando para desligar qualquer fluxo RTMP ativo.

- **Endpoint:** `POST https://{iothubServer}/api/device/sendInstruct`
- **Headers:** `Content-Type: application/x-www-form-urlencoded`
- **Corpo (Form Data):**
    - `deviceImei`: IMEI do dispositivo.
    - `cmdContent`: `RTMP,OFF`
    - `proNo`: `128`
    - `token`: `{token}`

**Aguardar ~500ms após o sucesso deste comando.**

### Passo 2: Ativar o Streaming
Agora envia-se o comando para ligar o streaming no canal desejado.

- **Endpoint:** `POST https://{iothubServer}/api/device/sendInstruct`
- **Corpo (Form Data):**
    - `deviceImei`: IMEI do dispositivo.
    - `proNo`: `128`
    - `token`: `{token}`
    - `cmdContent`: 
        - Canal 1 (Frontal): `RTMP,ON,OUT`
        - Canal 2 (Interno): `RTMP,ON,IN`

### Passo 3: Reprodução no Flutter
O vídeo é entregue no formato **FLV** através de HTTP/HTTPS.

- **URL de Vídeo:** `https://{streamingServer}/live/{channelIndex}/{deviceImei}.flv`
    - Canal 1: `channelIndex = 0`
    - Canal 2: `channelIndex = 1`

**Recomendação para Flutter:**
Como o Flutter não suporta FLV nativamente, recomenda-se usar o plugin `flutter_vlc_player` ou `fijkplayer` (baseado em IJKPlayer), que possuem suporte a esse codec.

---

## 3. Lista de Vídeos e Replay (Playback)

Para listar os vídeos gravados no cartão SD ou no servidor:

### Passo 1: Obter Lista de Arquivos
O sistema usa um servidor intermediário (Media Server) para gerenciar os arquivos.

- **Endpoint:** `POST {mediaServerUrl}/getFileList`
- **Corpo (JSON):**
```json
{
  "deviceImei": "999999999999999",
  "deviceModel": "jc400"
}
```

### Passo 2: Reproduzir Vídeo Gravado
A resposta do servidor trará uma lista de objetos com o nome do arquivo. A URL para o Flutter reproduzir o MP4 será:

- **Vídeo MP4:** `https://{mediaServerUrl}/{deviceImei}/{fileName}/MP4/jc400`
- **Miniatura (Thumbnail):** `https://{mediaServerUrl}/{deviceImei}/{fileName}/jc400`

*Nota: O `fileName` geralmente é o nome do arquivo sem a extensão `.mp4`.*

---

## 4. Comandos de Foto (Snapshot)

Para tirar uma foto instantânea:

- **Endpoint:** `POST https://{iothubServer}/api/device/sendInstruct`
- **Corpo (Form Data):**
    - `deviceImei`: IMEI do dispositivo.
    - `proNo`: `128`
    - `token`: `{token}`
    - `cmdContent`: 
        - Canal 1: `PHOTO,OUT`
        - Canal 2: `PHOTO,IN`

A foto será enviada para o servidor configurado na câmera e poderá ser recuperada via API de arquivos ou webhook.

---

## 5. Resumo Técnico para Desenvolvedores Flutter

| Funcionalidade | Canal | Comando (`cmdContent`) | URL de Visualização |
| :--- | :--- | :--- | :--- |
| **Live Frontal** | 1 | `RTMP,ON,OUT` | `.../live/0/{imei}.flv` |
| **Live Interna** | 2 | `RTMP,ON,IN` | `.../live/1/{imei}.flv` |
| **Foto Frontal** | 1 | `PHOTO,OUT` | (Via Servidor de Mídia) |
| **Foto Interna** | 2 | `PHOTO,IN` | (Via Servidor de Mídia) |

### Plugins Sugeridos para o `pubspec.yaml`:
```yaml
dependencies:
  flutter_vlc_player: ^7.4.1  # Para reprodução do FLV (Live)
  video_player: ^2.8.1        # Para reprodução dos MP4 (Replay)
  http: ^1.1.0                # Para chamadas de API
```

## 6. Diferenças para o Modelo JC181

Caso utilize o modelo **JC181**, a lógica de comandos muda para o formato JSON:

### Live Streaming JC181
- **ProNo:** `37121`
- **CmdType:** `normallns`
- **cmdContent (JSON):**
```json
{
  "dataType": "0",
  "codeStreamType": "0",
  "channel": "1",
  "videoIP": "{ftpServerIp}",
  "videoTCPPort": "10002",
  "videoUDPPort": "0"
}
```
*O `ftpServerIp` é obtido do atributo `iothub`.*

### URL de Reprodução JC181
- **Live:** `{streamingServer}/{channelNum}/{deviceImei}.flv`
- **MP4 Replay:** `/:imei/:name/MP4` (Sem o sufixo /jc400)

