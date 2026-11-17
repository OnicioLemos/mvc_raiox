// Uma única conexão com o banco, compartilhada por todos os models.
const { PrismaClient } = require('@prisma/client');
const raiox = require('../raiox/raiox');

const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }], // necessário para o raio-X mostrar o SQL
});

// O raio-X "observa" o Prisma para registrar cada consulta. Não muda o comportamento.
module.exports = raiox.observarPrisma(prisma);
