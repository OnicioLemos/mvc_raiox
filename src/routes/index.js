// ROTAS: ligam cada URL + método HTTP a uma função de controller.
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/livros'));

router.use('/livros', require('./livros.routes'));
router.use('/alunos', require('./alunos.routes'));
router.use('/emprestimos', require('./emprestimos.routes'));

// Missão 4: registre aqui as rotas da API
// router.use('/api', require('./api.routes'));

module.exports = router;
