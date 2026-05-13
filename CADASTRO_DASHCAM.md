# Como cadastrar uma dashcam no sistema

Este guia descreve o cadastro de uma **câmera veicular (dashcam)** integrada ao painel Traccar customizado, para rastreamento e recursos de vídeo (quando suportados pelo modelo).

Para detalhes técnicos de APIs, streaming e app Flutter, consulte também [`dashcam_flutter_integration.md`](./dashcam_flutter_integration.md).

---

## 1. Antes de cadastrar

| Item | Descrição |
|------|-----------|
| **IMEI / ID** | Identificador único da câmera (geralmente o IMEI de 15 dígitos). Será o **Identificador único** do dispositivo no Traccar. |
| **Chip e dados** | SIM com plano de dados; APN conforme operadora e manual do fabricante. |
| **Protocolo de rastreamento** | Defina conforme o fabricante (ex.: protocolos compatíveis com JT808 / JT1078, ou o indicado pelo seu fornecedor). Use o mesmo protocolo que já funciona para posição no servidor. |
| **Credenciais de vídeo** | Servidor IoT Hub (Jimi ou equivalente), **token** de API e **servidor de streaming**, fornecidos pela operadora de vídeo ou documentação do modelo. |

---

## 2. Criar o dispositivo no Traccar

1. Aceda ao painel e entre como utilizador com permissão para **criar dispositivos** (ex.: administrador ou gestor).
2. Abra **Definições** → **Dispositivos** (ou o fluxo equivalente do seu tema).
3. Clique em **+** (adicionar dispositivo).
4. Preencha pelo menos:
   - **Nome**: nome amigável (ex.: `Viatura 12 - Dashcam`).
   - **Identificador único**: o **IMEI** (ou ID oficial do fabricante), **sem espaços**, exatamente como o equipamento envia ao servidor.
   - **Protocolo**: escolha o protocolo correto para este equipamento (confirme no manual ou com o suporte).
5. Guarde o dispositivo.

Confirme no mapa ou na lista se **posições** passam a chegar; sem rastreamento, o vídeo pode estar configurado mas o veículo não aparece corretamente.

---

## 3. Categoria `dashcam` (obrigatória para o botão de vídeo no cartão)

No mesmo dispositivo, defina a **categoria** como **`dashcam`**.

- No formulário do dispositivo, no campo **Categoria** (ou equivalente), selecione **Dashcam** se existir na lista.
- Se a interface permitir apenas texto, use exatamente: `dashcam` (minúsculas).

**Porquê:** o painel customizado mostra o atalho de **transmissão ao vivo** no cartão de estado do dispositivo apenas quando `device.category === 'dashcam'`.

---

## 4. Atributo `iothub` (configuração de vídeo e comandos)

Além dos dados normais do Traccar, este projeto usa um **atributo personalizado** chamado **`iothub`**, em formato **JSON** (string ou objeto, conforme o ecrã de atributos).

### 4.1 Onde editar

1. Abra o **dispositivo** → secção **Atributos** (ou **Atributos do dispositivo**).
2. Adicione (ou edite) o atributo com chave: **`iothub`**.
3. Valor: JSON válido, por exemplo para modelo **Jimi JC400**:

```json
{
  "iothubServer": "iothub.seudominio.com.br",
  "streamingServer": "stream.seudominio.com.br",
  "token": "SEU_TOKEN_FORNECIDO_PELO_SERVICO",
  "deviceModel": "jc400"
}
```

### 4.2 Campos usuais

| Chave | Função |
|-------|--------|
| `iothubServer` | Host (ou URL base) do serviço de **comandos** (ex.: Jimi IoT Hub). Pode ser com ou sem `https://` — o sistema normaliza conforme necessário. |
| `streamingServer` | Host do **fluxo de vídeo** (ex.: FLV ao vivo). |
| `token` | Token de autenticação da API do fabricante / middleware. |
| `deviceModel` | Modelo lógico usado pelo painel: por exemplo **`jc400`**, **`jc181`**, **`gd14`**. Define qual “template” de comandos e URLs o frontend utiliza. |
| `channels` *(opcional)* | Número de canais (ex.: `"2"` para frontal + interior), quando aplicável. |

Para **JC181** ou integração **JT808 / JT1078** (ex.: modelo **gd14**), podem existir campos adicionais no JSON, como **`jt808ServerUrl`** e identificação usada como “telefone” do terminal — estes devem ser preenchidos de acordo com a documentação do seu fornecedor ou com o ficheiro [`dashcam_flutter_integration.md`](./dashcam_flutter_integration.md).

Guarde o dispositivo após alterar atributos.

---

## 5. Grupo e permissões

- Associe o dispositivo ao **grupo** correto da frota.
- Garanta que os utilizadores que precisam de ver vídeo têm **permissão** sobre o dispositivo (e, se aplicável, sobre comandos).

---

## 6. Verificação rápida

1. **Mapa**: o veículo atualiza posição?
2. **Categoria**: está `dashcam`?
3. **Atributo `iothub`**: JSON válido com `deviceModel`, `token` e servidores corretos?
4. **Identificador único**: coincide com o IMEI que o IoT Hub espera nos comandos?

Se tudo estiver correto, no **cartão de estado** do dispositivo deve surgir a opção de **vídeo ao vivo** (quando o modelo e o backend estiverem operacionais).

---

## 7. Resolução de problemas breve

| Sintoma | O que verificar |
|---------|-----------------|
| Sem botão de vídeo | Categoria ≠ `dashcam` ou cache do browser; confirme o campo **Categoria**. |
| Erro de configuração IoT | `iothub` em falta, JSON inválido, `deviceModel` errado ou `token` / servidores incorretos. |
| Só rastreio, sem vídeo | Streaming ou IoT Hub indisponível; firewall; equipamento offline; modelo sem suporte no `deviceModel` atual. |

---

## 8. Documentação relacionada

- [`dashcam_flutter_integration.md`](./dashcam_flutter_integration.md) — integração técnica (JC400, JC181, URLs FLV, comandos).
- [`cameras.md`](./cameras.md) — notas sobre listagem de ficheiros / playback (quando aplicável ao seu fluxo).

---

*Documento orientado ao utilizador administrador. Ajuste hostnames, tokens e protocolos aos valores reais do seu ambiente de produção.*
