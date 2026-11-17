# 📚 Biblioteca MVC + 🩻 Raio-X

App didático para estudar a arquitetura **MVC** com Node.js, Express, EJS, Prisma e MySQL.

Ele é um sistema simples de empréstimo de livros, com um **painel Raio-X** que mostra, para cada clique, por quais camadas a requisição passou:

```
ROTA  →  CONTROLLER  →  MODEL  →  BANCO (SQL)  →  VIEW
```

Clicando em cada etapa do painel você vê o arquivo, a linha, o código da função, os dados que ela recebeu e o que devolveu.

---

## Como rodar

### Opção 1: GitHub Codespaces (recomendado, não instala nada)

1. No GitHub, clique em **Code → Codespaces → Create codespace on main**.
2. Espere a preparação terminar (instala dependências, cria o banco MySQL e carrega os dados de exemplo).
3. No terminal, rode `npm run dev`.
4. Abra a porta **3000** quando o VS Code sugerir.

### Opção 2: no seu computador

Pré-requisitos: **Node.js 20.12+** e **MySQL 8** rodando.

```bash
git clone <url-deste-repositorio>
cd biblioteca-mvc-raiox
npm install
cp .env.example .env        # no Windows: copy .env.example .env
# edite o .env com o usuário e a senha do seu MySQL
npm run setup               # cria as tabelas e carrega os dados de exemplo
npm run dev
```

Acesse http://localhost:3000 e clique no botão **🩻 Raio-X** no canto inferior direito.

### Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia o servidor e reinicia a cada alteração |
| `npm run setup` | Cria as tabelas (migration `init`) e popula o banco |
| `npm run db:seed` | Apaga e recarrega os dados de exemplo |
| `npm run db:migrate -- --name <nome>` | Cria uma migration depois de alterar o `schema.prisma` |
| `npm run db:studio` | Abre o Prisma Studio para ver e editar os dados |

---

## Onde fica cada camada

```
src/
├── routes/         ROTAS       — URL + método HTTP → função do controller
├── controllers/    CONTROLLER  — lê a requisição, chama o model, escolhe a resposta
├── models/         MODEL       — regras de negócio e acesso ao banco (Prisma)
├── views/          VIEW        — templates EJS que só exibem dados
├── lib/prisma.js   conexão única com o banco
├── raiox/          ferramenta do painel (NÃO faz parte do MVC)
└── server.js       ponto de entrada
prisma/
├── schema.prisma   descrição das tabelas
└── seed.js         dados de exemplo
public/css/         estilos do app
```

### Regras de negócio do sistema

Ficam todas em `src/models/emprestimoModel.js`:

1. Um livro já emprestado não pode ser emprestado de novo.
2. Cada aluno pode ter no máximo **3** empréstimos ativos.

---

## Branches

| Branch | Para que serve |
| --- | --- |
| `main` | App correto. Base das missões 1, 3, 4 e 5. |
| `missao-2-bugs` | Mesmo app, com 5 violações de MVC escondidas. Base da missão 2. |
| `gabarito` | Solução de referência das missões 3 e 4 (para o professor). |

Para trocar de branch: `git checkout missao-2-bugs`.

---

## Como o Raio-X funciona (para curiosos)

O código está em `src/raiox/raiox.js` e é independente do app:

- um **middleware** abre um registro para cada requisição;
- as funções exportadas por `controllers/` e `models/` são **envolvidas** automaticamente para anotar cada chamada (o código delas não muda);
- o Prisma é observado com `$extends` e com o log de queries, para mostrar o SQL;
- `res.render`, `res.redirect` e `res.json` são observados para saber como a resposta terminou.

Para desligar, coloque `RAIOX=off` no `.env`.

> **Atenção:** o Raio-X é uma ferramenta de sala de aula. Ele expõe código e dados em `/raiox`, então nunca o deixe ligado em produção.
