Chave API COMTELE: 9a930b6c-9e93-4c9b-bf06-69e88c2312d9

traccar XML:
root@autoram:~# sudo cat /opt/traccar/conf/traccar.xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>

    <entry key='processing.copyAttributes.enable'>true</entry>
    <entry key='processing.copyAttributes'>power,voltage,adc1,ignition,charge,power,battery</entry>
    <entry key='server.timeout'>180</entry>

    <entry key='geocoder.enable'>true</entry>
    <entry key='geocoder.type'>nominatim</entry>
    <entry key='geocoder.url'>http://50.30.32.171:8080/reverse</entry>
    <entry key='geocoder.onRequest'>false</entry> 
    <entry key='geocoder.ignorePositions'>true</entry>
    <entry key='geocoder.reuseDistance'>10</entry>

    <entry key='filter.enable'>true</entry>
    <entry key='filter.invalid'>false</entry>
    <entry key='filter.future'>86400</entry>
    <entry key='filter.static'>false</entry>
    <entry key='filter.distance'>0</entry>
    <entry key='osmand.override'>serverTime</entry>
    <entry key='gt06.override'>serverTime</entry>
    <entry key='huabao.override'>serverTime</entry>
    <entry key='easytrack.override'>serverTime</entry>

    <entry key='database.driver'>org.postgresql.Driver</entry>
    <entry key='database.url'>jdbc:postgresql://localhost:5432/traccar?useSSL=false</entry>
    <entry key='database.user'>traccaruser</entry>
    <entry key='database.password'>traccarpass</entry>

    <entry key='event.forward.url'>http://104.251.211.91:3665/events</entry>

    <entry key='sms.enable'>true</entry>
    <entry key='notificator.sms.manager.class'>org.traccar.sms.HttpSmsClient</entry>
    <entry key='sms.http.url'>https://sms.comtele.com.br/api/v2/send</entry>
    <entry key='sms.http.header'>auth-key: 0c736506-680d-40ea-a2b9-1e46cca8de5b</entry>
    <entry key='sms.http.template'>
        {
            "Sender": "Autoram",
            "Content": "{message}",
            "Receivers": "{phone}"
        }
    </entry>

    <entry key='notificator.types'>mail,sms,firebase,web</entry>

    <entry key='notificator.firebase.serviceAccount'>
    {
      "type": "service_account",
      "project_id": "rastreador-autoram",
      "private_key_id": "44a01a52954c04401ec7bb9fc0ab4928c6bd6681",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQD8UcJvcIRnjMx7\nb3lnix",
      "client_email": "firebase-adminsdk-fbsvc@rastreador-autoram.iam.gserviceaccount.com",
      "client_id": "117460557156480825918",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40rastreador-autoram.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
    }
    </entry>

</properties>


DOCUMENTAÇÃO COMTELE:

Introdução API Rest
Bem vindo DEV! A API da Comtele é construída no padrão REST. Nossa API possui URLs previsíveis de acordo com todos recursos servidos por cada endpoint, aceita requisições e retorna utilizando padrão JSON e também usa códigos de resposta HTTP padrão, a autenticação é feita via Header e todas as requisições também devem conter ‘Content-Type’: 'application/json’.

Além da API Rest, a Comtele mantem oficialmente pacotes de software para facilitar o desenvolvimento e a vida dos nossos amigos devs. Na Seção SDK fornecemos instruções básicas sobre como instalar e começar a trabalhar com esses pacotes.

GitHub
Oficialmente nós damos suporte apenas para nossa API REST, mas também criamos alguns EXEMPLOS de SDK OpenSource que podem ser encontradas no GitHub pelos links: Python, .NET, .NET Core, Node, Java, Ruby, PHP via composer e importação de arquivos. Com isto, você pode montar seu próprio código/SDK se baseando em nossos exemplos e usando a linguagem de programação que desejar.

URL Base da API
https://sms.comtele.com.br/api/v2/

Autenticação
Todas as requisições direcionadas a qualquer recurso da API Rest devem ser autenticadas, a chave de integração está disponível na sua conta em https://sms.comtele.com.br. No menu lateral, dentro da seção API, clique em Chave de API e você irá para a página de Informações do Desenvolvedor e lá irá encontrar o campo nomeado como Sua Chave de API. Ela deve ser informada via Header no seguinte formato: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

Códigos de Erro
Os retornos de erro usam códigos padrões de status HTTP para indicar o tipo de erro que está acontecendo. Na maior parte dos casos, também será retornado via Body no formato JSON um campo que contém uma descrição detalhada sobre o erro. Todos os códigos de erros estão alinhados com a específicação padrão

Exemplo de erro HTTP 401 - Unauthorized
Neste caso por exemplo, não será retonado corpo em JSON. Apenas o HTTP Status: 401 - Unauthorized

Erros Comuns
HTTP Status	Error Code	Description
400	BadRequest	Este erro geralmente ocorre quando algum recurso é acessado sem algum parâmetro necessário ser informado.
401	InvalidCredentials	Erro relacionado a chave de API, pode ter sido informada de maneira incorreta ou não ter sido informada.
404	NotFound	Recurso inexistente, o endpoint informado provavelmente está incorreto.
405	MethodNotAllowed	Este erro está relacionado quando algum recurso é acessado por um método não disponível.
429	TooManyRequests	Este erro ocorre, quando é feita uma quantidade excessiva de requisições na API em um curto período de tempo.
500	RequestTimeout	houve um time out na requisição ao efetuar a conexão com o endpoint.
503	ServerError	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
Envio de SMS
Nesta seção, são abordados todos os recursos disponíveis para envio de SMS. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Enviar SMS
Com este recurso, é possivel enviar SMS de forma instantânea.
URL do Endpoint: https://sms.comtele.com.br/api/v2/send
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/send"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"Content\":\"message\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/send"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"Content\":\"message\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Receivers	sim	Destinatários que irão receber o SMS. Para dois ou mais destinatários, separe por uma vírgula os telefones, formato: DDD + Número, pode-se enviar para ate 100 telefones dessa forma.
Content	sim	Conteúdo da mensagem que vai ser recebida pelo número que o SMS será enviado. Nos casos que o conteúdo do SMS superar 160 caracteres, será tarifado mais de um crédito a cada 153 caracteres. Algumas operadoras como a Oi e Sercomtel não suportam concatenação da mensagens, então serão recebidos SMS separadamente.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
RequestUniqueId	Este campo é o ID da sua requisição.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	O parâmetro ‘Content’ deve ser informado com conteúdo.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Enviar SMS / Regra de Resposta Automática
Com este recurso, é possivel enviar SMS de forma instantânea e quando o SMS for respondido, é possivel enviar uma resposta de forma automática, baseado em um contexto previamente configurado.
Para utilizar este recurso, é necessário que você acesse a opção “Resposta Automática” no menu “Configurações” no painel de SMS, cadastre uma regra de resposta automática e informe o nome que foi cadastrado no campo ContextRuleName no momento que for usar o endpoint.
URL do Endpoint: https://sms.comtele.com.br/api/v2/sendcontextmessage
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendcontextmessage"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"ContextRuleName\":\"rule_name\",\"ForceContent\":\"force_content\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendcontextmessage"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"ContextRuleName\":\"rule_name\",\"ForceContent\":\"force_content\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Receivers	sim	Destinatários que irão receber o SMS. Para dois ou mais destinatários, separe por uma vírgula os telefones, formato: DDD + Número, pode-se enviar para ate 100 telefones dessa forma.
ContextRuleName	sim	Neste campo deve ser informado o nome da regra que o contexto de resposta foi programado e cadastrado no sistema que no caso será usado neste envio.
ForceContent	não	Se este campo for preenchido, o conteúdo da mensagem será ele, se ele não for preenchido, o sistema irá usar o conteúdo pré-cadastrado no Painel SMS na Regra de Resposta Automática.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
Content	Conteúdo da mensagem que foi recebida pelo número retornado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	E necessario informar o nome da regra de resposta automatica.
400	Nao foi possivel encontrar uma regra de resposta automatica cadastrada com o nome informado.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Enviar SMS / Grupos de Contatos
Com este recurso, é possivel enviar SMS de forma instantânea para um grupo de contatos.
Para usar este recuso, é necessário ter grupos de contatos já cadastrados em nossa aplicação, caso ainda não tenha feito isso, dê uma olhadinha no recurso Cadastrar / Grupos de Contatos e Cadastrar Contatos / Grupos de Contatos
URL do Endpoint: https://sms.comtele.com.br/api/v2/sendcontactmessage
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendcontactmessage"

  payload = "{\"Sender\":\"sender_id\",\"Content\":\"message\",\"GroupName\":\"group_name\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendcontactmessage"

  payload = "{\"Sender\":\"sender_id\",\"Content\":\"message\",\"GroupName\":\"group_name\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Content	sim	Conteúdo da mensagem que vai ser recebida pelo número que o SMS será enviado. Nos casos que o conteúdo do SMS superar 160 caracteres, será tarifado mais de um crédito a cada 153 caracteres. Algumas operadoras como a Oi e Sercomtel não suportam concatenação da mensagens, então serão recebidos SMS separadamente.
