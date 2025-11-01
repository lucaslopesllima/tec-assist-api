# TechAssist API

Backend para landing page da TechAssist - API de contatos com MongoDB.

## 🚀 Deploy no Vercel

### Pré-requisitos
- Conta no [Vercel](https://vercel.com)
- Conta no [MongoDB Atlas](https://www.mongodb.com/atlas)

### Passos para Deploy

1. **Clone o repositório**
   ```bash
   git clone <seu-repositorio>
   cd techassist-api
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente no Vercel**
   - `MONGODB_URI`: String de conexão do MongoDB Atlas
   - `MONGODB_USER`: Usuário do MongoDB
   - `MONGODB_PASS`: Senha do MongoDB
   - `FRONTEND_URL`: URL do frontend em produção

4. **Deploy**
   ```bash
   # Primeiro deploy
   vercel
   
   # Deploy para produção
   vercel --prod
   ```

### Estrutura para Vercel
```
/api
  ├── index.js     # Função principal
  └── health.js    # Health check endpoint
server.js          # Aplicação Express
vercel.json        # Configuração do Vercel
```

## 📋 Endpoints da API

### Health Check
- `GET /api/health` - Verifica se a API está funcionando

### Contatos
- `POST /api/contacts` - Criar novo contato
- `GET /api/contacts` - Listar contatos (com paginação)
- `GET /api/contacts/:id` - Buscar contato por ID
- `PUT /api/contacts/:id/status` - Atualizar status do contato

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📝 Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/database
PORT=3001
FRONTEND_URL=http://localhost:8082
MONGODB_USER=seu_usuario
MONGODB_PASS=sua_senha
```

## 🛠️ Tecnologias

- Node.js 24.x
- Express.js 4.x
- MongoDB com Mongoose 8.x
- Helmet (segurança)
- CORS
- Express Validator