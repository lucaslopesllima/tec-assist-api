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
let isConnecting = false;

// Função para conectar ao MongoDB (otimizada para serverless)
async function connectToDatabase() {
  // Se já está conectado, retorna a conexão
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Se está tentando conectar, aguarda
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return connectToDatabase();
  }

  isConnecting = true;

  try {
    console.log('🔄 Tentando conectar ao MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI não está definida nas variáveis de ambiente');
    }

    // Log da URI (sem mostrar a senha)
    const uriForLog = process.env.MONGODB_URI.replace(/:([^:@]{8})[^:@]*@/, ':****@');
    console.log('📍 URI:', uriForLog);

    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      bufferCommands: false
    };

    // Desconectar se houver conexão anterior com problema
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB conectado com sucesso');
    console.log('📊 Database:', mongoose.connection.name);

    isConnecting = false;
    return cachedConnection;
  } catch (error) {
    isConnecting = false;
    console.error('❌ Erro detalhado ao conectar MongoDB:');
    console.error('   - Mensagem:', error.message);
    console.error('   - Código:', error.code);
    console.error('   - Nome:', error.name);

    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Possíveis causas:');
      console.error('   - IP não está na whitelist do MongoDB Atlas');
      console.error('   - Credenciais incorretas');
      console.error('   - Cluster inativo ou indisponível');
      console.error('   - Problemas de rede');
    }

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

// Middleware para conectar ao banco antes de cada requisição (exceto health check)
app.use(async (req, res, next) => {
  // Pular conexão para health check básico
  if (req.path === '/api/health' && req.method === 'GET') {
    return next();
  }

  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Erro na conexão do banco:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro de conexão com o banco de dados',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      timestamp: new Date().toISOString()
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
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  // Se solicitado, testa a conexão com o banco
  if (req.query.db === 'true') {
    try {
      await connectToDatabase();
      await mongoose.connection.db.admin().ping();
      healthCheck.database = {
        status: 'connected',
        name: mongoose.connection.name,
        host: mongoose.connection.host
      };
    } catch (error) {
      healthCheck.database = {
        status: 'error',
        message: error.message
      };
      healthCheck.success = false;
      return res.status(503).json(healthCheck);
    }
  }

  res.json(healthCheck);
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TechAssist API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      healthWithDB: '/api/health?db=true',
      dbTest: '/api/db-test',
      contacts: '/api/contacts'
    }
  });
});

// Endpoint para testar conexão do banco
app.get('/api/db-test', async (req, res) => {
  try {
    console.log('🧪 Testando conexão com MongoDB...');

    // Verificar variáveis de ambiente
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        success: false,
        message: 'MONGODB_URI não configurada',
        timestamp: new Date().toISOString()
      });
    }

    await connectToDatabase();
    await mongoose.connection.db.admin().ping();

    const dbStats = await mongoose.connection.db.stats();

    res.json({
      success: true,
      message: 'Conexão com MongoDB funcionando',
      database: {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no teste do banco:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na conexão com MongoDB',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