GroupName	sim	Nome do grupo de contatos, com todos os telefones que receberão o SMS.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
Content	Conteúdo da mensagem que foi recebida pelo número retornado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	E necessario informar o grupo de contatos que irao receber o SMS
400	Nao foi possivel encontrar um grupo de contatos cadastrado com o nome informado.
400	O parâmetro 'Content’ deve ser informado com conteúdo.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Agendamento de SMS
Nesta seção, são abordados todos os recursos disponíveis para envio de SMS agendado. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Agendar SMS
Com este recurso, é possivel programar a data e horário de envio de SMS para serem enviados.
URL do Endpoint: https://sms.comtele.com.br/api/v2/schedule
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/schedule"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"Content\":\"message\",\"ScheduleDate\":\"send_in\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/schedule"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"Content\":\"message\",\"ScheduleDate\":\"send_in\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Receivers	sim	Destinatários que irão receber o SMS. Para dois ou mais destinatários, separe por uma vírgula os telefones, formato: DDD + Número, pode-se enviar para ate 100 telefones dessa forma.
Content	sim	Conteúdo da mensagem que vai ser recebida pelo número que o SMS será enviado. Nos casos que o conteúdo do SMS superar 160 caracteres, será tarifado mais de um crédito a cada 153 caracteres. Algumas operadoras como a Oi e Sercomtel não suportam concatenação da mensagens, então serão recebidos SMS separadamente.
ScheduleDate	sim	Data de agendamento que o SMS deve ser disparado, padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
RequestUniqueId	Este campo é o ID da sua requisição.
Content	Conteúdo da mensagem que foi recebida pelo número retornado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	O parâmetro ‘Content’ deve ser informado com conteúdo.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
400	A data de agendamento não pode ser retroativa.
400	O parametro 'ScheduleDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Agendar SMS / Regra de Resposta Automática
Com este recurso, é possivel programar a data e horário de envio de SMS para serem enviados, e quando o SMS for respondido, é possivel enviar uma resposta de forma automática, baseado em um contexto previamente configurado.
Para utilizar este recurso, é necessário que você acesse a opção “Resposta Automática” no menu “Configurações” no painel de SMS, cadastre uma regra de resposta automática e informe o nome que foi cadastrado no campo ContextRuleName no momento que for usar o endpoint.
URL do Endpoint: https://sms.comtele.com.br/api/v2/schedulecontextmessage
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/schedulecontextmessage"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"ScheduleDate\":\"send_in\",\"ContextRuleName\":\"rule_name\",\"ForceContent\":\"force_content\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/schedulecontextmessage"

  payload = "{\"Sender\":\"sender_id\",\"Receivers\":\"phone_number\",\"ScheduleDate\":\"send_in\",\"ContextRuleName\":\"rule_name\",\"ForceContent\":\"force_content\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Receivers	sim	Destinatários que irão receber o SMS. Para dois ou mais destinatários, separe por uma vírgula os telefones, formato: DDD + Número, pode-se enviar para ate 100 telefones dessa forma.
ContextRuleName	sim	Neste campo deve ser informado o nome da regra que o contexto de resposta foi programado e cadastrado no sistema que no caso será usado neste envio.
ScheduleDate	sim	Data de agendamento que o SMS deve ser disparado, padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
ForceContent	não	Se este campo for preenchido, o conteúdo da mensagem será ele, se ele não for preenchido, o sistema irá usar o conteúdo pré-cadastrado no Painel SMS na Regra de Resposta Automática.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	E necessario informar o nome da regra de resposta automatica.
400	Nao foi possivel encontrar uma regra de resposta automatica cadastrada com o nome informado.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
400	A data de agendamento não pode ser retroativa.
400	O parametro 'ScheduleDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Agendar SMS / Grupos de Contatos
Com este recurso, é possivel programar a data e horário de envio de SMS para um grupo de contatos.
Para usar este recuso, é necessário ter grupos de contatos já cadastrados em nossa aplicação, caso ainda não tenha feito isso, dê uma olhadinha no recurso Cadastrar Grupos e Adicionar Contatos / Grupos
URL do Endpoint: https://sms.comtele.com.br/api/v2/schedulecontactmessage
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
import requests

url = "https://sms.comtele.com.br/api/v2/schedulecontactmessage"

payload = "{\"Sender\":\"sender_id\",\"Content\":\"message\",\"GroupName\":\"group_name\",\"ScheduleDate\":\"send_in\"}"
headers = {
    'content-type': "application/json",
    'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)
import requests

url = "https://sms.comtele.com.br/api/v2/schedulecontactmessage"

payload = "{\"Sender\":\"sender_id\",\"Content\":\"message\",\"GroupName\":\"group_name\",\"ScheduleDate\":\"send_in\"}"
headers = {
    'content-type': "application/json",
    'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)

Campos	Obrigatório	Descrição
Sender	não	Este campo é usado só internamente, e geralmente é bem util para controle. Por exemplo você pode informar um id interno, que ele será exibido no relatório, dispensando que você faça “de para” dos ids da Comtele com o sistema que está integrando.
Content	sim	Conteúdo da mensagem que vai ser recebida pelo número que o SMS será enviado. Nos casos que o conteúdo do SMS superar 160 caracteres, será tarifado mais de um crédito a cada 153 caracteres. Algumas operadoras como a Oi e Sercomtel não suportam concatenação da mensagens, então serão recebidos SMS separadamente.
GroupName	sim	Nome do grupo de contatos, com todos os telefones que receberão o SMS.
ScheduleDate	sim	Data de agendamento que o SMS deve ser disparado, padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }
  {
    "Success": true, 
    "Object": null, 
    "Message": "A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios."
  }

Retornos Previsíveis
HTTP Status	Descrição
200	A requisicao de envio foi encaminhada para processamento com sucesso. Voce podera acompanhar o status pelos relatorios.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	E necessario informar o grupo de contatos que irao receber o SMS
400	Nao foi possivel encontrar um grupo de contatos cadastrado com o nome informado.
400	O parâmetro 'Content’ deve ser informado com conteúdo.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
400	A data de agendamento não pode ser retroativa.
400	O parametro 'ScheduleDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Cancelar Agendamento de SMS
Com este recurso, é possível cancelar o agendamento de SMS

URL do Endpoint: https://sms.comtele.com.br/api/v2/cancelrequest
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
import requests

url = "https://sms.comtele.com.br/api/v2/cancelrequest"

payload = "{\"RequestUniqueId\":\"XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"}"
headers = {
    'content-type': "application/json",
    'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)
import requests

url = "https://sms.comtele.com.br/api/v2/cancelrequest"

payload = "{\"RequestUniqueId\":\"XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"}"
headers = {
    'content-type': "application/json",
    'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)

Campos	Obrigatório	Descrição
RequestUniqueId	Sim	Este campo é retornado na criação do agendamento do SMS.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "As mensagens do token informado que ainda estavam em rota de processamento foram canceladas."
  }
  {
    "Success": true, 
    "Object": {
      "requestUniqueId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
    "Message": "As mensagens do token informado que ainda estavam em rota de processamento foram canceladas."
  }

Retornos Previsíveis
HTTP Status	Descrição
200	As mensagens do token informado que ainda estavam em rota de processamento foram canceladas.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	E necessario informar o grupo de contatos que irao receber o SMS
400	Nao foi possivel encontrar um grupo de contatos cadastrado com o nome informado.
400	O parâmetro 'Content’ deve ser informado com conteúdo.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
400	A data de agendamento não pode ser retroativa.
400	O parametro 'ScheduleDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Autenticação Dois Fatores via SMS
Nesta seção, são abordados dois recursos disponíveis para envio de SMS no cenário de autenticacão em dois fatores, por meio destes recursos, a Comtele automaticamente gera o código, envia e valida de acordo com o retorno do seu destinatário, dispensando você ter que desenvolver este controle em sua aplicação. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Enviar SMS / Dois Fatores
Com este recurso, é possivel enviar via SMS de forma instantânea um código de autenticação para o destinatário, que pode ser validado posteriormente no endpoint a seguir: Validar Código / Dois Fatores.

URL do Endpoint: https://sms.comtele.com.br/api/v2/tokenmanager
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/tokenmanager"

  payload = "{
  \"PhoneNumber\":\"phone_number\",
  \"Prefix\":\"company_from\",
  \"EnforceSecureValidation\":\"bool\",
  \"ExpireInMinutes\":\"minute\"
  }"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/tokenmanager"

  payload = "{
  \"PhoneNumber\":\"phone_number\",
  \"Prefix\":\"company_from\",
  \"EnforceSecureValidation\":\"bool\",
  \"ExpireInMinutes\":\"minute\"
  }"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
