// MODEL de Empréstimo: é aqui que moram as regras de negócio do sistema.
const prisma = require('../lib/prisma');
const RegraDeNegocioError = require('./RegraDeNegocioError');

const LIMITE_POR_ALUNO = 3;

async function listarTodos() {
  return prisma.emprestimo.findMany({
    orderBy: [{ dataDevolucao: 'asc' }, { dataEmprestimo: 'desc' }],
    include: { livro: true, aluno: true },
  });
}

async function criar({ livroId, alunoId }) {
  if (!livroId || !alunoId) throw new RegraDeNegocioError('Escolha um livro e um aluno.');

  // Regra 1: um livro só pode estar com um aluno por vez.
  const livroEmprestado = await prisma.emprestimo.findFirst({
    where: { livroId, dataDevolucao: null },
  });
  if (livroEmprestado) {
    throw new RegraDeNegocioError('Este livro já está emprestado.');
  }

  // Regra 2: cada aluno pode ter no máximo LIMITE_POR_ALUNO empréstimos ativos.
  const ativosDoAluno = await prisma.emprestimo.count({
    where: { alunoId, dataDevolucao: null },
  });
  if (ativosDoAluno >= LIMITE_POR_ALUNO) {
    throw new RegraDeNegocioError(`O aluno já tem ${LIMITE_POR_ALUNO} empréstimos ativos.`);
  }

  return prisma.emprestimo.create({ data: { livroId, alunoId } });
}

async function devolver(id) {
  // Não apagamos o registro: marcamos a data de devolução para manter o histórico.
  return prisma.emprestimo.update({
    where: { id },
    data: { dataDevolucao: new Date() },
  });
}

module.exports = { LIMITE_POR_ALUNO, listarTodos, criar, devolver };
