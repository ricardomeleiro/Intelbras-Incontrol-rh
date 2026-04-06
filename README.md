# Intelbras InControl RH

> Interface web moderna para o setor de RH consultar registros de acesso via **Intelbras InControl Web**, sem depender da interface nativa do software.

![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-alpine-009639?logo=nginx&logoColor=white)

---

## Funcionalidades

- 🔐 **Login** com usuário/senha cadastrado no InControl
- 🔍 **Busca de colaboradores** por nome com autocomplete em tempo real
- 📅 **Filtro por período** (data início / data fim)
- 🚪 **Filtro por ponto de acesso** (equipamento), populado automaticamente do InControl
- 📋 **Tabela de registros** com data, hora, dispositivo, sentido e status
- 📊 **Resumo visual** com totais de acessos liberados, negados e alarmes
- 📄 **Exportar PDF** com layout profissional (via impressão do browser)

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│           Container Docker               │
│                                         │
│  ┌──────────┐      ┌─────────────────┐  │
│  │  Nginx   │─────▶│  Node.js/Express│  │
│  │ :80      │proxy │  :3001          │  │
│  │ Frontend │      │  Backend/Proxy  │  │
│  └──────────┘      └────────┬────────┘  │
│                             │           │
└─────────────────────────────┼───────────┘
                              │ HTTPS
                              ▼
                  ┌───────────────────────┐
                  │  InControl Intelbras  │
                  │  IP_DO_INCONTROL:4441   │
                  └───────────────────────┘
```

Uma única imagem Docker contém o frontend (Nginx) e o backend (Node.js), que atua como proxy reverso para a API REST do InControl, evitando problemas de CORS e ocultando credenciais do cliente.

---

## Pré-requisitos

- Docker e Docker Compose instalados no servidor
- Acesso de rede ao InControl 
- Usuário cadastrado no InControl com permissão de leitura de eventos

---

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/ricardomeleiro/Intelbras-Incontrol-rh.git
cd Intelbras-Incontrol-rh

# 2. (Opcional) Ajuste o IP/porta do InControl em docker-compose.yml
#    INCONTROL_URL: "https://IP_DO_INCONTROL:4441"

# 3. Suba o container
docker compose up -d

# 4. Acesse em http://SEU_SERVIDOR:9090
```

---

## Usando a imagem publicada no Docker Hub

Sem precisar clonar o repositório:

```bash
docker run -d \
  --name incontrol-rh \
  --restart unless-stopped \
  -p 9090:80 \
  -e INCONTROL_URL="https://IP_DO_INCONTROL:4441" \
  rickdevs/incontrol-rh:latest
```

Ou com Docker Compose:

```yaml
services:
  incontrol-rh:
    image: rickdevs/incontrol-rh:latest
    container_name: incontrol-rh
    restart: unless-stopped
    ports:
      - "9090:80"
    environment:
      INCONTROL_URL: "https://IP_DO_INCONTROL:4441"
```

---

## Build e publicação

```bash
sh build-and-push.sh
```

O script realiza o build com `--platform linux/amd64` (compatível com servidores Linux mesmo em Mac Apple Silicon) e faz o push para o Docker Hub.

---

## Endpoints da API InControl utilizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/v1/auth/` | Autenticação → JWT token |
| `GET` | `/v1/ponto_acesso` | Lista de pontos de acesso |
| `GET` | `/v1/evento` | Registros de acesso com filtros |

### Filtros suportados pelo `/v1/evento`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `pessoa_nome` | string | Busca por nome do colaborador |
| `ponto_acesso_nome` | string | Nome exato do ponto de acesso |
| `data_evento__0__operation` | `gte` | Operador data início (≥) |
| `data_evento__0__value` | timestamp ms | Data início em milissegundos |
| `data_evento__1__operation` | `lt` | Operador data fim (<) |
| `data_evento__1__value` | timestamp ms | Data fim em milissegundos |

---

## Estrutura do projeto

```
Intelbras-Incontrol-rh/
├── Dockerfile                  # Multi-stage: Node.js + Nginx numa imagem só
├── docker-compose.yml          # Stack com variável INCONTROL_URL
├── docker-entrypoint.sh        # Inicia Node.js e Nginx simultaneamente
├── build-and-push.sh           # Build amd64 + push para Docker Hub
├── backend/
│   ├── server.js               # Proxy Express → API InControl
│   ├── package.json
│   └── Dockerfile
└── frontend/
    ├── index.html              # SPA completa (HTML/CSS/JS vanilla)
    ├── nginx-standalone.conf   # Proxy /api/ → localhost:3001
    └── Dockerfile
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `INCONTROL_URL` | `https://IP_DO_INCONTROL:4441` | URL base da API do InControl |
| `PORT` | `3001` | Porta interna do backend Node.js |

---

## Observações

- O certificado SSL do InControl é autoassinado — o backend já ignora a validação (`rejectUnauthorized: false`)
- A porta `4441` é a API REST; a `4445` é apenas o frontend Angular do InControl
- O token JWT retornado pelo login expira conforme configuração do InControl

---

## Licença

MIT
