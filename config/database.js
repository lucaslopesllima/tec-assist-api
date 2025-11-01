import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI não está definida no arquivo .env');
    }

    console.log('Tentando conectar ao MongoDB...');
    
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, 
      socketTimeoutMS: 45000, 
      family: 4, 
      maxPoolSize: 10, 
      minPoolSize: 5, 
      maxIdleTimeMS: 30000, 
      bufferCommands: false, 
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB conectado com sucesso: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose conectado ao MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro na conexão do Mongoose:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose desconectado');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconectado');
    });

    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 Conexão MongoDB fechada devido ao encerramento da aplicação');
        process.exit(0);
      } catch (error) {
        console.error('Erro ao fechar conexão:', error);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Dicas para resolver:');
      console.error('   - Verifique se o IP está na whitelist do MongoDB Atlas');
      console.error('   - Confirme usuário e senha na connection string');
      console.error('   - Verifique se o cluster está ativo');
      console.error('   - Teste a conectividade de rede');
    }
    
    process.exit(1);
  }
};

export const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('✅ Ping ao MongoDB bem-sucedido');
    return true;
  } catch (error) {
    console.error('❌ Falha no ping ao MongoDB:', error.message);
    return false;
  }
};

export default connectDB;