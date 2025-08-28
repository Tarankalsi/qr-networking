const { PrismaClient } = require('@prisma/client');

const isDevelopment = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: isDevelopment 
        ? process.env.DATABASE_URL?.replace('sslmode=require', 'sslmode=prefer')
        : process.env.DATABASE_URL
    }
  }
});

module.exports = prisma;