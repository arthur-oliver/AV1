import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { CriptografiaArquivo } from './seguranca/CriptografiaArquivo';
import { RepositorioArquivo } from './repositorios/RepositorioArquivo';
import { ServicoAutenticacao } from './seguranca/ServicoAutenticacao';
import { Credencial } from './modelos/domain';
import { PapelUsuario } from './modelos/enums';
import { ValidadorCNPJ } from './validadores/ValidadorCNPJ';
import { ServicoOrganizacao } from './servicos/ServicoOrganizacao';
import { ServicoLote } from './servicos/ServicoLote';
import { ServicoEquipamento } from './servicos/ServicoEquipamento';
import { ServicoRelatorio } from './servicos/ServicoRelatorio';
import { CLIInterface } from './interface/InterfaceCLI';
import { Journal } from './utilitarios/Journal';

const base = path.resolve(process.cwd(), 'data');

fs.mkdirSync(base, { recursive: true });

const cfg = path.join(base, 'master.json');

let chave: string;
let credenciais: Credencial[] = [];

const criarCredencial = (
  usuario: string,
  senha: string,
  papel: PapelUsuario
) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Credencial(
    usuario,
    ServicoAutenticacao.criarHash(senha, salt),
    salt,
    new Date(),
    papel
  );
};

const usuariosPadrao = [
  {
    usuario: 'admin',
    senha: 'Admin@123',
    papel: PapelUsuario.ADMINISTRADOR
  },
  {
    usuario: 'operador',
    senha: 'Operador@123',
    papel: PapelUsuario.OPERADOR_CADASTRO
  },
  {
    usuario: 'gestor',
    senha: 'Gestor@123',
    papel: PapelUsuario.GESTOR_ALMOXARIFADO
  },
  {
    usuario: 'auditor',
    senha: 'Auditor@123',
    papel: PapelUsuario.AUDITOR
  }
];

if (fs.existsSync(cfg)) {
  const c = JSON.parse(fs.readFileSync(cfg, 'utf8'));

  chave = c.chave;

  credenciais = (c.credenciais || []).map(
    (x: any) =>
      new Credencial(
        x.usuario,
        x.hashSenha,
        x.salt,
        new Date(x.ultimoAcesso),
        x.papel
      )
  );
//rossi
  let alterouCredenciais = false;

  for (const usuario of usuariosPadrao) {
    const existe = credenciais.some(
      x => x.usuario === usuario.usuario
    );

    if (!existe) {
      credenciais.push(
        criarCredencial(
          usuario.usuario,
          usuario.senha,
          usuario.papel
        )
      );

      alterouCredenciais = true;
    }
  }

  if (alterouCredenciais) {
    fs.writeFileSync(
      cfg,
      JSON.stringify({
        chave,
        credenciais
      })
    );

    console.log('Novos usuários adicionados ao sistema.');
  }
} else {
  chave = new CriptografiaArquivo().gerarChave();

  credenciais = usuariosPadrao.map(usuario =>
    criarCredencial(
      usuario.usuario,
      usuario.senha,
      usuario.papel
    )
  );

  fs.writeFileSync(
    cfg,
    JSON.stringify({
      chave,
      credenciais
    })
  );

  console.log('Provisionamento inicial concluído.');
  console.log('');
  console.log('Usuários criados:');
  console.log('admin     / Admin@123     / ADMINISTRADOR');
  console.log('operador  / Operador@123  / OPERADOR_CADASTRO');
  console.log('gestor    / Gestor@123    / GESTOR_ALMOXARIFADO');
  console.log('auditor   / Auditor@123   / AUDITOR');
  console.log('');
}

const cryptoArq = new CriptografiaArquivo();

const journal = new Journal(
  path.join(base, 'journal'),
  cryptoArq,
  chave
);

const repo = new RepositorioArquivo(
  base,
  cryptoArq,
  chave,
  journal
);

const auth = new ServicoAutenticacao(credenciais);

const org = new ServicoOrganizacao(
  repo,
  new ValidadorCNPJ()
);

const lote = new ServicoLote(repo);

const equip = new ServicoEquipamento(repo);

const rel = new ServicoRelatorio(repo);

new CLIInterface(
  auth,
  org,
  lote,
  equip,
  rel
).iniciarLoop();