import { Validador } from './Validador';

export class ValidadorDataEntrada extends Validador {
  validar(data: Date) {
    const agora = Date.now();
    const t = data.getTime();
    const noventa = 90 * 24 * 60 * 60 * 1000;

    if (
      Number.isNaN(t) ||
      t > agora ||
      t < agora - noventa
    ) {
      this.mensagemErro =
        'A data de entrada deve estar entre hoje e os últimos 90 dias.';

      return false;
    }

    return true;
  }
}