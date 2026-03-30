Documentação de Integração - Lara Voxter (M2M/IoT)
Este documento serve como guia de referência para o Cursor AI implementar a integração com o portal Lara da Voxter.

Token de Acesso: a1f15a80390664e91f66c744e1be84eacae0ae14

1. Visão Geral
O Lara é a plataforma de gestão de conectividade da Voxter, utilizada para monitorar chips M2M, ativar/desativar linhas, consultar consumo e gerenciar dispositivos de rastreamento.

Base URL: https://lara.voxter.com.br:8080/api/v1 (confirmar versão na documentação oficial)

Formato de Dados: JSON

Protocolo: HTTPS

2. Autenticação
A maioria das APIs da Voxter utiliza Bearer Token ou Basic Auth.

Endpoint de Login: /auth/login ou /sessions

Headers Necessários:

HTTP
Content-Type: application/json
Authorization: Bearer {{SEU_TOKEN}}
3. Endpoints Comuns (Mapeamento Estimado)
Com base nas funcionalidades do App Lara, utilize estes padrões para solicitar código ao Cursor:

Gestão de Linhas (Chips)
GET /lines: Lista todos os chips/SIM cards.

GET /lines/{id}: Detalhes de uma linha específica (ICCID, operadora, status).

PATCH /lines/{id}/status: Alterar status (Ativar/Bloquear/Suspender).

Body: { "status": "active" } ou { "status": "suspended" }

Consumo e Dados
GET /lines/{id}/usage: Retorna o consumo de dados em tempo real/mensal.

GET /lines/statistics: Dados consolidados do dashboard.

Comandos e Operações
POST /commands/sms: Envio de comando SMS para o rastreador via plataforma.

POST /lines/{id}/reset: Reset de conectividade (GPRS/LTE).

4. Estrutura de Erros
A API segue o padrão HTTP:

200/201: Sucesso.

401: Token expirado ou inválido.

403: Sem permissão para o recurso.

422: Erro de validação nos campos enviados.







Search...
Autenticação
Simcards
get
Listagem de Simcards
get
Localização aproximada do Simcard (LBS)
post
Reset de Simcard
post
Enviar SMS
redocly logoAPI docs by Redocly
Voxter Brasil - Lara M2M API (1.0.0)
Download OpenAPI specification:Download

E-mail: luis@voxter.com.br
License: Apache 2.0
Esta é a API do Lara M2M, sinta-se á vontade para realizar qualquer integração que queira com suas ferramentas. Para ter acesso à API, favor entre em contato com nosso suporte (abrir um ticket no Lara). O mal uso desta API pode resultar no banimento do IP da sua aplicação ou até mesmo a desativação do usuário requisitante.

Autenticação
Autenticação JWT
Requisição de Bearer Token. O Token é válido por 6 horas, após esse tempo, você deverá solicitar um novo token.

query Parameters
email
required
string
E-mail de Acesso do Usuário

password
required
string
Senha de Acesso do Usuário

platform
required
integer
Default: 1
ID da Plataforma

header Parameters
x-access-token
required
string
Token de Acesso

Request Body schema: application/json
required
email	
string
password	
string
platform	
integer
Responses
200 Sucesso
401 Autenticação falhou por conta de credenciais inválidas
500 Erro inesperado

post
/authenticate2
Request samples
Payload
Content type
application/json

Copy
{
"email": "john@email.com",
"password": "12345",
"platform": 1
}
Response samples
200401
Content type
application/json

