// Ponto de entrada da aplicação.
const path = require('node:path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // sem .env: usa as variáveis de ambiente do sistema (ex.: Codespaces)
}

const express = require('express');
const raiox = require('./raiox/raiox');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ferramenta didática: precisa ser ativada ANTES de carregar as rotas.
raiox.ativar(app, {
  controllers: path.join(__dirname, 'controllers'),
  models: path.join(__dirname, 'models'),
});

app.use(require('./routes'));

app.use((req, res) => res.status(404).render('404', { url: req.originalUrl }));
app.use(raiox.tratadorDeErros);

const PORTA = Number(process.env.PORT) || 3000;
app.listen(PORTA, () => {
  console.log(`Biblioteca MVC rodando em http://localhost:${PORTA}`);
});
