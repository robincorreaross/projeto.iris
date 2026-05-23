# Iris — Central de Gestão de Atendimentos WhatsApp

Este plano detalha a arquitetura, o design e o roteiro de desenvolvimento passo a passo para construir o MVP do **Iris**, uma central de gestão e automação de atendimentos via WhatsApp.

---

## 🏗️ Visão Geral do Projeto
O **Iris** é um portal completo que centraliza a comunicação do WhatsApp para pequenas e médias empresas, permitindo múltiplos agentes humanos gerenciarem conversas, categorizarem contatos, enviarem templates automatizados e utilizarem gatilhos automáticos (mensagens de boas-vindas, horário de funcionamento, jornal de ofertas e respostas baseadas em palavras-chave).

- **Tipo do Projeto:** WEB + BACKEND
- **Complexidade:** Alta (Integração real de API externa + Fila de mensagens BullMQ/Redis + Tempo real via WebSockets + Banco PostgreSQL)

---

## 🎨 Compromisso de Design (Diretrizes de UI/UX)
Para garantir uma interface premium, de alta qualidade e totalmente livre de clichês de IA ou modelos pré-prontos:

- **Style Commitment:** **Technical Cyber-HUD (Dark Theme de Alto Contraste)**
- **Geometria:** Bordas extremamente nítidas e técnicas (`rounded-[2px]` ou `rounded-none`), inspiradas em painéis de monitoramento profissional e telas industriais de status.
- **Paleta de Cores (Purple Ban Cumprido ✅):** 
  - Fundo principal: Grafite escuro técnico (`#090A0C`)
  - Acentos e Interação: Verde Sinal WhatsApp de Alta Intensidade (`#00E676` / `#00C853`)
  - Alertas/Atenção: Laranja Termal (`#FF6D00`)
  - Texto e Estruturas: Tons frios acinzentados de alta leitura (`#E0E2E5`, `#8A9099`)
