h1. 🌐 AliveMonitor - Monitoramento de Uptime e Latência

Plataforma moderna e robusta para monitoramento contínuo de disponibilidade (uptime) e latência de endpoints HTTP e serviços web. O sistema conta com autenticação segura baseada em sessões, recuperação de senhas por e-mail e cobertura completa de testes automatizados.

h2. 🚀 Funcionalidades

Monitoramento de Serviços: Cadastro, acompanhamento e registro de histórico de respostas e latência de URLs/endpoints.

Healthcheck & Status: Endpoint @/api/v1/status@ com métricas em tempo real sobre banco de dados, versão e conexões ativas.

Autenticação Segura: Gerenciamento completo de usuários e controle de sessões via cookies HTTP-only seguros.

Recuperação de Contas: Fluxo de redefinição de senha com tokens e códigos temporários enviados por e-mail.

Alta Cobertura de Testes: Suíte de testes unitários, testes de integração de API e orquestração de ambiente de banco de dados isolado.

h2. 🛠 Tecnologias Utilizadas

h3. Core & Frameworks

Next.js: Framework full-stack para renderização das páginas e rotas de API (Pages Router).

TypeScript: Tipagem estática em toda a aplicação para maior segurança e previsibilidade de código.

Node.js: Ambiente de execução JavaScript no servidor.

h3. Persistência de Dados

PostgreSQL: Banco de dados relacional principal.

Prisma ORM: Modelagem de esquemas, cliente tipado e controle de migrações (migrations).

h3. Testes & Qualidade de Código

Vitest: Runner de alta performance para testes unitários e de integração.

Orquestração de Testes: Scripts automatizados para setup, execução de migrações e limpeza de banco nos testes.

h3. Infraestrutura & DevOps

Docker & Docker Compose: Conteinerização do banco de dados e dependências de ambiente.

h2. 📁 Estrutura do Projeto

h2. 💻 Como Instalar e Executar

h3. Pré-requisitos

Node.js (versão 18+ recomendada)

Docker e Docker Compose

Git

h3. Passo a Passo

Clone o repositório:

Instale as dependências:

Configure as variáveis de ambiente:
Crie um arquivo @.env@ na raiz do projeto com as credenciais do banco:

Inicie o banco de dados via Docker:

Execute as migrações do Prisma:

Inicie o servidor de desenvolvimento:

Abra "http://localhost:3000":http://localhost:3000 no seu navegador para acessar a aplicação.

h2. 🧪 Executando os Testes

Para rodar a suíte completa de testes com o Vitest:

h2. 📄 Licença

Este projeto está sob a licença MIT.
