// Erro usado quando uma regra de negócio impede uma operação.
// O controller reconhece este tipo de erro e mostra a mensagem ao usuário.
class RegraDeNegocioError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'RegraDeNegocioError';
  }
}

module.exports = RegraDeNegocioError;
