const express = require('express');
const alunoController = require('../controllers/alunoController');

const router = express.Router();

router.get('/', alunoController.listar);
router.post('/', alunoController.criar);
router.post('/:id/excluir', alunoController.excluir);

module.exports = router;
