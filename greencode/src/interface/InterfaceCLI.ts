import readline from 'readline';
import { ServicoAutenticacao } from '../seguranca/ServicoAutenticacao';
import {
  PapelUsuario,
  StatusRastreamento,
  TipoEquipamento
} from '../modelos/enums';
import { ServicoOrganizacao } from '../servicos/ServicoOrganizacao';
import { ServicoLote } from '../servicos/ServicoLote';
import { ServicoEquipamento } from '../servicos/ServicoEquipamento';
import { ServicoRelatorio } from '../servicos/ServicoRelatorio';
import { Sessao } from '../modelos/domain';

export class CLIInterface {
  constructor(
    private autenticacao: ServicoAutenticacao,
    private organizacao: ServicoOrganizacao,
    private lote: ServicoLote,
    private equipamento: ServicoEquipamento,
    private relatorio: ServicoRelatorio,
    private sessaoAtual: Sessao | null = null
  ) {}

  private args(s: string) {
    const r: any = {};

    const m =
      s.match(
        /(?:^|\s)--([\w-]+)(?:\s+"([^"]*)"|\s+(\S+))?/g
      ) || [];

    for (const z of m) {
      const q = z.trim().match(
        /^--([\w-]+)(?:\s+"([^"]*)"|\s+(\S+))?/
      );

      if (q) {
        r[q[1]] = q[2] ?? q[3] ?? true;
      }
    }

    return r;
  }

  private exige(...p: PapelUsuario[]) {
    if (
      !this.sessaoAtual ||
      !this.autenticacao.validarToken(this.sessaoAtual.token)
    ) {
      throw new Error('Sessão inválida ou expirada.');
    }

    if (!p.includes(this.sessaoAtual.papel)) {
      throw new Error('Permissão insuficiente.');
    }
  }

  exibirMenuPorPapel(p: PapelUsuario) {
    console.log(
      `\nUsuário: ${this.sessaoAtual?.usuario} | Papel: ${p}\n` +
      `Comandos: org listar | lote criar | lote add-equip | lote triagem | ` +
      `equip rastrear | equip status | relatorio status | relatorio org | logout | sair`
    );
  }

  async iniciarLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'greencode> '
    });

    console.log('greencode iniciado. Digite comandos.');

    rl.prompt();

    rl.on('line', async l => {
      try {
        const r = this.processarComando(l.trim());

        if (r) {
          console.log(r);
        }
      } catch (e: any) {
        console.log(`[ERRO] ${e.message}`);
      }

      rl.prompt();
    });
  }

  processarComando(entrada: string): string | void {
    const [cmd, sub] = entrada.split(/\s+/);

    const a = this.args(entrada);

    if (cmd === 'sair') {
      process.exit(0);
    }

    if (cmd === 'login') {
      this.sessaoAtual = this.autenticacao.login(
        a.usuario,
        a.senha
      );

      return `Login efetuado. Papel: ${this.sessaoAtual.papel}`;
    }

    if (cmd === 'logout') {
      if (this.sessaoAtual) {
        this.autenticacao.logout(this.sessaoAtual.token);
      }

      this.sessaoAtual = null;

      return 'Logout efetuado.';
    }

    if (cmd === 'org' && sub === 'criar') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.OPERADOR_CADASTRO
      );

      return JSON.stringify(
        this.organizacao.cadastrarOrganizacao({
          razaoSocial: a.razao,
          cnpj: a.cnpj,
          inscricaoEstadual: a.ie,
          enderecoCompleto: a.endereco,
          telefone: a.telefone,
          email: a.email,
          vencimento: a.vencimento,
          valorMensal: a.valor
        }),
        null,
        2
      );
    }

    if (cmd === 'org' && sub === 'listar') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.OPERADOR_CADASTRO,
        PapelUsuario.GESTOR_ALMOXARIFADO,
        PapelUsuario.AUDITOR
      );

      return JSON.stringify(
        this.organizacao.listarOrganizacoesAtivas(),
        null,
        2
      );
    }

    if (cmd === 'lote' && sub === 'criar') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO
      );

      return JSON.stringify(
        this.lote.criarLote({
          organizacaoId: a.org,
          notaFiscal: a.nf,
          transportadora: a.transp,
          dataEntrada: a.data
        }),
        null,
        2
      );
    }

    if (cmd === 'lote' && sub === 'add-equip') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO
      );

      const e = this.equipamento.criar({
        tipo: a.tipo as TipoEquipamento,
        marca: a.marca,
        modelo: a.modelo,
        peso: a.peso,
        anoFabricacao: a.ano
      });

      this.lote.adicionarEquipamentoLote(a.lote, e);

      return `Equipamento ${e.id} adicionado.`;
    }

    if (cmd === 'lote' && sub === 'triagem') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO
      );

      this.lote.processarTriagem(a.lote);

      return 'Triagem concluída.';
    }

    if (cmd === 'equip' && sub === 'rastrear') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO,
        PapelUsuario.AUDITOR
      );

      return JSON.stringify(
        this.equipamento.rastrearEquipamento(a.id),
        null,
        2
      );
    }

    if (cmd === 'equip' && sub === 'status') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO
      );

      const e = this.equipamento.rastrearEquipamento(a.id)
        .equipamento as any;

      if (
        a.status === StatusRastreamento.EM_DESMONTE &&
        e.statusRastreamento !== StatusRastreamento.AGUARDANDO_DESMONTE
      ) {
        throw new Error(
          'Equipamento só pode ir para desmonte após triagem completa.'
        );
      }

      e.statusRastreamento = a.status;

      this.equipamento['repositorio'].salvarEntidade(
        'equipamentos',
        e
      );

      return 'Status atualizado.';
    }

    if (cmd === 'relatorio' && sub === 'status') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO,
        PapelUsuario.AUDITOR
      );

      return this.relatorio.gerarRelatorioPorStatus(
        a.status as StatusRastreamento
      );
    }

    if (cmd === 'relatorio' && sub === 'org') {
      this.exige(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.OPERADOR_CADASTRO,
        PapelUsuario.GESTOR_ALMOXARIFADO,
        PapelUsuario.AUDITOR
      );

      return this.relatorio.gerarRelatorioPorOrganizacao(
        a.org,
        {
          inicio: new Date(a.inicio || '2000-01-01'),
          fim: new Date(a.fim || '2100-01-01')
        }
      );
    }

    return 'Comando não reconhecido.';
  }
}