PhoneNumber	sim	Número de telefone do destinatário que você quer enviar um código para autenticação de dois fatores.
Prefix	não	Neste campo, você pode informar ao destinatário a origem do token recebido, por exemplo: Sua Empresa: Codigo de Autorizacao xxxxxx.
EnforceSecureValidation	não	Usando este recurso, a validação do token será realizada em conjunto com número de telefone que foi enviado. É necessário informar o telefone no momento da validação.
ExpireInMinutes	não	Neste campo, você pode informar qual o limite em minutos que o token poderá ser validado.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true, 
  "Object": {
    "Prefix": "", 
    "PhoneNumber : "",
    "ExpireInMinutes": "",
    "EnforceSecureValidation": ""
    }, 
  "Message": 
  "O token foi criado com sucesso."
}
{
  "Success": true, 
  "Object": {
    "Prefix": "", 
    "PhoneNumber : "",
    "ExpireInMinutes": "",
    "EnforceSecureValidation": ""
    }, 
  "Message": 
  "O token foi criado com sucesso."
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Prefix	Será retornado o prefixo que foi informado
PhoneNumber	Será retornado o telefone que foi informado
ExpireInMinutes	Será retornado o tempo de expiração do token em minutos que foi informado
EnforceSecureValidation	Será retornada a opção que foi informada
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O token foi criado com sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	Não foi possível continuar, pois a quantidade de créditos é insuficiente. Para efetuar o envio é necessário ao menos 1 créditos.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Validar Código / Dois Fatores
Com este recurso, é possivel validar o token recebido e informado pelo usuário que recebeu o SMS, enviado pelo endpoint anterior anterior: Enviar SMS / Dois Fatores.

URL do Endpoint: https://sms.comtele.com.br/api/v2/tokenmanager
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: PUT

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/tokenmanager"

  payload = "{\"TokenCode\":\"inputed_user_token\",PhoneNumber\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/tokenmanager"

  payload = "{\"TokenCode\":\"inputed_user_token\",PhoneNumber\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
TokenCode	sim	Token recebido pelo usuário, e que deve ser informado para ser realizada a validação.
PhoneNumber	não	Número de telefone do destinatário que será validado juntamente com o token recebido, caso a opção "EnforceSecureValidation: true" tenha sido utilizada, para que seja verificado se o token utilizado realmente pertence ao numero de telefone cadastrado.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true, 
  "Object": {
    "TokenCode": "XXXXXX",
    "PhoneNumber: "DDD+Telefone"
    },
  "Message": "O token informado foi validado com sucesso."
}
{
  "Success": true, 
  "Object": {
    "TokenCode": "XXXXXX",
    "PhoneNumber: "DDD+Telefone"
    },
  "Message": "O token informado foi validado com sucesso."
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
TokenCode	Token que foi recebido e inserido para ser validado.
PhoneNumber	Número de telefone caso tenha sido utilizado o campo "EnforceSecureValidation": true, para aumentar a segurança de validação e validar o número de telefone e token recebido.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O token informado foi validado com sucesso.
400	O código informado está expirado.
400	O código informado é inválido para este telefone.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	É necessário informar ao menos um destinatário que irá receber o SMS.
400	O token informado é invalido.
400	Este token já foi utilizado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	houve um time out na requisição ao efetuar a conexão com o endpoint.
503	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
Relatórios
Nesta seção, são abordados todos os recursos disponíveis para consulta de SMS enviados. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Consultar Relatório / Detalhado.
Com este recurso, é possivel consultar todos os detalhes disponíveis dos SMS enviados.
Este recurso possui um cooldown de 30 segundos que é compartilhando entre os recursos de Relatório de Regra de Resposta Automática, Relatório de Respostas e Histórico de Recargas, ou seja, somente uma chamada a cada 30 segundos a estes recursos podem ser realizadas.
URL do Endpoint: https://sms.comtele.com.br/api/v2/detailedreporting
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/detailedreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","Delivered":"filter_status","Receiver":"receiver","RequestUniqueId":"unique_id"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/detailedreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","Delivered":"filter_status","Receiver":"receiver","RequestUniqueId":"unique_id"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)

