import crypto from 'crypto';

import {
  Equipamento,
  HistoricoCompleto
} from '../modelos/domain';

import { RepositorioArquivo } from '../repositorios/RepositorioArquivo';

import {
  EstadoFisico,
  StatusRastreamento,
  TipoEquipamento
} from '../modelos/enums';

export class ServicoEquipamento {
  constructor(
    private repositorio: RepositorioArquivo
  ) {}

  rastrearEquipamento(
    id: string
  ): HistoricoCompleto {
    const e = this.repositorio.carregarEntidade(
      'equipamentos',
      id
    );

    if (!e) {
      throw new Error('Equipamento não encontrado.');
    }

    return {
      equipamento: e,
      movimentacoes: e.historicoMovimentacao || []
    };
  }

  atualizarEstadoFisico(
    id: string,
    novo: EstadoFisico,
    justificativa = ''
  ) {
    const e = this.repositorio.carregarEntidade(
      'equipamentos',
      id
    ) as Equipamento;

    if (!e) {
      throw new Error('Equipamento não encontrado.');
    }

    const anterior = Object.values(EstadoFisico).indexOf(
      e.estadoFisico
    );

    const atual = Object.values(EstadoFisico).indexOf(
      novo
    );

    if (
      atual - anterior >= 2 &&
      !justificativa.trim()
    ) {
      throw new Error(
        'Justificativa obrigatória para queda de duas ou mais categorias.'
      );
    }

    e.estadoFisico = novo;

    this.repositorio.salvarEntidade(
      'equipamentos',
      e
    );
  }

  gerarCodigoBarras(
    tipo: TipoEquipamento,
    seq: number
  ) {
    return `GC-${tipo.substring(0, 4)}-${String(seq).padStart(6, '0')}`;
  }

  criar(d: any) {
    const e = new Equipamento(
      d.id || crypto.randomUUID(),
      d.codigoBarrasInterno ||
        this.gerarCodigoBarras(
          d.tipo,
          Date.now() % 1000000
        ),
      d.tipo,
      d.marca || '',
      d.modelo || '',
      Number(
        d.anoFabricacao ||
          new Date().getFullYear()
      ),
      d.estadoFisico ||
        EstadoFisico.USADO_LEVE,
      Number(d.peso || 0),
      d.loteId || '',
      Number(d.posicao || 0),
      StatusRastreamento.AGUARDANDO_TRIAGEM,
      []
    );

    this.repositorio.salvarEntidade(
      'equipamentos',
      e
    );

    return e;
  }
}
// arthur