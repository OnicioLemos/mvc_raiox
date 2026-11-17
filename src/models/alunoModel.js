// MODEL de Aluno.
const prisma = require('../lib/prisma');
const RegraDeNegocioError = require('./RegraDeNegocioError');
const { LIMITE_POR_ALUNO } = require('./emprestimoModel');

async function listarTodos() {
  const alunos = await prisma.aluno.findMany({
    orderBy: { nome: 'asc' },
    include: { emprestimos: { where: { dataDevolucao: null } } },
  });
  return alunos.map((aluno) => ({
    id: aluno.id,
    nome: aluno.nome,
    matricula: aluno.matricula,
    emprestimosAtivos: aluno.emprestimos.length,
    podeEmprestar: aluno.emprestimos.length < LIMITE_POR_ALUNO,
  }));
}

async function criar({ nome, matricula }) {
  if (!nome || !nome.trim()) throw new RegraDeNegocioError('O nome é obrigatório.');
  if (!matricula || !matricula.trim()) throw new RegraDeNegocioError('A matrícula é obrigatória.');

  const existente = await prisma.aluno.findUnique({ where: { matricula: matricula.trim() } });
  if (existente) throw new RegraDeNegocioError(`Já existe um aluno com a matrícula ${matricula}.`);

  return prisma.aluno.create({ data: { nome: nome.trim(), matricula: matricula.trim() } });
}

async function excluir(id) {
  return prisma.aluno.delete({ where: { id } });
}

module.exports = { listarTodos, criar, excluir };