Campos	Obrigatorio	Descrição
StartDate	sim	Data inicial do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
EndDate	sim	Data final do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
Delivered	não	Status de entrega dos SMS poderão ser filtrados e retornados nos relatórios. Os valores ‘option’ podem ser substituído por 'all’, para ser exibido todos os SMS entregues e não entregues no período; 'true’ para exibir apenas os SMS entregues; Por fim 'false’ para exibir somente os SMS não entregues.
Receiver	não	Destinatário que recebeu o SMS no formato: 55+DDD+Número.
RequestUniqueId	não	Este campo é retornado no envio do SMS e pode ser armazenado na sua base.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true, 
  "Object": [
    {
      "Receiver": "", 
      "Content": "", 
      "Status": "", 
      "ScheduleDate": "", 
      "RequestDate": "", 
      "SystemMessage": "", 
      "DlrStatus": "", 
      "Sender": "",
      "Credits": int
    }
  ],
  "Message": null
}
{
  "Success": true, 
  "Object": [
    {
      "Receiver": "", 
      "Content": "", 
      "Status": "", 
      "ScheduleDate": "", 
      "RequestDate": "", 
      "SystemMessage": "", 
      "DlrStatus": "", 
      "Sender": "",
      "Credits": int
    }
  ],
  "Message": null
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Receiver	Destinatários que receberam o SMS. Formato: DDD + Número.
Content	Conteúdo da mensagem que foi recebida pelo número retornado.
Status	É o campo de status do SMS enviado, pode ser retornado Processed, para SMS que estão na fila de entrega; Delivered para SMS entregues; Error para casos que ocorreu algum erro no envio e o SMS não foi entregue.
ScheduleDate	É o campo que retorna a data que o SMS foi agendado, caso tenha sido feito agendamento, se o envio foi realizado de forma instantânea será retornado null. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
RequestDate	É o campo que retorna a data que o SMS foi requisitado. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00)
SystemMessage	Mensagem detalhada sobre o resultado da operação.
Retornos previsíveis:
A mensagem não foi enviada, pois não foi aceita pela operadora de destino.
• Não tarifado: Quando o número de telefone é válido, segue os padrões numéricos, mas não foi encontrado em nenhuma operadora. Ou seja, é um número inexistente.
A mensagem não foi enviada, pois foi rejeitada pela operadora de destino.
• Tarifado: O conteúdo da mensagem pode ter violado alguma regra estabelecida nos termos e condições de uso. Ex: conteúdo impróprio, uso indevido de alguma marca ou instituição que exige autorização para veiculação de conteúdo.
Envio cancelado pelo usuário.
• Não Tarifado: Quando há um agendamento e o mesmo foi cancelado antes do envio ter sido realizado às operadoras.
A mensagem não foi enviada, pois foi recusada pela operadora de destino.
• Não Tarifado: Quando a entrega não pode ser realizada por recusa técnica das operadoras. Pode ocorrer se houverem problemas técnicos e de indisponibilidade temporária na operadora.
A mensagem foi entregue a operadora, porém não foi entregue ao destinatário final.
• Tarifado: Quando a entrega não pode ser realizada, geralmente ocorre para um número de telefone desativado permanentemente há muito tempo.
A mensagem não pode ser enviada, pois excedeu o limite de tentativas.
• Não Tarifado: Quando esgotamos as tentativas de reenviar suas mensagens caso a operadora tenha retornado algum problema temporário que impossibilitou a entrega ser efetuada.
A mensagem foi enviada com sucesso para a operadora.
• Tarifado. Sua mensagem passou pelas pré-validações e está com a operadora para ser entregue ao celular de destino. Nessa etapa o tempo pode sofrer alguns atrasos por diversas questões. Ex: sinal de rede, aparelho desligado e configurações específicas do aparelho.
A mensagem não foi enviada, pois o número informado não é válido.
• Não Tarifado. O número informado não segue os padrões de números válidos.
O destinatário, remetente ou conteúdo está em branco.
• Não Tarifado. Ops, você esqueceu de inserir o destinatário ou sua mensagem.
O destinatário encontra-se em sua Lista de Bloqueios e não pode receber mensagens.
• Não Tarifado. Você anteriormente adicionou esse número em sua lista de restrições e por isso essa mensagem não pode seguir.
DlrStatus	É o campo que informa mais detalhes sobre status do SMS enviado, pode ser retornado Delivered para SMS entregues; Undelivered para SMS não entregues; Rejected para SMS que foram rejeitados por possuir conteúdo inadequado ou telefone incorreto; Expired para SMS que excederam o limite de tentativas de entrega; Accepted, para SMS que estão na fila de entrega
Sender	Este campo é o que foi passado um id interno no endpoint de envio do SMS. Ele dispensam que você faça “de/para” dos ids da Comtele com o sistema que está integrando.
Credits	Retorna a quantidade de créditos consumidos na mensagem.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes de SMS enviados de acordo com a data selecionada.
202	Nao foi possivel continuar, pois este metodo da API possui limite de tempo entre requisicoes. O tempo de espera entre sua ultima requisicao e esta e de 30 segundos e ainda faltam XX segundos.
400	O parametro 'StartDate’ deve ser informado com conteudo.
400	O parametro 'EndDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar Relatório / Regra de resposta automática
Com este recurso, é possivel consultar todos os detalhes disponíveis dos SMS enviados/recebidos utilizando a funcionalidade de regra de resposta automatica.
Este recurso possui um cooldown de 30 segundos que é compartilhando entre os recursos de Relatório Detalhado, Relatório de Respostas e Histórico de Recargas, ou seja, somente uma chamada a cada 30 segundos a estes recursos podem ser realizadas.

URL do Endpoint: https://sms.comtele.com.br/api/v2/contextreporting
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contextreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","ContextRuleName":"rule_name"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contextreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","ContextRuleName":"rule_name"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)

Campos	Obrigatório	Descrição
StartDate	sim	Data inicial do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00).
EndDate	sim	Data final do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00).
ContextRuleName	não	Neste campo pode ser informado o nome da regra que o contexto de resposta foi programado e cadastrado no sistema para filtrar os resultados somente de uma regra, se não for informado não será aplicado filtro e todos os dados serão exibidos.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true,
  "Object":  [
    {
      "Sender": "", 
      "Content": "", 
      "Received": "", 
      "ContextRuleName": "", 
      "StatusMessage": ""
    }
  ],
  "Message": null
}
{
  "Success": true,
  "Object":  [
    {
      "Sender": "", 
      "Content": "", 
      "Received": "", 
      "ContextRuleName": "", 
      "StatusMessage": ""
    }
  ],
  "Message": null
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Sender	Este campo é o que foi passado um id interno no endpoint de envio do SMS. Ele dispensam que você faça “de/para” dos ids da Comtele com o sistema que está integrando.
Content	Conteúdo da mensagem que foi recebida pelo número retornado.
ContextRuleName	Nome da regra que o contexto de resposta foi utilizado.
StatusMessage	É o campo de status que determina a direção do SMS, se é Enviado ou Recebido.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes de SMS enviados de acordo com a data selecionada.
202	Nao foi possivel continuar, pois este metodo da API possui limite de tempo entre requisicoes. O tempo de espera entre sua ultima requisicao e esta e de 30 segundos e ainda faltam XX segundos.
400	O parametro 'StartDate’ deve ser informado com conteudo.
400	O parametro 'EndDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar Relatório / Respostas
Com este recurso, é possivel consultar todos os detalhes disponíveis dos SMS recebidos utilizando a funcionalidade de recebimento de respostas.
Este recurso possui um cooldown de 30 segundos que é compartilhando entre os recursos de Relatório Detalhado, Relatório de Regra de Resposta Automática e Histórico de Recargas, ou seja, somente uma chamada a cada 30 segundos a estes recursos podem ser realizadas.

URL do Endpoint: https://sms.comtele.com.br/api/v2/replyreporting
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/replyreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","Sender":"phone_number","SenderName":"sender"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/replyreporting"

  querystring = {"StartDate":"begin_search_data","EndDate":"end_search_data","Sender":"phone_number","SenderName":"sender"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers, params=querystring)

  print(response.text)

Campos	Obrigatório	Descrição
StartDate	sim	Data inicial do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00).
EndDate	sim	Data final do período que os envios serão consultados. Padrão ISO8601 formato: YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45-02:00).
Sender	não	Pode ser passado em branco caso não queira filtrar uma resposta. É o número do telefone de quem ou o que respondeu o SMS.
SenderName	não	Pode ser passado em branco caso não queira filtrar uma resposta. É o Sender que foi enviado no Envio do SMS.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true,
  "Object": [
    {
      "Sender": "",
      "SentContent": "",
      "ReceivedContent": "",
      "ReceivedDate": "",
      "SenderName": ""
    }
  ],
  "Message": null
}

{
  "Success": true,
  "Object": [
    {
      "Sender": "",
      "SentContent": "",
      "ReceivedContent": "",
      "ReceivedDate": "",
      "SenderName": ""
    }
  ],
  "Message": null
}


Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Sender	Este campo, diferentemente dos outros endpoints com recursos de relatório, é o número do telefone de quem ou o que respondeu o SMS, número de origem da resposta recebida.
SentContent	Conteúdo da mensagem que foi enviada para o número do telefone de destino..
ReceivedContent	Conteúdo da mensagem respondida pelo número do telefone de destino.
ReceivedDate	Data que a resposta foi recebida.
SenderName	Este campo é o que foi passado um id interno no endpoint de envio do SMS. Ele dispensam que você faça “de/para” dos ids da Comtele com o sistema que está integrando.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes de SMS enviados de acordo com a data selecionada.
202	Nao foi possivel continuar, pois este metodo da API possui limite de tempo entre requisicoes. O tempo de espera entre sua ultima requisicao e esta e de 30 segundos e ainda faltam XX segundos.
400	O parametro 'StartDate’ deve ser informado com conteudo.
400	O parametro 'EndDate’ deve ser informado com conteudo.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Receber Respostas / Callback
Com este recurso, é possivel receber ao invés de consultar todos os detalhes disponíveis dos SMS recebidos utilizando a funcionalidade de recebimento de respostas.

Configuração da URL
Antes de mais nada, para receber as respostas via callback, é necessário que você ja tenha construído em sua aplicação um webhook para receber a resposta no padrão a seguir, além disso é necessário que o endpoint do seu webhook seja público e que você tenha configurado em sua conta seguindo os seguintes passos:
1 - Acessar o painel em https://sms.comtele.com.br, e inserir os dados de acesso de sua conta.
2 - Na opção Configurações do menu lateral, clique em Alterar Meus Dados.
3 - Na tela de edição dos seus dados pessoais, localize a seção CONFIGURAÇÕES e a opção URL de Callback de Respostas, insira a URL do webhook que irá receber as respostas e clique no botão salvar.
Feito esses passos, em um intervalo máximo de 30 minutos, todas as respostas que estiverem atrelados aos SMS enviados pelo seu usuário serão retornados via callback.

