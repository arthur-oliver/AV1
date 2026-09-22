import { Validador } from './Validador';

export class ValidadorCNPJ extends Validador {
  validar(cnpj: string) {
    const d = (cnpj || '').replace(/\D/g, '');

    if (d.length !== 14 || /^([0-9])\1+$/.test(d)) {
      this.mensagemErro = 'CNPJ inválido.';
      return false;
    }

    const calc = (n: number) => {
      let sum = 0;
      let pos = n - 7;

      for (let i = 0; i < n; i++) {
        sum += +d[i] * pos--;

        if (pos < 2) {
          pos = 9;
        }
      }

      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };

    if (calc(12) !== +d[12] || calc(13) !== +d[13]) {
      this.mensagemErro = 'Dígitos verificadores do CNPJ inválidos.';
      return false;
    }

    return true;
  }
}