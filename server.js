import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import contactRoutes from './routes/contacts.js';

// Configurar variáveis de ambiente
dotenv.config();

const app = express();

// Cache da conexão MongoDB para reutilização em serverless
let cachedConnection = null;

// Função para conectar ao MongoDB (otimizada para serverless)
async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI não está definida');
    }

    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      bufferCommands: false
    };

    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB conectado');
    return cachedConnection;
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error.message);
    throw error;
  }
}

// Middlewares de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// Configurar CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, 'https://techassist.vercel.app']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para conectar ao banco antes de cada requisição
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Erro na conexão do banco:', error);
    res.status(500).json({
      success: false,
      message: 'Erro de conexão com o banco de dados'
    });
  }
});

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api/contacts', contactRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TechAssist API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      contacts: '/api/contacts'
    }
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { error: error.message })
  });
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, async () => {
    await connectToDatabase();
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