Exemplo do objeto da resposta
copy
  {
    "Sender":string,
    "SentContent":string,
    "ReceivedContent":string,
    "ReceiveDate":"YYYY-MM-DDThh:mm:ss.sTZD",
    "SenderName":string
  }
  {
    "Sender":string,
    "SentContent":string,
    "ReceivedContent":string,
    "ReceiveDate":"YYYY-MM-DDThh:mm:ss.sTZD",
    "SenderName":string
  }

Campos do Retorno
Campos	Descrição
Sender	Este campo, diferentemente dos outros endpoints com recursos de relatório, é o número do telefone de quem ou o que respondeu o SMS, número de origem da resposta recebida.
SentContent	Conteúdo da mensagem que foi enviada para o número do telefone de destino.
ReceivedContent	Conteúdo da mensagem respondida pelo número do telefone de destino.
ReceivedDate	Data que a resposta foi recebida.
SenderName	Este campo é o que foi passado um id interno no endpoint de envio do SMS. Ele dispensam que você faça “de/para” dos ids da Comtele com o sistema que está integrando.
Receber Status / Callback
Com este recurso, é possivel receber os Status do seu SMS em tempo real.

Configuração da URL
Antes de mais nada, para receber os status via callback, é necessário que você ja tenha construído em sua aplicação um webhook para receber a resposta no padrão a seguir, além disso é necessário que o endpoint do seu webhook seja público e que você tenha configurado em sua conta seguindo os seguintes passos:
1 - Acessar o painel em https://sms.comtele.com.br, e inserir os dados de acesso de sua conta.
2 - Na opção Configurações do menu lateral, clique em Alterar Meus Dados.
3 - Na tela de edição dos seus dados pessoais, localize a seção CONFIGURAÇÕES e a opção URL de Callback de Status, insira a URL do webhook que irá receber as respostas e clique no botão salvar.
Feito esses passos, em um intervalo máximo de 30 minutos, todas os status que estiverem atrelados aos SMS enviados pelo seu usuário serão retornados via callback.

Exemplo do objeto da resposta
copy
  {
    "Sender":string,
    "Status":string,
    "PhoneNumber":string,
    "StatusDate":"YYYY-MM-DDThh:mm:ss.sTZD",
  }
  {
    "Sender":string,
    "Status":string,
    "PhoneNumber":string,
    "StatusDate":"YYYY-MM-DDThh:mm:ss.sTZD",
  }

Campos do Retorno
Campos	Descrição
Sender	Este campo é o que foi passado um id interno no endpoint de envio do SMS.
Status	É o campo de status do SMS enviado, ele retorna em tempo real ao webhook o status do seu envio.
PhoneNumber	Número de telefone do destinatário da mensagem.
StatusDate	Data que o status foi recebido (UTC).
Respostas Automáticas
Nesta seção é abordada a criação de regras de resposta automática, que podem ser utilizadas na hora do envio para criar um fluxo automatizado de acordo com a resposta do cliente para a mensagem enviada.

Cadastrar / Respostas Automáticas
Com este recurso, é possivel cadastrar respostas automáticas que podem ser usadas no momento do envio.
URL do Endpoint: https://sms.comtele.com.br/api/v2/sendingcontextrules
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendingcontextrules"

  payload = "{\"Name\":\"rule_name\",\"Message\":\"message\":\"PositiveContext\":\"positive_input\":\"PositiveResponse\":\"response_for_positive_input\":\"NegativeContext\":\"negative_input\":\"NegativeResponse\":\"response_for_negative_input\":\"DefaultResponse\":\"default_response\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/sendingcontextrules"

  payload = "{\"Name\":\"rule_name\",\"Message\":\"message\":\"PositiveContext\":\"positive_input\":\"PositiveResponse\":\"response_for_positive_input\":\"NegativeContext\":\"negative_input\":\"NegativeResponse\":\"response_for_negative_input\":\"DefaultResponse\":\"default_response\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Name	sim	Nome da resposta automática, este campo que deve ser informado no método de envio.
Message	sim	Mensagem que será enviada para o cliente.
PositiveContext	sim	Conteúdo que será considerado como resposta positiva do cliente.
PositiveResponse	sim	Mensagem que será enviada caso haja resposta positiva do cliente.
NegativeContext	sim	Conteúdo que será considerado como resposta negativa do cliente.
NegativeResponse	sim	Mensagem que será enviada caso haja resposta negativa do cliente.
DefaultResponse	sim	Mensagem que será enviada caso resposta do cliente não caia nas regras de positiva/negativa.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "Name": "rule_name",
      "Message": "message",
      "PositiveContext": "positive_input",
      "PositiveResponse": "response_for_positive_input",
      "NegativeContext": "negative_input",
      "NegativeResponse": "response_for_negative_input",
      "DefaultResponse": "default_response"
    },
    "Message": "A resposta automatica foi criada com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "Name": "rule_name",
      "Message": "message",
      "PositiveContext": "positive_input",
      "PositiveResponse": "response_for_positive_input",
      "NegativeContext": "negative_input",
      "NegativeResponse": "response_for_negative_input",
      "DefaultResponse": "default_response"
    },
    "Message": "A resposta automatica foi criada com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Name	Nome da resposta automática que foi adicionada.
Message	Mensagem da resposta automática que foi adicionada.
PositiveContext	Conteúdo que será considerado como resposta positiva do cliente.
PositiveResponse	Mensagem que será enviada caso haja resposta positiva do cliente.
NegativeContext	Conteúdo que será considerado como resposta negativa do cliente.
NegativeResponse	Mensagem que será enviada caso haja resposta negativa do cliente.
DefaultResponse	Mensagem que será enviada caso resposta do cliente não caia nas regras de positiva/negativa.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	A resposta automática foi criada com sucesso.
202	Não foi possível continuar, pois este método da API possui limite de tempo entre requisições. O tempo de espera entre sua última requisição e esta é de 30 segundos e ainda faltam 29 segundos.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	Requisição possui algum campo obrigatório faltando.
400	O nome da resposta automática informada já existe, por favor escolha um novo nome.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Grupo de Contatos
Nesta seção, são abordados recursos disponíveis para segmentação de contatos por grupos, que podem ser utilizados na hora do envio, facilitando tanto a rotina de armazemento destes telefones, quanto a de envio posteriormente para os contatos. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Cadastrar / Grupos de Contatos
Com este recurso, é possivel cadastrar grupos de contatos para segmentar contatos em listas que podem ser usadas no momento do envio.
URL do Endpoint: https://sms.comtele.com.br/api/v2/contactgroup
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"Name\":\"group_name\",\"Description\":\"group_description\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"Name\":\"group_name\",\"Description\":\"group_description\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Name	sim	Nome do grupo para segmentação dos contatos, este campo que deve ser informado no método de envio.
Description	não	Breve descrição do grupo, pode ser usado para inserir detalhes e informações adicionais sobre o grupo.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "Name": "group_name",
      "Description": "group_description"
    },
    "Message": "O grupo de contatos foi criado com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "Name": "group_name",
      "Description": "group_description"
    },
    "Message": "O grupo de contatos foi criado com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Name	Nome do grupo que foi adicionado.
