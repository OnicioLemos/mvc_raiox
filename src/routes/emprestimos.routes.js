const express = require('express');
const emprestimoController = require('../controllers/emprestimoController');

const router = express.Router();

router.get('/', emprestimoController.listar);
router.post('/', emprestimoController.criar);
router.post('/:id/devolver', emprestimoController.devolver);

module.exports = router;
