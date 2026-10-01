🌐 AliveMonitor

Plataforma moderna e robusta para monitoramento contínuo de disponibilidade (uptime) e latência de endpoints HTTP e serviços web. O sistema conta com autenticação segura baseada em sessões, recuperação de senhas por e-mail e cobertura completa de testes automatizados.

🚀 Funcionalidades

Monitoramento de Serviços: Cadastro, acompanhamento e registro de histórico de respostas e latência de URLs/endpoints.

Healthcheck & Status: Endpoint /api/v1/status com métricas em tempo real sobre banco de dados, versão e conexões ativas.

Autenticação Segura: Gerenciamento completo de usuários e controle de sessões via cookies HTTP-only seguros.

Recuperação de Contas: Fluxo de redefinição de senha com tokens e códigos temporários enviados por e-mail.

Alta Cobertura de Testes: Suíte de testes unitários, testes de integração de API e orquestração de ambiente de banco de dados isolado.

🛠 Tecnologias Utilizadas

Core & Frameworks

Next.js: Framework full-stack para renderização das páginas e rotas de API (Pages Router).

TypeScript: Tipagem estática em toda a aplicação para maior segurança e previsibilidade de código.

Node.js: Ambiente de execução JavaScript no servidor.

Persistência de Dados

PostgreSQL: Banco de dados relacional principal.

Prisma ORM: Modelagem de esquemas, cliente tipado e controle de migrações (migrations).

Testes & Qualidade de Código

Vitest: Runner de alta performance para testes unitários e de integração.

Orquestração de Testes: Scripts automatizados para setup, execução de migrações e limpeza de banco nos testes.

Infraestrutura & DevOps

Docker & Docker Compose: Conteinerização do banco de dados e dependências de ambiente.

📁 Estrutura do Projeto

AliveMonitor/
├── infra/                  # Camada de banco de dados, envio de e-mail e tratamento de erros
├── lib/                    # Configurações de clientes (ex: Prisma Client)
├── models/                 # Regras de negócio (autenticação, usuários, sessões, password-reset)
├── pages/                  # Páginas da interface e endpoints da API (/api/v1/...)
├── prisma/                 # Esquemas e histórico de migrações do banco
└── tests/                  # Testes unitários, de integração e orquestrador


💻 Como Instalar e Executar

Pré-requisitos

Node.js (versão 18+ recomendada)

Docker e Docker Compose

Git

Passo a Passo

Clone o repositório:

git clone https://github.com/caioolopes/alivemonitor.git
cd alivemonitor


Instale as dependências:

npm install


Configure as variáveis de ambiente:
Crie um arquivo .env na raiz do projeto com as credenciais do banco:

DATABASE_URL="postgresql://usuario:senha@localhost:5432/alivemonitor?schema=public"


Inicie o banco de dados via Docker:

docker compose up -d


Execute as migrações do Prisma:

npx prisma migrate dev


Inicie o servidor de desenvolvimento:

npm run dev


Abra http://localhost:3000 no seu navegador para acessar a aplicação.

🧪 Executando os Testes

Para rodar a suíte completa de testes com o Vitest:

npm test


📄 Licença

Este projeto está sob a licença MIT.