Description	Descrição do grupo que foi adicionado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O grupo de contatos foi criado com sucesso.
202	Não foi possível continuar, pois este método da API possui limite de tempo entre requisições. O tempo de espera entre sua última requisição e esta é de 30 segundos e ainda faltam 29 segundos.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O nome do grupo deve ser informado.
400	O nome do grupo informado já existe, por favor escolha um novo nome.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar / Grupos de Contatos
Com este recurso, é possivel consultar os grupos de contatos cadastrados.
URL do Endpoint: https://sms.comtele.com.br/api/v2/contactgroup/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup/{group_name}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup/{group_name}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
{group_name}	não	Caso queira filtrar os detalhes somente de um grupo é só informar na querystring, se não informado será retornado todos os grupos cadastrados no seu usuário.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true,
  "Object": [
    {
      "Id": comtele_group_id,
      "Name": "group_name",
      "Description": "group_description",
      "TotalContacts": 1,
      "LastUsed": "yyyy-MM-dd HH:mm:ss.ms"
    }
  ],
  "Message": null
}
{
  "Success": true,
  "Object": [
    {
      "Id": comtele_group_id,
      "Name": "group_name",
      "Description": "group_description",
      "TotalContacts": 1,
      "LastUsed": "yyyy-MM-dd HH:mm:ss.ms"
    }
  ],
  "Message": null
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Id	Id junto a Comtele do grupo adicionado, campo numérico.
Name	Nome do grupo.
Description	Descrição do grupo.
TotalContacts	Número total de contatos atualmente no grupo.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do grupo ou dos grupos de contatos consultados com o critério selecionado.
400	Nao foi encontrado nenhum grupo com o nome {group_name}
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Excluir / Grupos de Contatos
Com este recurso, é possivel excluir grupos de contatos cadastrados.
URL do Endpoint: https://sms.comtele.com.br/api/v2/contactgroup
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup/{group_name}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("DELETE", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup/{group_name}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("DELETE", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Name	sim	Nome do grupo para segmentação dos contatos, este campo que deve ser informado no método de envio.
Description	não	Breve descrição do grupo, pode ser usado para inserir detalhes e informações adicionais sobre o grupo.
Exemplo de Retorno de Sucesso
copy
{
  "Success": true,
  "Object": null,
  "Message": "O grupo de contatos foi removido com sucesso"
}
{
  "Success": true,
  "Object": null,
  "Message": "O grupo de contatos foi removido com sucesso"
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O grupo de contatos foi removido com sucesso.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Cadastrar Contatos / Grupos de Contatos
Com este recurso, é possivel cadastrar contatos em grupos para segmentar estes contatos em listas que podem ser usadas no momento do envio.
URL do Endpoint: https://sms.comtele.com.br/api/v2/contactgroup
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: PUT

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"GroupName\":\"group_name\",\"Action\":\"add_number\",\"ContactName\":\"contact_name\",\"ContactPhone\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"GroupName\":\"group_name\",\"Action\":\"add_number\",\"ContactName\":\"contact_name\",\"ContactPhone\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
GroupName	sim	Nome do grupo que ja foi cadastrado para a segmentação dos contatos.
Action	sim	Neste campo o parâmetro “add_number” obrigatóriamente deve ser informado para adicionar os contatos ao grupo.
ContactName	não	Neste campo, você pode adicinar o nome do contato, que poderá ser usado no momento do envio via painel para fazer envios personalizados.
ContactPhone	sim	Número de telefone do contato que está adicionando para receber os SMS.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "GroupName": "group_name",
      "Action": "add_number",
      "ContactPhone": "phone_number",
      "ContactName": "contact_name"
    },
    "Message": "O contato foi inserido no grupo com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "GroupName": "group_name",
      "Action": "add_number",
      "ContactPhone": "phone_number",
      "ContactName": "contact_name"
    },
    "Message": "O contato foi inserido no grupo com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
GroupName	Nome do grupo em que o contato foi adicionado.
Action	add_number, ação que foi informada para adicionar o número de telefone do contato.
ContactPhone	Número de telefone do contato que foi adicionado.
ContactName	Nome do contato que foi adicionado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O contato foi inserido no grupo com sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O grupo informado nao foi encontrado.
400	O numero de telefone deve ser informado.
400	O parametro Action deve ser informado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Excluir Contatos / Grupos de Contatos
Com este recurso, é possivel remover contatos em grupos segmentados, para que estes contatos não recebam mais SMS destas listas quando usadas no momento do envio.
URL do Endpoint: https://sms.comtele.com.br/api/v2/contactgroup
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: PUT

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"GroupName\":\"group_name\",\"Action\":\"remove_number\",\"ContactName\":\"contact_name\",\"ContactPhone\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/contactgroup"

  payload = "{\"GroupName\":\"group_name\",\"Action\":\"remove_number\",\"ContactName\":\"contact_name\",\"ContactPhone\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("PUT", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
GroupName	sim	Nome do grupo que ja foi cadastrado para a segmentação dos contatos.
Action	sim	Neste campo o parâmetro “remove_number” obrigatóriamente deve ser informado para remover os contatos ao grupo.
ContactName	não	Neste campo, você pode adicinar o nome do contato, que poderá ser usado no momento do envio via painel para fazer envios personalizados.
ContactPhone	sim	Número de telefone do contato que está adicionando para receber os SMS.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "GroupName": "group_name",
      "Action": "remove_number",
      "ContactPhone": "phone_number",
      "ContactName": "contact_name"
    },
    "Message": "O contato foi removido do grupo com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "GroupName": "group_name",
      "Action": "remove_number",
      "ContactPhone": "phone_number",
      "ContactName": "contact_name"
    },
    "Message": "O contato foi removido do grupo com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
GroupName	Nome do grupo em que o contato foi adicionado.
Action	remove_number, ação que foi informada para remover o número de telefone do contato.
ContactPhone	Número de telefone do contato que foi adicionado.
ContactName	Nome do contato que foi adicionado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O contato foi removido do grupo com sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O grupo informado nao foi encontrado.
400	O numero de telefone deve ser informado.
400	O parametro Action deve ser informado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Lista de Bloqueios
Cadastrar Contatos / Lista de Bloqueios
Com este recurso, é possivel adicionar números de telefone em uma Lista de Bloqueios para não receber mais SMS proveniente de sua conta, assim, você pode se despreocupar com uma verificação antes de mandar uma mensagem para números que não desejam mais receber seus SMS, basta adicionar estes telefones em sua Lista de Bloqueios, e caso seja enviado um SMS para este número, não será consumido crédito, o SMS não será entregue e aparecerá no relatório detalhado, uma mensagem informando que o número não recebeu o SMS pois está cadastrado na Lista de Bloqueios.
URL do Endpoint: https://sms.comtele.com.br/api/v2/blacklist
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist"

  payload = "{\"PhoneNumber\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist"

  payload = "{\"PhoneNumber\":\"phone_number\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
PhoneNumber	sim	Número de telefone do destinatário que não deve mais receber qualquer SMS enviado por sua conta.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "PhoneNumber": "",
      "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
    },
    "Message": "O numero foi inserido na Lista de Bloqueios com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "PhoneNumber": "",
      "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
    },
    "Message": "O numero foi inserido na Lista de Bloqueios com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
