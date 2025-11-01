// Script de inicialização do MongoDB
db = db.getSiblingDB('techassist');

// Criar usuário para a aplicação
db.createUser({
  user: 'techassist_user',
  pwd: 'techassist_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'techassist'
    }
  ]
});

// Criar coleção de contatos com validação
db.createCollection('contacts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'phone', 'email'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Nome completo é obrigatório'
        },
        phone: {
          bsonType: 'string',
          pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
          description: 'Telefone deve estar no formato (11) 99999-9999'
        },
        email: {
          bsonType: 'string',
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          description: 'Email deve ter formato válido'
        },
        status: {
          bsonType: 'string',
          enum: ['novo', 'contatado', 'proposta_enviada', 'fechado'],
          description: 'Status deve ser um dos valores permitidos'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Data de criação'
        }
      }
    }
  }
});

// Criar índices
db.contacts.createIndex({ email: 1 }, { unique: true });
db.contacts.createIndex({ createdAt: -1 });
db.contacts.createIndex({ status: 1 });

print('Database techassist inicializado com sucesso!');
