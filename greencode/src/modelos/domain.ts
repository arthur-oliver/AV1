import {
  EstadoFisico,
  PapelUsuario,
  StatusLote,
  StatusRastreamento,
  TipoEquipamento
} from './enums';

export class Credencial {
  constructor(
    public usuario: string,
    public hashSenha: string,
    public salt: string,
    public ultimoAcesso: Date,
    public papel: PapelUsuario
  ) {}

  verificarSenha(senhaPlana: string) {
    return require('crypto')
      .createHash('sha256')
      .update(this.salt + senhaPlana)
      .digest('hex') === this.hashSenha;
  }

  atualizarUltimoAcesso() {
    this.ultimoAcesso = new Date();
  }
}

export class Sessao {
  constructor(
    public token: string,
    public usuario: string,
    public papel: PapelUsuario,
    public criacao: Date,
    public expiracao: Date
  ) {}

  isValida() {
    return Date.now() < this.expiracao.getTime();
  }

  renovar() {
    this.expiracao = new Date(Date.now() + 30 * 60 * 1000);
  }
}

export interface Autenticavel {
  autenticar(usuario: string, senha: string): boolean;
  renovarToken(): string;
}

export class Contrato {
  constructor(
    public id: string,
    public organizacaoId: string,
    public dataAssinatura: Date,
    public dataVencimento: Date,
    public clausulas: string[],
    public valorMensal: number,
    public renovacaoAutomatica: boolean
  ) {}

  estaVigente() {
    return new Date() <= this.dataVencimento;
  }

  renovar(novoVencimento: Date) {
    this.dataVencimento = novoVencimento;
  }
}

export class Organizacao {
  constructor(
    public id: string,
    public razaoSocial: string,
    public cnpj: string,
    public inscricaoEstadual: string,
    public enderecoCompleto: string,
    public telefone: string,
    public email: string,
    public dataCadastro: Date,
    public ativo: boolean,
    public contratoVigente: Contrato
  ) {}

  alterarEndereco(novoEndereco: string) {
    this.enderecoCompleto = novoEndereco;
  }

  desativar() {
    this.ativo = false;
  }
}

export class Movimentacao {
  constructor(
    public id: string,
    public equipamentoId: string,
    public dataHora: Date,
    public origem: string,
    public destino: string,
    public responsavel: string,
    public observacao: string
  ) {}
}

export class Equipamento {
  constructor(
    public id: string,
    public codigoBarrasInterno: string,
    public tipo: TipoEquipamento,
    public marca: string,
    public modelo: string,
    public anoFabricacao: number,
    public estadoFisico: EstadoFisico,
    public pesoQuilogramas: number,
    public loteId: string,
    public posicaoNoLote: number,
    public statusRastreamento: StatusRastreamento,
    public historicoMovimentacao: Movimentacao[] = []
  ) {}

  atualizarStatus(
    novoStatus: StatusRastreamento,
    justificativa: string
  ) {
    if (
      !justificativa?.trim() &&
      novoStatus !== this.statusRastreamento
    ) {
      throw new Error(
        'Justificativa obrigatória para alteração de status.'
      );
    }

    this.statusRastreamento = novoStatus;
  }

  registrarMovimentacao(
    destino: string,
    responsavel: string,
    observacao = ''
  ) {
    this.historicoMovimentacao.push(
      new Movimentacao(
        crypto.randomUUID(),
        this.id,
        new Date(),
        this.statusRastreamento,
        destino,
        responsavel,
        observacao
      )
    );
  }

  calcularDepreciacao() {
    const idade = Math.max(
      0,
      new Date().getFullYear() - this.anoFabricacao
    );

    return Math.min(1, idade * 0.1);
  }
}

export class Lote {
  constructor(
    public id: string,
    public dataEntrada: Date,
    public organizacaoId: string,
    public notaFiscal: string,
    public transportadora: string,
    public equipamentos: Equipamento[],
    public statusProcessamento: StatusLote,
    public observacoes: string
  ) {}

  adicionarEquipamento(equip: Equipamento) {
    this.equipamentos.push(equip);
  }

  removerEquipamento(equipId: string) {
    const n = this.equipamentos.length;

    this.equipamentos = this.equipamentos.filter(
      e => e.id !== equipId
    );

    return this.equipamentos.length < n;
  }

  calcularPesoTotal() {
    return this.equipamentos.reduce(
      (s, e) => s + e.pesoQuilogramas,
      0
    );
  }

  gerarRelatorioTriagem() {
    return `Lote ${this.id}: ${this.equipamentos.length} equipamento(s), ${this.calcularPesoTotal().toFixed(2)} kg, status ${this.statusProcessamento}.`;
  }
}

export class JournalTransacao {
  constructor(
    public id: string,
    public timestamp: Date,
    public operacao: string,
    public entidade: string,
    public dadosAntes: any,
    public dadosDepois: any,
    public usuarioResponsavel: string
  ) {}

  registrar() {}

  reverter() {
    return true;
  }
}

export type HistoricoCompleto = {
  equipamento: Equipamento;
  movimentacoes: Movimentacao[];
};