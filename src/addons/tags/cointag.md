COINTAG WebHook Integration Documentation

I. Overview
This interface is used to push device location information data to the client's
system. The client needs to provide an externally exposed HTTP callback URL so
that the platform system can push relevant data in real time. The push method
uses an HTTP POST request and includes a JSON-formatted message body.
II. Platform Server IP

IP : 118.178.145.159
Note: Add the platform server IP to the firewall to allow external network
requests to pass through.
III. Push Logic Explanation
Batch push: When the amount of data pushed in a single push is too large
(e.g., more than 200 items), the system will push the data in batches, with
each batch containing no more than 200 items.

IV . Callback Address Requirements
The callback URL provided by the client should meet the following requirements:
A、 Network connectivity:
The callback interface must be publicly accessible and allow... HTTP POST
request.
B、Supports HTTP methods:

The callback interface only supports POST format and must accept a JSON-
formatted message body.

C、Customer-defined push callback URL: Format: http:// external IP address + port
+ API path Example: http://192.168.3.113:1000/api/test

V. Push Message Format
{
"code": 200,
"message": "success",
"data": [
{
" deviceId ": " Unique identifier for the device ",
"latitude": " latitude value ",
1
"longitude": " longitude value ",
"altitude": " altitude "
"timestamp": " Data collection time ",
"accuracy": " positioning accuracy ",
" datePublished ": " Published time "
}
]
}
VI . Description of Receiving Parameters
Parameter name Parameter Description Parameter type
deviceId Device ID String
latitude latitude value String
longitude Longitude value String
altitude Altitude String
timestamp Data Acquisition
Time_UTC (Format:
yyyy-MM-ddTHH: mm:ss )

String

accuracy Positioning accuracy String
datePublished Release time _UTC(Format:
yyyy-MM-ddTHH: mm:ss )

String

VII . Access Process

⚫ Provide a callback URL :
The client provides a request callback URL in HTTP POST format.
⚫ JSON message pushed by the platform , please parse the data according to
the above format and process the data according to your own business logic.

Ele receberá o JSON da COINTAG, extrairá os dados e os enviará instantaneamente para o seu servidor Traccar usando o protocolo OsmAnd (que é o mais simples para integração via HTTP).

**Script de produção:** [cointag.mjs](cointag.mjs)

O middleware está implementado em `src/addons/tags/cointag.mjs`. Execute com:

```bash
node src/addons/tags/cointag.mjs
# ou com PM2:
pm2 start src/addons/tags/cointag.mjs --name "ctag"
```

Configuração via variável de ambiente:
- `TRACCAR_OSMAND_URL`: URL do Traccar OsmAnd (padrão: `http://127.0.0.1:5055`)

Endpoints: `/api/cointa` (principal) e `/api/test` (compatibilidade).
Plano de Ação Final (Mãos à Obra)
Configuração no Servidor (104.251.211.91):

Instale o Node.js e as dependências do projeto (express já está no package.json).

Execute o script: `node src/addons/tags/cointag.mjs` ou com PM2: `pm2 start src/addons/tags/cointag.mjs --name "ctag"`.


Importante: No seu painel de controle do servidor (ou IPTables), libere a porta 3696 para o IP 118.178.145.159.

Configuração no Traccar:

Acesse a interface web do seu Traccar.

Vá em Dispositivos -> Adicionar (+).

No campo Identificador, coloque exatamente o valor que o COINTAG envia no campo `deviceId`. Se você não cadastrar o ID, o Traccar recusará os dados.
+1

Homologação com a COINTAG:

Informe à COINTAG que sua URL oficial de recebimento é: http://104.251.211.91:3696/api/cointa (ou /api/test para compatibilidade).
+1

Peça para realizarem um envio de teste.

Se você não tem um firewall ativo no sistema (como o ufw ou iptables), o caminho fica mais livre, mas a responsabilidade de "escutar" a porta correta recai totalmente sobre o seu script Node.js.

Como você está usando o IP 104.251.211.91, aqui está o que você precisa fazer para garantir que a integração funcione na prática:

1. Teste de Porta Aberta
Mesmo que você não tenha configurado um firewall no Linux, muitos provedores de VPS (como AWS, DigitalOcean ou Google Cloud) possuem um Firewall Externo (Security Groups) no painel de controle do site.

Verifique se a porta 3696 está aberta no painel da sua hospedagem.

Para testar se o seu servidor está visível para o mundo na porta 3696, execute o script Node e use um site como o CanYouSeeMe.org digitando a porta 3696.

2. O Script de Produção (com PM2)
Para que o seu tradutor COINTAG -> Traccar não pare de funcionar se você fechar o terminal, use o PM2. Ele manterá o processo vivo.

Instalação: `npm install -g pm2`

Comando para rodar:

```bash
pm2 start src/addons/tags/cointag.mjs --name "ctag"
pm2 save
pm2 startup
```
3. Resumo da Configuração no Traccar
Como o documento da COINTAG especifica que os dados de latitude, longitude e altitude são enviados como Strings, o middleware que criamos é essencial para garantir que o Traccar receba os valores numéricos corretos.
+1


Identificador no Traccar: Use o valor exato do deviceId que consta no JSON.
+1

Protocolo: O Traccar registrará esses dispositivos como sendo do protocolo OsmAnd (porta 5055).

4. Checklist de Verificação 


URL de Callback: Forneça http://104.251.211.91:3696/api/cointa para a COINTAG.


Método: Confirme que eles estão enviando via POST.
+1


Formato: O corpo da mensagem deve ser JSON.
+1


IP de Origem: Embora você não tenha firewall, lembre-se que as requisições virão do IP 118.178.145.159.

### Teste local (simulação)

```bash
curl -X POST http://localhost:3696/api/cointa \
  -H "Content-Type: application/json" \
  -d '{"code":200,"message":"success","data":[{"deviceId":"TEST001","latitude":"-23.5505","longitude":"-46.6333","altitude":"800","timestamp":"2025-02-25T14:30:00","accuracy":"5","datePublished":"2025-02-25T14:30:00"}]}'
```

Resposta esperada: `Processed` (HTTP 200). Verifique no Traccar se a posição aparece para o dispositivo TEST001.