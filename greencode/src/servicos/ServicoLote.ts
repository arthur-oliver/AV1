import { Lote, Equipamento } from '../modelos/domain';
import { StatusLote, StatusRastreamento } from '../modelos/enums';
import { RepositorioArquivo } from '../repositorios/RepositorioArquivo';
import { ValidadorDataEntrada } from '../validadores/ValidadorDataEntrada';

export class ServicoLote {
  constructor(
    private repositorio: RepositorioArquivo,
    private validador = new ValidadorDataEntrada()
  ) {}

  criarLote(d: any) {
    const data = new Date(d.dataEntrada || Date.now());

    if (!this.validador.validar(data)) {
      throw new Error(this.validador.obterMensagemErro());
    }

    if (!this.repositorio.carregarEntidade('organizacoes', d.organizacaoId)) {
      throw new Error('Organização não encontrada.');
    }

    const l = new Lote(
      crypto.randomUUID(),
      data,
      d.organizacaoId,
      d.notaFiscal,
      d.transportadora,
      [],
      StatusLote.RECEBIDO,
      d.observacoes || ''
    );

    this.repositorio.salvarEntidade('lotes', l);

    return l;
  }

  adicionarEquipamentoLote(id: string, e: Equipamento) {
    const l = this.buscar(id);

    e.loteId = id;
    e.posicaoNoLote = l.equipamentos.length + 1;
    e.statusRastreamento = StatusRastreamento.AGUARDANDO_TRIAGEM;

    l.adicionarEquipamento(e);

    this.repositorio.salvarEntidade('lotes', l);
    this.repositorio.salvarEntidade('equipamentos', e);
  }

  processarTriagem(id: string) {
    const l = this.buscar(id);

    l.statusProcessamento = StatusLote.EM_TRIAGEM;

    for (const e of l.equipamentos) {
      e.statusRastreamento = StatusRastreamento.EM_TRIAGEM;
      this.repositorio.salvarEntidade('equipamentos', e);
    }

    l.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;

    this.repositorio.salvarEntidade('lotes', l);
  }

  buscar(id: string) {
    const x: any = this.repositorio.carregarEntidade('lotes', id);

    if (!x) {
      throw new Error('Lote não encontrado.');
    }

    const equipamentos = (x.equipamentos || []) as Equipamento[];

    return new Lote(
      x.id,
      new Date(x.dataEntrada),
      x.organizacaoId,
      x.notaFiscal,
      x.transportadora,
      equipamentos,
      x.statusProcessamento,
      x.observacoes || ''
    );
  }

  consultarLotePorPeriodo(a: Date, b: Date) {
    return this.repositorio
      .listarEntidades('lotes')
      .filter(
        (x: any) =>
          new Date(x.dataEntrada) >= a &&
          new Date(x.dataEntrada) <= b
      ) as Lote[];
  }
}