Copy
Expand allCollapse all
{
"error": false,
"message": "Login efetuado com sucesso",
"token": {
"type": "bearer",
"token": "long-bearer-token-here"
},
"user": {
"id": "1",
"client_id": "1",
"role_id": 3,
"email": "john@email.com",
"active": true,
"created_at": "2024-01-01 08:00:00",
"updated_at": "2024-01-01 15:30:00"
},
"client": {
"id": 1,
"fullname": "John Doe",
"fantasyname": "Google Inc.",
"socialnumber": "1111111111",
"email": "john@gmail.com",
"address_street": "Avenida Brasil",
"address_number": 290,
"address_complement": "Quadra 2",
"address_city": "Rio de Janeiro",
"address_state": "RJ",
"address_zipcode": "21000-10",
"phone1": "21 2333-2133",
"phone2": "21 2333-2134",
"created_at": "2019-01-01 00:00:00",
"updated_at": "2019-01-01 00:00:00",
"address_district": "Centro",
"seller_id": null,
"seller": false,
"active": true,
"duedate": 10,
"reseller": false,
"reseller_id": "2",
"finance_status": 2,
"simcards_number": 3,
"birthdate": "2000-01-01",
"platform_id": 1
}
}
Simcards
Listagem de Simcards
Listagem de Simcards (Paginação com 10 resultados por página)

Authorizations:
jwt_auth (write:user)
 OAuth2: jwt_auth
Flow type: implicit
Authorization URL: https://petstore3.swagger.io/oauth/authorize
Required scopes: write:user
Scopes:
write:user - modify user
query Parameters
page	
integer
Default: 1
Número da página

search	
string
Default: " "
Buscar por Campo personalizado, Linha, ICCID ou IMEI

Responses
200 Sucesso
500 Erro inesperado

get
/simcards
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"page": 1,
"pages": 6,
"records": 55,
"data": [
{}
]
}
Localização aproximada do Simcard (LBS)
Localização aproximada do Simcard (LBS)

Authorizations:
jwt_auth
path Parameters
id
required
integer
Default: 200
ID do Simcard

Responses
200 Sucesso
500 Erro inesperado

get
/simcards/location/{id}
Response samples
200
Content type
application/json

Copy
{
"latitude": -2.454353,
"longitude": -40.3678
}
Reset de Simcard
Reset das Configurações do Simcard (apenas para as operadoras Algar, Claro, Vivo M2M, NLT, Links Field e Emnify)

Authorizations:
jwt_auth
path Parameters
id
required
integer
Example: 100
ID do Simcard

Responses
200 Sucesso
401 Sucesso
500 Erro inesperado

post
/simcards/reset/{id}
Response samples
200401500
Content type
application/json

Copy
{
"success": "Operação realizada com sucesso"
}
Enviar SMS
Envio de SMS (apenas para as operadoras Claro e Emnify)

Authorizations:
jwt_auth
Request Body schema: application/json
required
line	
number
payload	
string
Responses
200 Sucesso
Response Schema: application/json
success	
string
403 Sucesso
Response Schema: application/json
error	
string
404 Não encontrado
500 Erro inesperado

post
/simcards/sms
Request samples
Payload
Content type
application/json

Copy
{
"line": 5599999999999,
"payload": "text of sms"
}
Response samples
200403404500
Content type
application/json

Copy
{
"success": "Operação realizada com sucesso"
}