- **Unicidade de Layout (Anti-SaaS Split):** A tela de atendimentos utilizará uma distribuição assimétrica de 3 colunas de proporções mecânicas (ex: 20% lista de conversas, 50% chat principal, 30% metadados do contato), simulando um terminal de monitoramento tático em tempo real.
- **Movimento e Efeitos:** Transições de altura e opacidade com física de mola (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`), feedback físico no hover dos cards e indicadores pulsantes para contatos online/atendimentos ativos.

---

## 🛠️ Stack Tecnológica
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS v4 + Lucide React para ícones (UI construída sem Shadcn/ui por padrão para máximo controle estético customizado)
- **Backend:** NestJS (TypeScript) estruturado modularmente
- **Banco de Dados:** PostgreSQL (Supabase Cloud) + Prisma ORM
- **Cache & Filas:** Redis + BullMQ (para garantir estabilidade no consumo dos webhooks e envio confiável de mensagens)
- **Integração WhatsApp:** Evolution API v2 (Instância dinâmica configurada na tabela `integrations`)
- **Autenticação:** Supabase Auth / JWT
- **Tempo Real:** WebSockets (NestJS Gateway + Socket.io-client)

---

## 📂 Estrutura de Arquivos Proposta

```plaintext
iris/
├── backend/                  # NestJS API Core
│   ├── src/
│   │   ├── modules/
│   │   │   ├── database/     # Módulo Prisma e conexões
│   │   │   ├── whatsapp/     # Integração Evolution API (Envio de texto, imagens, registro de webhook)
│   │   │   ├── webhook/      # Endpoint receptor de webhooks da Evolution API
│   │   │   ├── queue/        # Filas BullMQ (webhook-processor, message-sender)
│   │   │   ├── contacts/     # CRM de Contatos
│   │   │   ├── conversations/# Gestão de Conversas (Status, Agente, Tags)
│   │   │   ├── messages/     # Histórico de Mensagens
│   │   │   ├── templates/    # Gerenciador de Templates com Variáveis
│   │   │   ├── automations/  # Motor de Automações (Palavras-chave, Boas-Vindas, Agenda)
│   │   │   ├── settings/     # Configuração da Loja, Horários, Links e Jornal de Ofertas
│   │   │   ├── integrations/ # CRUD de Integrações do WhatsApp (Salva base_url, api_key, etc.)
│   │   │   ├── users/        # Usuários e Agentes
│   │   │   └── ws/           # WebSocket Gateway para Atualização em Tempo Real do Front
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma     # Definição das Tabelas PostgreSQL
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/       # Telas de Login/Registro
│   │   │   ├── dashboard/    # Visão geral de métricas, conexões e feed de atividades
│   │   │   ├── atendimentos/ # Painel de Chat em 3 Colunas
│   │   │   ├── contatos/     # Lista de contatos, CRM e filtros de busca
│   │   │   ├── automacoes/   # Toggle de regras, horários e palavras-chave
│   │   │   ├── modelos/      # Criador de Templates e envio em massa
│   │   │   ├── configuracoes/# Dados da loja, upload do Jornal, agentes e conexão WhatsApp
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/       # Componentes compartilhados (ChatWindow, Sidebar, MetricCard)
│   │   ├── hooks/            # Hooks customizados para WebSockets e busca de dados
│   │   ├── lib/              # SDKs (Supabase, Socket.io-client)
│   │   └── utils/
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml        # Redis local para BullMQ
└── README.md
```

---

## 🗄️ Modelo de Dados (Prisma Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum ConversationStatus {
  NEW
  IN_PROGRESS
  WAITING
  FINISHED
}

enum MessageDirection {
  IN
  OUT
}

enum MessageType {
  TEXT
  IMAGE
  DOCUMENT
  LINK
}

enum UserRole {
  ADMIN
  AGENT
}

model Integration {
  id            String    @id @default(uuid())
  provider      String    @default("EVOLUTION")
  base_url      String
  api_key       String
  instance_name String    @unique
  status        String    @default("DISCONNECTED")
  connected_at  DateTime?
  updated_at    DateTime  @updatedAt

  @@map("integrations")
}

model Contact {
  id            String         @id @default(uuid())
  phone         String         @unique
  name          String?
  tags          String[]       @default([])
  createdAt     DateTime       @default(now())
  lastSeen      DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id         String             @id @default(uuid())
  contactId  String
  contact    Contact            @relation(fields: [contactId], references: [id], onDelete: Cascade)
  status     ConversationStatus @default(NEW)
  assignedTo String?            // Refers to User ID
  tags       String[]           @default([])
  notes      String?
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt
  messages   Message[]
}

model Message {
  id             String           @id @default(uuid())
  conversationId String
  conversation   Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  direction      MessageDirection
  type           MessageType      @default(TEXT)
  content        String
  mediaUrl       String?
  timestamp      DateTime         @default(now())
}

model Template {
  id        String   @id @default(uuid())
  name      String   @unique
  content   String
  variables String[] @default([]) // Array de variáveis como ["nome", "loja", "link"]
  createdAt DateTime @default(now())
}

model Automation {
  id        String   @id @default(uuid())
  type      String   // "WELCOME", "SCHEDULE", "OFFER", "KEYWORD"
  trigger   String?  // Palavra-chave para "KEYWORD"
  content   String?  // Texto de resposta
  mediaUrl  String?  // URL da oferta/mídia no Supabase Storage
  enabled   Boolean  @default(true)
  schedule  Json?    // Detalhes extras de agendamento se necessário
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  role      UserRole @default(AGENT)
  createdAt DateTime @default(now())
}

model Settings {
  id             String @id @default("store_config")
  storeName      String
  logoUrl        String?
  openHours      Json   // Estrutura diária de horários { "segunda": { "start": "08:00", "end": "18:00", "closed": false } }
  offerImageUrl  String?
  appLinks       Json   // { "catalog": "...", "menu": "...", "app": "..." }
}
```

---

## 🗺️ Roteiro de Implementação (Task Breakdown)

### 📌 P0: Fundações & Banco de Dados (Database Architect & Security Auditor)

#### Tarefa 1: Inicialização do Workspace
- **Agente:** `project-planner`
- **Habilidades:** `app-builder`, `clean-code`
- **Depedências:** Nenhuma
- **Ação:** Criação do diretório de estruturas, configuração do `docker-compose.yml` para Redis, e inicialização dos subprojetos Next.js (`frontend/`) e NestJS (`backend/`).
- **INPUT:** Workspace vazio.
- **OUTPUT:** Projetos `backend/` e `frontend/` criados com comandos `npx -y` configurados para rodar de forma não-interativa. Redis no compose.
- **VERIFY:** `docker compose up -d redis` e confirmação das pastas criadas.

#### Tarefa 2: Configuração do Prisma & Migração Supabase
- **Agente:** `database-architect`
- **Habilidades:** `database-design`, `prisma-expert`
- **Depedências:** Tarefa 1
- **Ação:** Setup do Prisma ORM no NestJS, mapeamento do schema acima contendo o modelo `Integration` e rodar as migrações diretamente na URL do Supabase Cloud.
- **INPUT:** Credenciais do Supabase e schema prisma.
- **OUTPUT:** Migrações executadas com sucesso, tabelas criadas no Supabase PostgreSQL.
- **VERIFY:** Confirmar a criação das tabelas `integrations`, `contacts`, `conversations` etc., no Supabase via consulta direta ou CLI.

---

### 📌 P1: Integração com WhatsApp & Webhooks (Backend Specialist)

#### Tarefa 3: Dinamicidade do WhatsappService e Registro de Webhook
- **Agente:** `backend-specialist`
- **Habilidades:** `api-patterns`, `nodejs-best-practices`
- **Depedências:** Tarefa 2
- **Ação:** Criar serviço cliente HTTP (`whatsapp.service.ts`) que conecta com a Evolution API. Em vez de variáveis fixas, buscar `base_url`, `api_key` e `instance_name` na tabela `integrations` do banco. Implementar rotas no backend para configurar/salvar estas chaves. Ao salvar a configuração no banco, chamar automaticamente a rota `POST /webhook/set/{instance_name}` da Evolution API informando o webhook receptor apontando para o endpoint `/webhooks/whatsapp` do próprio Iris.
- **INPUT:** Tabela de `integrations` e conexão com Evolution API.
- **OUTPUT:** Driver dinâmico e fluxo de auto-registro de webhook ao salvar as credenciais de conexão.
- **VERIFY:** Salvar a integração via API backend e validar se a chamada de registro de webhook foi efetuada e a integração foi ativada.

#### Tarefa 4: Endpoint do Webhook e Filas BullMQ
- **Agente:** `backend-specialist`
- **Habilidades:** `nodejs-best-practices`
- **Depedências:** Tarefa 3
- **Ação:** Criar endpoint POST `/webhooks/whatsapp` para receber as mensagens em tempo real da Evolution API. As mensagens recebidas devem ser empurradas para uma fila BullMQ no Redis (`webhook-queue`) para processamento assíncrono.
- **INPUT:** Redis rodando, webhook receptor ativo.
- **OUTPUT:** Payload do webhook processado em background.
- **VERIFY:** Chamada simulada (POST local) verificando enfileiramento correto e processamento da fila sem gargalos.

#### Tarefa 5: Lógica de Processamento de Mensagens e Criação de Contatos
- **Agente:** `backend-specialist`
- **Habilidades:** `database-design`
- **Depedências:** Tarefa 4
- **Ação:** O processador do BullMQ deve:
  1. Identificar se o número do remetente existe em `Contact`. Se não, cria.
  2. Verificar se há `Conversation` ativa para o contato. Se não, cria uma nova em status `NEW`.
  3. Registrar a `Message` atrelada à conversa.
- **INPUT:** Job na fila contendo os dados da mensagem do WhatsApp.
- **OUTPUT:** Registros inseridos no banco para `Contact`, `Conversation` e `Message`.
- **VERIFY:** Consulta de banco comprovando inserção e encadeamento lógico de tabelas.

#### Tarefa 6: WebSocket Server (Realtime Push)
- **Agente:** `backend-specialist`
- **Habilidades:** `api-patterns`
- **Depedências:** Tarefa 5
- **Ação:** Configurar Socket.io Gateway no NestJS para transmitir eventos de "nova mensagem", "mudança de status da conversa", e "status de conexão da Evolution API" aos clientes conectados.
- **INPUT:** Eventos gerados no processamento da fila.
- **OUTPUT:** Servidor websocket transmitindo payload.
- **VERIFY:** Conectar cliente de teste e capturar eventos realtime de forma imediata.

---

### 📌 P1.5: Motor de Automações (Backend Specialist)

#### Tarefa 7: Módulo de Automações & Regras de Atendimento
- **Agente:** `backend-specialist`
- **Habilidades:** `api-patterns`
- **Depedências:** Tarefa 6
- **Ação:** Implementar o motor de automações pós-recebimento de mensagem (`direction = IN`):
  1. **Mensagem de boas-vindas:** Saudação inicial automática + links de aplicativos se for o primeiro contato.
  2. **Regra de Horário (Aberto/Fechado):** Compara hora atual com o JSON `openHours` configurado. Envia mensagem de ausência se fechado.
  3. **Jornal de ofertas:** Envia imagem do jornal de ofertas ativa se habilitado.
  4. **Resposta por palavra-chave:** Responde baseado em palavras chaves do contato usando templates.
- **INPUT:** Nova mensagem no banco.
- **OUTPUT:** Envio automático das respostas por Evolution API com base no driver dinâmico da integração.
- **VERIFY:** Receber mensagem simulada e validar o disparo correto de respostas automáticas no fluxo programado.

---

### 📌 P2: Frontend & Interface HUD Técnica (Frontend Specialist)

#### Tarefa 8: Configuração do Tema Tailwind & Design System
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`, `tailwind-patterns`
- **Depedências:** Tarefa 1
- **Ação:** Configurar `tailwind.config.js` no Next.js com a paleta Cyber-HUD de alta legibilidade (Grafite escuro base, acentos verdes e laranjas, bordas nítidas e ausência de tonalidades roxas/violetas - P0 Purple Ban).
- **INPUT:** Next.js limpo.
- **OUTPUT:** Variáveis CSS e temas técnicos aplicados.
- **VERIFY:** Renderização inicial de página exibindo o design system estruturado.

#### Tarefa 9: Componente Layout & Navegação Lateral
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`
- **Depedências:** Tarefa 8
- **Ação:** Criar Sidebar de navegação responsiva (Dashboard, Atendimentos, Contatos, Automações, Modelos, Configurações). Exibir indicador Aberto/Fechado global.
- **INPUT:** Estrutura Next.js.
- **OUTPUT:** Layout principal responsivo e navegação estruturada.
- **VERIFY:** Layout exibido em desktops e ocultado apropriadamente em mobile com animações de abertura.

#### Tarefa 10: Dashboard View
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`
- **Depedências:** Tarefa 9
- **Ação:** Exibir métricas quantitativas de atendimentos (Ativos, Aguardando, Finalizados), toggle rápido do estado da loja e widget para gerenciar e reconectar a integração do WhatsApp via QR Code.
- **INPUT:** APIs REST do backend.
- **OUTPUT:** Dashboard responsivo e dinâmico com micro-interações de hover nos cards de métricas.
- **VERIFY:** Dashboard renderizado perfeitamente sem falhas visuais.

#### Tarefa 11: Tela de Atendimentos (3 Colunas)
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`, `react-best-practices`
- **Depedências:** Tarefa 10, Conexão WebSocket
- **Ação:** Implementar o painel tático de chats contendo:
  - **Coluna 1 (Lista de Conversas):** Separadores por abas ("Aguardando", "Em andamento", "Finalizados"). Busca por nome e tags. Exibe pré-visualização da última mensagem.
  - **Coluna 2 (Chat de Mensagens):** Histórico detalhado de balões. Inputs de texto, botões de envio de arquivos/mídia, botão rápido para selecionar e carregar Templates de mensagens cadastradas com variáveis dinâmicas.
  - **Coluna 3 (Detalhes do Contato/Ações):** Atribuição de agente, inclusão de tags, notas de observações internas que salvam automaticamente ao digitar, e botão destacado para Finalizar Atendimento (fecha o chat e altera o status para `FINISHED`).
- **INPUT:** WebSocket ativo e REST APIs.
- **OUTPUT:** Interface de chat ultra fluida e responsiva, com rolagem automática no fim das mensagens e atualização de status em tempo real.
- **VERIFY:** Envio de mensagem fictícia alterando o estado em tempo real no chat sem piscar ou recarregar a tela inteira.

#### Tarefa 12: Módulos CRM, Templates e Configurações (Conexão Whatsapp)
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`
- **Depedências:** Tarefa 11
- **Ação:** Interfaces para CRUD de Contatos, Templates com variáveis e a tela de configurações (configuração de horários, links, upload da imagem do jornal de ofertas e configurações da integração com Evolution API contendo campos Base URL, API Key e Nome da Instância).
- **INPUT:** Endpoints NestJS ativos.
- **OUTPUT:** Telas de CRUDs operando de forma integrada.
- **VERIFY:** Ao salvar as credenciais na tela de configurações de conexão, verificar se o status altera para "conectado/carregando" e o webhook é criado automaticamente.

---

## 🏁 Verificação de Qualidade (Fase X)
1. **Auditoria de Regras Estéticas (Manual):**
   - [ ] Sem cores violetas/roxas no Tailwind ou código customizado (Purple Ban).
   - [ ] Sem layouts de template óbvios (o visual técnico de HUD de alto contraste deve ser preservado).
   - [ ] Responsividade testada em mobile (principalmente a tela de chat).
2. **Execução de Testes e Lint:**
   - Rodar lint: `npm run lint` no front e no back.
   - Rodar testes unitários e de integração no backend: `npm run test`.
3. **Compilação Completa:**
   - Build do NestJS (`npm run build`).
   - Build do Next.js (`npm run build`).
4. **Varredura de Segurança:**
   - Certificar-se de que nenhuma chave ou segredo real foi exposto de forma hardcoded nos arquivos de produção do git.
