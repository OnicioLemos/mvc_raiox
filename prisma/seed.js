// Popula o banco com dados de exemplo.
// Rode com: npx prisma db seed
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.emprestimo.deleteMany();
  await prisma.livro.deleteMany();
  await prisma.aluno.deleteMany();

  const livros = [
    { titulo: 'Dom Casmurro', autor: 'Machado de Assis', ano: 1899 },
    { titulo: 'O Cortiço', autor: 'Aluísio Azevedo', ano: 1890 },
    { titulo: 'Vidas Secas', autor: 'Graciliano Ramos', ano: 1938 },
    { titulo: 'Capitães da Areia', autor: 'Jorge Amado', ano: 1937 },
    { titulo: 'A Hora da Estrela', autor: 'Clarice Lispector', ano: 1977 },
    { titulo: 'Código Limpo', autor: 'Robert C. Martin', ano: 2008 },
    { titulo: 'Use a Cabeça! Padrões de Projetos', autor: 'Eric Freeman', ano: 2004 },
    { titulo: 'Entendendo Algoritmos', autor: 'Aditya Bhargava', ano: 2016 },
  ];
  const alunos = [
    { nome: 'Ana Souza', matricula: '2026001' },
    { nome: 'Bruno Lima', matricula: '2026002' },
    { nome: 'Carla Mendes', matricula: '2026003' },
    { nome: 'Diego Rocha', matricula: '2026004' },
  ];

  const livrosCriados = [];
  for (const livro of livros) livrosCriados.push(await prisma.livro.create({ data: livro }));
  const alunosCriados = [];
  for (const aluno of alunos) alunosCriados.push(await prisma.aluno.create({ data: aluno }));

  await prisma.emprestimo.create({ data: { livroId: livrosCriados[0].id, alunoId: alunosCriados[0].id } });
  await prisma.emprestimo.create({ data: { livroId: livrosCriados[5].id, alunoId: alunosCriados[1].id } });

  console.log(`Seed concluído: ${livros.length} livros, ${alunos.length} alunos, 2 empréstimos.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