{
  "openapi": "3.0.3",
  "info": {
    "title": "Voxter Brasil - Lara M2M API",
    "description": "Esta é a API do Lara M2M, sinta-se á vontade para realizar qualquer integração que queira com suas ferramentas. Para ter acesso à API, favor entre em contato com nosso suporte (abrir um ticket no Lara). O mal uso desta API pode resultar no banimento do IP da sua aplicação ou até mesmo a desativação do usuário requisitante.",
    "contact": {
      "email": "luis@voxter.com.br"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
    },
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://lara.voxter.com.br:8080/api"
    }
  ],
  "tags": [
    {
      "name": "Autenticação"
    },
    {
      "name": "Simcards"
    }
  ],
  "paths": {
    "/authenticate2": {
      "post": {
        "tags": [
          "Autenticação"
        ],
        "summary": "Autenticação JWT",
        "description": "Requisição de Bearer Token. O Token é válido por 6 horas, após esse tempo, você deverá solicitar um novo token.",
        "parameters": [
          {
            "name": "email",
            "in": "query",
            "description": "E-mail de Acesso do Usuário",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "password",
            "in": "query",
            "description": "Senha de Acesso do Usuário",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "platform",
            "in": "query",
            "description": "ID da Plataforma",
            "required": true,
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "x-access-token",
            "in": "header",
            "description": "Token de Acesso",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/User"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserResponse"
                }
              }
            }
          },
          "401": {
            "description": "Autenticação falhou por conta de credenciais inválidas",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserResponseError"
                }
              }
            }
          },
          "500": {
            "description": "Erro inesperado"
          }
        }
      }
    },
    "/simcards": {
      "get": {
        "tags": [
          "Simcards"
        ],
        "summary": "Listagem de Simcards",
        "description": "Listagem de Simcards (Paginação com 10 resultados por página)",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "description": "Número da página",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "search",
            "in": "query",
            "description": "Buscar por Campo personalizado, Linha, ICCID ou IMEI",
            "schema": {
              "type": "string",
              "default": " "
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Simcard"
                }
              }
            }
          },
          "500": {
            "description": "Erro inesperado"
          }
        },
        "security": [
          {
            "jwt_auth": [
              "write:user"
            ]
          }
        ]
      }
    },
    "/simcards/location/{id}": {
      "get": {
        "tags": [
          "Simcards"
        ],
        "summary": "Localização aproximada do Simcard (LBS)",
        "description": "Localização aproximada do Simcard (LBS)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID do Simcard",
            "schema": {
              "type": "integer",
              "default": 200
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardLocation"
                }
              }
            }
          },
          "500": {
            "description": "Erro inesperado"
          }
        },
        "security": [
          {
            "jwt_auth": [
              "write:user"
            ]
          }
        ]
      }
    },
    "/simcards/reset/{id}": {
      "post": {
        "tags": [
          "Simcards"
        ],
        "summary": "Reset de Simcard",
        "description": "Reset das Configurações do Simcard (apenas para as operadoras Algar, Claro, Vivo M2M, NLT, Links Field e Emnify)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "ID do Simcard",
            "example": 100,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardSharingSuccess"
                }
              }
            }
          },
          "401": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardSharingError"
                }
              }
            }
          },
          "500": {
            "description": "Erro inesperado",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardSharingError"
                }
              }
            }
          }
        },
        "security": [
          {
            "jwt_auth": [
              "write:user"
            ]
          }
        ]
      }
    },
    "/simcards/sms": {
      "post": {
        "tags": [
          "Simcards"
        ],
        "summary": "Enviar SMS",
        "description": "Envio de SMS (apenas para as operadoras Claro e Emnify)",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SmsRequest"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardSharingSuccess"
                }
              }
            }
          },
          "403": {
            "description": "Sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SimcardSharingError"
                }
              }
            }
          },
          "404": {
            "description": "Não encontrado",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NotFoundError"
                }
              }
            }
          },
          "500": {
            "description": "Erro inesperado",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FatalError"
                }
              }
            }
          }
        },
        "security": [
          {
            "jwt_auth": [
              "write:user"
            ]
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "example": "john@email.com"
          },
          "password": {
            "type": "string",
            "example": "12345"
          },
          "platform": {
            "type": "integer",
            "example": 1
          }
        }
      },
      "UserResponse": {
        "type": "object",
        "properties": {
          "error": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Login efetuado com sucesso"
          },
          "token": {
            "type": "object",
            "example": {
              "type": "bearer",
              "token": "long-bearer-token-here"
            }
          },
          "user": {
            "type": "object",
            "example": {
              "id": "1",
              "client_id": "1",
              "role_id": 3,
              "email": "john@email.com",
              "active": true,
              "created_at": "2024-01-01 08:00:00",
              "updated_at": "2024-01-01 15:30:00"
            }
          },
          "client": {
            "type": "object",
            "example": {
              "id": 1,
              "fullname": "John Doe",
              "fantasyname": "Google Inc.",
              "socialnumber": "1111111111",
              "email": "john@gmail.com",
              "address_street": "Avenida Brasil",
              "address_number": 290,
              "address_complement": "Quadra 2",
              "address_city": "Rio de Janeiro",
              "address_state": "RJ",
              "address_zipcode": "21000-10",
              "phone1": "21 2333-2133",
              "phone2": "21 2333-2134",
              "created_at": "2019-01-01 00:00:00",
              "updated_at": "2019-01-01 00:00:00",
              "address_district": "Centro",
              "seller_id": null,
              "seller": false,
              "active": true,
              "duedate": 10,
              "reseller": false,
              "reseller_id": "2",
              "finance_status": 2,
              "simcards_number": 3,
              "birthdate": "2000-01-01",
              "platform_id": 1
            }
          }
        }
      },
      "UserResponseError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "boolean",
            "example": true
          },
          "message": {
            "type": "string",
            "example": "Usuário inexistente ou inativo"
          }
        }
      },
      "Simcard": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "example": 1
          },
          "pages": {
            "type": "integer",
            "example": 6
          },
          "records": {
            "type": "integer",
            "example": 55
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SimcardChild"
            }
          }
        }
      },
      "SimcardChild": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 1
          },
          "line": {
            "type": "string",
            "example": "55985453453453"
          },
          "iccid": {
            "type": "string",
            "example": "8954353454353534533"
          },
          "imei": {
            "type": "string",
            "example": "678968765448"
          },
          "company": {
            "type": "string",
            "example": "ALGAR-5"
          },
          "company_connected": {
            "type": "string",
            "example": "TIM"
          },
          "custom_name": {
            "type": "string",
            "example": "Chip de Luis"
          },
          "client_name": {
            "type": "string",
            "example": "Eduardo Costa"
          },
          "plan": {
            "type": "integer",
            "example": 20
          },
          "plan_consumed": {
            "type": "number",
            "example": 4.91
          },
          "connection": {
            "type": "string",
            "example": "4G"
          },
          "canceled": {
            "type": "boolean",
            "example": false
          },
          "disabled": {
            "type": "integer",
            "example": 0
          },
          "preactive": {
            "type": "boolean",
            "example": false
          },
          "last_comunication": {
            "type": "string",
            "example": "28/05/2024 14:56:11"
          },
          "active_date": {
            "type": "string",
            "example": "01/05/2024"
          },
          "order": {
            "type": "integer",
            "example": 250
          },
          "period": {
            "type": "integer",
            "example": 1
          },
          "contract_amount": {
            "type": "number",
            "example": 7.9
          }
        }
      },
      "SimcardLocation": {
        "type": "object",
        "properties": {
          "latitude": {
            "type": "number",
            "example": -2.454353
          },
          "longitude": {
            "type": "number",
            "example": -40.3678
          }
        }
      },
      "SmsRequest": {
        "type": "object",
        "properties": {
          "line": {
            "type": "number",
            "example": 5599999999999
          },
          "payload": {
            "type": "string",
            "example": "text of sms"
          }
        }
      },
      "SimcardSharingSuccess": {
        "type": "object",
        "properties": {
          "success": {
            "type": "string",
            "example": "Operação realizada com sucesso"
          }
        }
      },
      "SimcardSharingError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "example": "Operação não permitida"
          }
        }
      },
      "FatalError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "example": "Erro inesperado"
          }
        }
      },
      "NotFoundError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "example": "Objeto não encontrado"
          }
        }
      }
    },
    "requestBodies": {
      "User": {
        "description": "Objeto de usuário para ser usado na autenticação",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/User"
            }
          }
        }
      }
    },
    "securitySchemes": {
      "jwt_auth": {
        "type": "oauth2",
        "flows": {
          "implicit": {
            "authorizationUrl": "https://petstore3.swagger.io/oauth/authorize",
            "scopes": {
              "write:user": "modify user"
            }
          }
        }
      },
      "api_key": {
        "type": "apiKey",
        "name": "api_key",
        "in": "query"
      }
    }
  }
}