PhoneNumber	Número de telefone que foi adicionado na Lista de Bloqueios.
BlacklistDate	Data que o telefone foi adicionado na Lista de Bloqueios.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	O numero foi inserido na Lista de Bloqueios com sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O telefone deve ser informado
400	O número informado é inválido.
400	O campo “PhoneNumber” não suporta texto, somente números.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar Contatos / Lista de Bloqueios
Com este recurso, é possivel consultar os números de telefone e a data que foram adicionados na sua Lista de Bloqueios.
URL do Endpoint: https://sms.comtele.com.br/api/v2/blacklist/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist/{PhoneNumber}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist/{PhoneNumber}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
PhoneNumber	não	Número de telefone do destinatário que não deve mais receber qualquer SMS enviado por sua conta.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": [
      {
        "PhoneNumber": "phone_number",
        "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
      }
    ],
    "Message": null
  }
  {
    "Success": true,
    "Object": [
      {
        "PhoneNumber": "phone_number",
        "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
      }
    ],
    "Message": null
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
PhoneNumber	Número de telefone que foi adicionado na Lista de Bloqueios.
BlacklistDate	Data que o telefone foi adicionado na Lista de Bloqueios.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do número ou dos números de telefones consultados com o critério selecionado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Excluir Contatos / Lista de Bloqueios
Com este recurso, é possivel remover números de telefone que foram adicionados na Lista de Bloqueios para voltar a receber os SMS provenientes de sua conta. URL do Endpoint: https://sms.comtele.com.br/api/v2/blacklist/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: DELETE

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist/{PhoneNumber}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("DELETE", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/blacklist/{PhoneNumber}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("DELETE", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
PhoneNumber	não	Número de telefone do destinatário que não deve mais receber qualquer SMS enviado por sua conta.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "PhoneNumber": "",
      "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
    },
    "Message": "O numero foi removido da Lista de Bloqueios com sucesso."
  }
  {
    "Success": true,
    "Object": {
      "PhoneNumber": "",
      "BlacklistDate": "yyyy-MM-ddTHH:mm:ss.ms"
    },
    "Message": "O numero foi removido da Lista de Bloqueios com sucesso."
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
PhoneNumber	Número de telefone que foi removido na Lista de Bloqueios.
BlacklistDate	Data que o telefone foi adicionado na Lista de Bloqueios.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do número ou dos números de telefones consultados com o critério selecionado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Encurtador de URL
Criar / URL Encurtada
Com este recurso, é possivel criar URLs encurtadas para reduzir o tamanho de suas URLs para que elas ocupem menos espaço em suas mensagens. Também é possível medir a quantidade de acessos que foram feitos na URL.
URL do Endpoint: https://sms.comtele.com.br/api/v2/accounturls
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls"

payload = "{\"Url\":\"sua_url_original\"}"
headers = {
'content-type': "application/json",
'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls"

payload = "{\"Url\":\"sua_url_original\"}"
headers = {
'content-type': "application/json",
'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}

response = requests.request("POST", url, data=payload, headers=headers)

print(response.text)

Campos	Obrigatório	Descrição
Url	sim	Sua URL original longa que deseja encurtar.
Exemplo de Retorno de Sucesso
copy
  
{
   "Success": true,
   "Object": {
      "Code": "",
      "OriginalUrl": "",
      "UsageCount": "0",
      "UsageDate": "yyyy-MM-ddTHH:mm:ss.ms",
      "Status": "Valid",
      "ReceiveApprovalAlert": "false",
      "ShorterUrl": "false"
   },
   "Message": ""
}
  
{
   "Success": true,
   "Object": {
      "Code": "",
      "OriginalUrl": "",
      "UsageCount": "0",
      "UsageDate": "yyyy-MM-ddTHH:mm:ss.ms",
      "Status": "Valid",
      "ReceiveApprovalAlert": "false",
      "ShorterUrl": "false"
   },
   "Message": ""
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Code	Código gerado pelo sistema para identificar sua URL.
ShorterUrl	Sua URL encurtada gerada pelo nosso sistema.
UsageCount	Quantidade de acessos que sua URL teve.
UsageDate	Data do último acesso em sua URL.
Status	Status de sua URL, podendo conter os valores: Valid, Rejected e Awaiting.
ReceiveApprovalAlert	Campo que indica se irá receber alerta quando sua URL for aprovada pelo nosso time.
Retornos Previsíveis
HTTP Status	Descrição
200	Sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O telefone deve ser informado
400	O número informado é inválido.
400	O campo “PhoneNumber” não suporta texto, somente números.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar / Url Encurtada
Com este recurso, é possivel consultar uma URL encurtada a partir de seu código.
URL do Endpoint: https://sms.comtele.com.br/api/v2/accounturls/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls/{Code}"

headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

response = requests.request("GET", url, headers=headers)

print(response.text)
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls/{Code}"

headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

response = requests.request("GET", url, headers=headers)

print(response.text)

Campos	Obrigatório	Descrição
Code	sim	Código de sua URL que foi gerado pelo sistema no momento de sua criação.
Exemplo de Retorno de Sucesso
copy
  
{
   "Success": true,
   "Object": {
      "Code": "",
      "OriginalUrl": "",
      "UsageCount": "0",
      "UsageDate": "yyyy-MM-ddTHH:mm:ss.ms",
      "Status": "Valid",
      "ReceiveApprovalAlert": "false",
      "ShorterUrl": "false"
   },
   "Message": ""
}
  
{
   "Success": true,
   "Object": {
      "Code": "",
      "OriginalUrl": "",
      "UsageCount": "0",
      "UsageDate": "yyyy-MM-ddTHH:mm:ss.ms",
      "Status": "Valid",
      "ReceiveApprovalAlert": "false",
      "ShorterUrl": "false"
   },
   "Message": ""
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Code	Código gerado pelo sistema para identificar sua URL.
ShorterUrl	Sua URL encurtada gerada pelo nosso sistema.
UsageCount	Quantidade de acessos que sua URL teve.
UsageDate	Data do último acesso em sua URL.
Status	Status de sua URL, podendo conter os valores: Valid, Rejected e Awaiting.
ReceiveApprovalAlert	Campo que indica se irá receber alerta quando sua URL for aprovada pelo nosso time.
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do número ou dos números de telefones consultados com o critério selecionado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Excluir / URL Encurtada
Com este recurso, é possivel remover uma url encurtada gerada pelo sistema a partir de seu código de identificação. URL do Endpoint: https://sms.comtele.com.br/api/v2/accounturls/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: DELETE

copy
curl node ruby javascript python
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls/{Code}"

headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

response = requests.request("DELETE", url, headers=headers)

print(response.text)
  import requests

url = "https://sms.comtele.com.br/api/v2/accounturls/{Code}"

headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

response = requests.request("DELETE", url, headers=headers)

print(response.text)

Campos	Obrigatório	Descrição
Code	sim	Código de sua URL que foi gerado pelo sistema no momento de sua criação.
Exemplo de Retorno de Sucesso
copy
           
{
   "Success": true,
   "Object": null,
   "Message": "A url foi excluída com sucesso."
}
           
{
   "Success": true,
   "Object": null,
   "Message": "A url foi excluída com sucesso."
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do número ou dos números de telefones consultados com o critério selecionado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Créditos
Nesta seção, são abordados recursos disponíveis para gestão de créditos, alguns em específico, necessitam que sua conta seja do tipo revenda, para ter funcionalidade administrativas a serem aplicadas em subcontas. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Consultar Saldo
Com este recurso, é possivel consultar a quantidade de saldo disponível em sua conta ou subcontas.
URL do Endpoint: https://sms.comtele.com.br/api/v2/credits/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/credits/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/credits/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
sub_account	não	Se não for informado username, será retornado o saldo da conta que está relacionada a chave de integração que está sendo utilizada. A funcionalidade de consultar saldo de uma subconta só está disponível para contas do tipo revenda, que possui funcionalidades administrativas em suas subcontas.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": 0,
    "Message": null
  }
  {
    "Success": true,
    "Object": 0,
    "Message": null
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	É retornado a quantidade de saldo disponível no momento da consulta.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON a quantidade de saldo disponível no momento da consulta.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Inserir Saldo / Subcontas
Com este recurso, é possivel adicionar saldo em suas subcontas. Recurso disponível apenas para contas do tipo revenda
URL do Endpoint: https://sms.comtele.com.br/api/v2/credits/Username?Amount={credits_amount}
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: PUT

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/credits/sub_account"

  querystring = {"Amount":"credits_amount"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("PUT", url, headers=headers, params=querystring)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/credits/sub_account"

  querystring = {"Amount":"credits_amount"}

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("PUT", url, headers=headers, params=querystring)

  print(response.text)

Campos	Obrigatório	Descrição
sub_account	sim	Username da subconta que pertence a sua revenda que terão os créditos adicionados. Recurso disponível apenas para contas do tipo revenda
Amount	sim	Quantidade de créditos a ser adicionados da subconta. Recurso disponível apenas para contas do tipo revenda
Exemplo de Retorno de Sucesso
copy
{
  "Success": true,
  "Object": null,
  "Message": "Os creditos foram alterados com sucesso."
}
{
  "Success": true,
  "Object": null,
  "Message": "Os creditos foram alterados com sucesso."
}

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Object	Neste recurso será nulo, pois não existe objeto a ser retornado.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Os creditos foram alterados com sucesso.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
404	Será retornado um objeto JSON com o campo “Success”: false com Object e Message null, pois o usuário não foi encontrado ou não está atrelado a conta com a chave que está utilizando.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar Histórico de Recargas / Subcontas
Com este recurso, é possivel consultar a histórico de créditos adicionados suas subcontas.
Este recurso possui um cooldown de 30 segundos que é compartilhando entre os recuros de Relatório Detalhado, Relatório de Regra de Resposta Automática e Relatório de Respostas, ou seja, somente uma chamada a cada 30 segundos a estes recursos podem ser realizadas. Recurso disponível apenas para contas do tipo revenda
URL do Endpoint: https://sms.comtele.com.br/api/v2/balancehistory/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/balancehistory/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/balancehistory/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
sub_account	sim	Username da subconta que pertence a sua revenda que deseja consultar o histórico de créditos adicionados.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": [
      {
        "Amount": 1,
        "Balance": 1,
        "ExpiryDate": null,
        "HistoryDate": "yyyy-MM-dd HH:mm.ms",
        "AssociadedUsername": "username"
      }
    ],
    "Message": null
  }
  {
    "Success": true,
    "Object": [
      {
        "Amount": 1,
        "Balance": 1,
        "ExpiryDate": null,
        "HistoryDate": "yyyy-MM-dd HH:mm.ms",
        "AssociadedUsername": "username"
      }
    ],
    "Message": null
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Amount	Quantidade de crédito que foi adicionado.
Balance	Quantidade de crédito adicionado, somada a quandidade saldo que estava disponível no momento que foi adicionado.
ExpiryDate	Caso o saldo disponível tenha data de expiração, neste caso será sempre null
HistoryDate	Timestamp do momento que o crédito foi adicionado na conta.
AssociadedUsername	Username da conta responsável por adicionar o crédito para o usuário.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON a quantidade de saldo disponível no momento da consulta.
202	Nao foi possivel continuar, pois este metodo da API possui limite de tempo entre requisicoes. O tempo de espera entre sua ultima requisicao e esta e de 30 segundos e ainda faltam XX segundos.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Subcontas
Nesta seção, são abordados recursos administrativos de criação de subcontas, caso sua aplicação precise dividir acessos em multiníveis ou então comercializar SMS. Mais detalhes sobre cada recurso, pode ser encontrado em uma breve descrição logo abaixo do título de cada endpoint.

Cadastrar / Subcontas
Com este recurso, é possivel cadastrar subcontas, se a sua conta for do tipo revenda. Dessa maneira é possível separar completamente a utilização das funcionalidades, créditos e acesso.
URL do Endpoint: https://sms.comtele.com.br/api/v2/accounts
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: POST

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/accounts"

  payload = "{\"Firstname\":\"first_name\",\"Lastname\":\"last_name\",\"Email\":\"email\",\"CorporateTaxpayer\":\"cnpj\",\"IndividualTaxpayer\":\"cpf\",\"MobileNumber\":\"phone_number\",\"Password\":\"password\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/accounts"

  payload = "{\"Firstname\":\"first_name\",\"Lastname\":\"last_name\",\"Email\":\"email\",\"CorporateTaxpayer\":\"cnpj\",\"IndividualTaxpayer\":\"cpf\",\"MobileNumber\":\"phone_number\",\"Password\":\"password\"}"
  headers = {
      'content-type': "application/json",
      'auth-key': "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }

  response = requests.request("POST", url, data=payload, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
Firstname	sim	Se refere ao primeiro nome do usuário, este nome será exibido no painel para dar boas vindas e etc. O campo não pode estar vazio e pode conter caracteres alfanuméricos.
Lastname	não	Sobrenome do usuário.
Email	sim	O e-mail do usuário que está sendo cadastrado, pode ser usado para fazer login no painel.
CorporateTaxpayer	–	CNPJ do usuário, caso seja pessoa jurídica, só é necessário informar um documento, CNPJ ou CPF.
IndividualTaxpayer	–	CPF do usuário, caso seja pessoa física, só é necessário informar um documento, CPF ou CNPJ.
MobileNumber	sim	Celular do usuário que está sendo cadastrado.
Password	sim	Senha de acesso ao painel do usuário que está sendo cadastrado.
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "Enabled": true,
      "Username": "sub_account_username",
      "Balance": 0,
      "Connection": null,
      "LastBalanceHistory": null,
      "ApiKey": "sub_account_apikey"
    },
    "Message": "O usuario foi inserido com sucesso"
  }
  {
    "Success": true,
    "Object": {
      "Enabled": true,
      "Username": "sub_account_username",
      "Balance": 0,
      "Connection": null,
      "LastBalanceHistory": null,
      "ApiKey": "sub_account_apikey"
    },
    "Message": "O usuario foi inserido com sucesso"
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Enabled	Status da subconta que foi adicionada, no caso todas as subcontas recém criadas ja são ativadas.
Username	Username da subconta que foi criada.
Balance	Quantidade de créditos disponíveis na subconta que foi criada, todas as subcontas são criadas com 0 créditos.
Connection	Data mais recente que a subconta efetuou login no painel.
LastBalanceHistory	Data mais recente que a subconta teve créditos adicionados.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado.
ApiKey	Retorna a API Key da subconta que foi criada.
Retornos Previsíveis
HTTP Status	Descrição
200	O usuario foi inserido com sucesso.
400	Object reference not set to an instance of an object.
Possível Causa: Nenhum objeto foi informado no Body da requisição.
400	O nome do usuario deve ser informado.
400	O telefone celular do usuario deve ser informado.
400	O e-mail já está em uso, por favor escolha um novo e-mail.
400	O e-mail informado é inválido ou não foi informado.
400	O campo C.P.F. ou o campo C.N.P.J. deve ser preenchido.
400	A senha do usuario deve ser informada.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
Consultar / Subcontas
Com este recurso, é possivel consultar as subcontas cadastradas e atreladas a sua conta.
URL do Endpoint: https://sms.comtele.com.br/api/v2/accounts/
Autenticação via Header: auth-key: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Método: GET

copy
curl node ruby javascript python
  import requests

  url = "https://sms.comtele.com.br/api/v2/accounts/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)
  import requests

  url = "https://sms.comtele.com.br/api/v2/accounts/{sub_account}"

  headers = {'auth-key': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'}

  response = requests.request("GET", url, headers=headers)

  print(response.text)

Campos	Obrigatório	Descrição
sub_account	não	Username da subconta que pertence a sua revenda. Recurso disponível apenas para contas do tipo revenda
Exemplo de Retorno de Sucesso
copy
  {
    "Success": true,
    "Object": {
      "Enabled": true,
      "Username": "sub_account_username",
      "Balance": 0,
      "Connection": yyyy-MM-ddTHH:mm:ss.ms,
      "LastBalanceHistory": yyyy-MM-ddTHH:mm:ss.ms,
      "ApiKey": "sub_account_apikey"
    },
    "Message": "O usuario foi inserido com sucesso"
  }
  {
    "Success": true,
    "Object": {
      "Enabled": true,
      "Username": "sub_account_username",
      "Balance": 0,
      "Connection": yyyy-MM-ddTHH:mm:ss.ms,
      "LastBalanceHistory": yyyy-MM-ddTHH:mm:ss.ms,
      "ApiKey": "sub_account_apikey"
    },
    "Message": "O usuario foi inserido com sucesso"
  }

Campos do Retorno
Campos	Descrição
Success	Pode ser retornado true para sucesso ou false para erro, este campo é o resultado da operação.
Enabled	Status da subconta que foi adicionada.
Username	Username da subconta que foi informado na consulta.
Balance	Saldo disponível na subconta no momento da consulta.
Connection	Data mais recente que a subconta efetuou login no painel.
LastBalanceHistory	Data mais recente que a subconta teve créditos adicionados.
Message	Neste campo é retornado mais detalhes sobre o resultado da operação do recurso que foi utilizado, neste caso será sempre null
ApiKey	Retorna a API Key da subconta que foi criada.
Retornos Previsíveis
HTTP Status	Descrição
200	Será retornado um objeto JSON com os detalhes do grupo ou dos grupos de contatos consultados com o critério selecionado.
401	A chave de acesso informada é inválida e não pode efetuar uma requisição à API.
Possível Causa: auth-key está incorreta ou o campo foi informado em branco.
401	O usuário informado está desativado.
401	O usuário informado está incorreto ou não existe
Possível Causa: o campo auth-key não está sendo informado na requisição.
500	Algum problema com o servidor em que está o recurso acessado, neste caso, tente acessar novamente.
503	houve um time out na requisição ao efetuar a conexão com o endpoint.
