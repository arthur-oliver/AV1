import crypto from 'crypto';

import {
  Credencial,
  Sessao,
  Autenticavel
} from '../modelos/domain';

import { PapelUsuario } from '../modelos/enums';

export class ServicoAutenticacao implements Autenticavel {
  constructor(
    public credenciais: Credencial[] = [],
    public sessoesAtivas: Sessao[] = []
  ) {}

  static criarHash(senha: string, salt: string) {
    return crypto
      .createHash('sha256')
      .update(salt + senha)
      .digest('hex');
  }

  autenticar(usuario: string, senha: string) {
    try {
      this.login(usuario, senha);
      return true;
    } catch {
      return false;
    }
  }

  login(usuario: string, senha: string) {
    const c = this.credenciais.find(
      x => x.usuario === usuario
    );

    if (!c || !c.verificarSenha(senha)) {
      throw new Error('Usuário ou senha inválidos.');
    }

    c.atualizarUltimoAcesso();

    const s = new Sessao(
      crypto.randomBytes(32).toString('hex'),
      usuario,
      c.papel,
      new Date(),
      new Date(Date.now() + 60 * 60 * 1000)
    );

    this.sessoesAtivas.push(s);

    return s;
  }

  logout(token: string) {
    this.sessoesAtivas = this.sessoesAtivas.filter(
      s => s.token !== token
    );
  }

  validarToken(token: string) {
    const s = this.sessoesAtivas.find(
      x => x.token === token
    );

    if (!s) {
      return false;
    }

    if (!s.isValida()) {
      this.logout(token);
      return false;
    }

    return true;
  }

  renovarToken() {
    const s =
      this.sessoesAtivas[this.sessoesAtivas.length - 1];

    if (!s) {
      throw new Error('Nenhuma sessão ativa.');
    }

    s.renovar();

    return s.token;
  }

  alterarSenha(
    usuario: string,
    antiga: string,
    novaSenha: string
  ) {
    const c = this.credenciais.find(
      x => x.usuario === usuario
    );

    if (!c || !c.verificarSenha(antiga)) {
      return false;
    }

    c.salt = crypto.randomBytes(16).toString('hex');

    c.hashSenha = ServicoAutenticacao.criarHash(
      novaSenha,
      c.salt
    );

    return true;
  }
}