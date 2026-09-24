import fs from 'fs';
import os from 'os';
import path from 'path';

import {
    PapelUsuario,
    StatusLote,
    TipoEquipamento,
    EstadoFisico,
    StatusRastreamento
} from '../src/modelos/enums';

import {
    Credencial
} from '../src/modelos/domain';

import {
    CriptografiaArquivo
} from '../src/seguranca/CriptografiaArquivo';

import {
    ServicoAutenticacao
} from '../src/seguranca/ServicoAutenticacao';

import {
    RepositorioArquivo
} from '../src/repositorios/RepositorioArquivo';

import {
    ServicoOrganizacao
} from '../src/servicos/ServicoOrganizacao';

import {
    ServicoLote
} from '../src/servicos/ServicoLote';

import {
    ServicoEquipamento
} from '../src/servicos/ServicoEquipamento';

import {
    ValidadorCNPJ
} from '../src/validadores/ValidadorCNPJ';

import {
    ValidadorDataEntrada
} from '../src/validadores/ValidadorDataEntrada';


// Teste de CNPJ

describe('CNPJ', () => {
    test('deve aceitar CNPJ válido', () => {
        let validador = new ValidadorCNPJ();

        expect(
            validador.validar('11.222.333/0001-81')
        ).toBe(true);
    });

    test('deve rejeitar CNPJ inválido', () => {
        let validador = new ValidadorCNPJ();

        expect(
            validador.validar('11.222.333/0001-82')
        ).toBe(false);
    });

    test('deve rejeitar CNPJ com quantidade de dígitos incorreta', () => {
        let validador = new ValidadorCNPJ();

        expect(
            validador.validar('123')
        ).toBe(false);
    });
});


// Teste de data

describe('Data de entrada', () => {
    test('deve aceitar a data de hoje', () => {
        let validador = new ValidadorDataEntrada();

        expect(
            validador.validar(new Date())
        ).toBe(true);
    });

    test('deve aceitar uma data dos últimos 90 dias', () => {
        let validador = new ValidadorDataEntrada();

        let data = new Date();

        data.setDate(
            data.getDate() - 30
        );

        expect(
            validador.validar(data)
        ).toBe(true);
    });

    test('deve rejeitar uma data futura', () => {
        let validador = new ValidadorDataEntrada();

        let data = new Date();

        data.setDate(
            data.getDate() + 1
        );

        expect(
            validador.validar(data)
        ).toBe(false);
    });

    test('deve rejeitar uma data com mais de 90 dias', () => {
        let validador = new ValidadorDataEntrada();

        let data = new Date();

        data.setDate(
            data.getDate() - 91
        );

        expect(
            validador.validar(data)
        ).toBe(false);
    });
});


// Teste de autenticação

describe('Autenticação', () => {
    let autenticacao: ServicoAutenticacao;

    beforeEach(() => {
        let credenciais: Credencial[] = [];

        let criarCredencial = (
            usuario: string,
            senha: string,
            papel: PapelUsuario
        ) => {
            let salt = 'salt-teste';

            let hashSenha =
                ServicoAutenticacao.criarHash(
                    senha,
                    salt
                );

            credenciais.push(
                new Credencial(
                    usuario,
                    hashSenha,
                    salt,
                    new Date(),
                    papel
                )
            );
        };

        criarCredencial(
            'admin',
            'Admin@123',
            PapelUsuario.ADMINISTRADOR
        );

        criarCredencial(
            'operador',
            'Operador@123',
            PapelUsuario.OPERADOR_CADASTRO
        );

        criarCredencial(
            'gestor',
            'Gestor@123',
            PapelUsuario.GESTOR_ALMOXARIFADO
        );

        criarCredencial(
            'auditor',
            'Auditor@123',
            PapelUsuario.AUDITOR
        );

        autenticacao =
            new ServicoAutenticacao(
                credenciais
            );
    });

    test('deve realizar login corretamente', () => {
        let sessao =
            autenticacao.login(
                'admin',
                'Admin@123'
            );

        expect(sessao).toBeDefined();

        expect(sessao.usuario).toBe(
            'admin'
        );

        expect(sessao.papel).toBe(
            PapelUsuario.ADMINISTRADOR
        );

        expect(
            sessao.isValida()
        ).toBe(true);
    });

    test('deve rejeitar senha incorreta', () => {
        expect(() => {
            autenticacao.login(
                'admin',
                'senha-errada'
            );
        }).toThrow(
            'Usuário ou senha inválidos.'
        );
    });

    test('deve rejeitar usuário inexistente', () => {
        expect(() => {
            autenticacao.login(
                'usuario-inexistente',
                '123456'
            );
        }).toThrow(
            'Usuário ou senha inválidos.'
        );
    });

    test('deve reconhecer os quatro papéis de usuário', () => {
        let admin =
            autenticacao.login(
                'admin',
                'Admin@123'
            );

        let operador =
            autenticacao.login(
                'operador',
                'Operador@123'
            );

        let gestor =
            autenticacao.login(
                'gestor',
                'Gestor@123'
            );

        let auditor =
            autenticacao.login(
                'auditor',
                'Auditor@123'
            );

        expect(admin.papel).toBe(
            PapelUsuario.ADMINISTRADOR
        );

        expect(operador.papel).toBe(
            PapelUsuario.OPERADOR_CADASTRO
        );

        expect(gestor.papel).toBe(
            PapelUsuario.GESTOR_ALMOXARIFADO
        );

        expect(auditor.papel).toBe(
            PapelUsuario.AUDITOR
        );
    });

    test('deve validar o token da sessão', () => {
        let sessao =
            autenticacao.login(
                'admin',
                'Admin@123'
            );

        expect(
            autenticacao.validarToken(
                sessao.token
            )
        ).toBe(true);
    });

    test('deve invalidar a sessão após logout', () => {
        let sessao =
            autenticacao.login(
                'admin',
                'Admin@123'
            );

        autenticacao.logout(
            sessao.token
        );

        expect(
            autenticacao.validarToken(
                sessao.token
            )
        ).toBe(false);
    });

    test('deve alterar a senha corretamente', () => {
        let resultado =
            autenticacao.alterarSenha(
                'admin',
                'Admin@123',
                'NovaSenha@123'
            );

        expect(resultado).toBe(true);

        let sessao =
            autenticacao.login(
                'admin',
                'NovaSenha@123'
            );

        expect(sessao.usuario).toBe(
            'admin'
        );
    });
});


// Teste de equipamento

describe('Equipamento', () => {
    test('deve criar equipamento', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servico =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servico.criar({
                tipo: TipoEquipamento.NOTEBOOK,
                estadoFisico: EstadoFisico.USADO_LEVE,
                peso: 2.5
            });

        expect(equipamento).toBeDefined();

        expect(equipamento.tipo).toBe(
            TipoEquipamento.NOTEBOOK
        );

        expect(equipamento.estadoFisico).toBe(
            EstadoFisico.USADO_LEVE
        );

        expect(equipamento.pesoQuilogramas).toBe(
            2.5
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });

    test('deve atualizar o estado físico do equipamento', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servico =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servico.criar({
                tipo: TipoEquipamento.NOTEBOOK,
                estadoFisico: EstadoFisico.BOM_ESTADO,
                peso: 2
            });

        servico.atualizarEstadoFisico(
            equipamento.id,
            EstadoFisico.USADO_LEVE
        );

        let atualizado =
            repositorio.carregarEntidade(
                'equipamentos',
                equipamento.id
            );

        expect(
            atualizado.estadoFisico
        ).toBe(
            EstadoFisico.USADO_LEVE
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });

    test('deve exigir justificativa para queda de duas ou mais categorias', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servico =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servico.criar({
                tipo: TipoEquipamento.NOTEBOOK,
                estadoFisico: EstadoFisico.BOM_ESTADO,
                peso: 2
            });

        expect(() => {
            servico.atualizarEstadoFisico(
                equipamento.id,
                EstadoFisico.DANIFICADO_LEVE
            );
        }).toThrow(
            'Justificativa obrigatória para queda de duas ou mais categorias.'
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});


// Teste de organização

describe('Organização', () => {
    test('deve cadastrar uma organização', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let validador =
            new ValidadorCNPJ();

        let servico =
            new ServicoOrganizacao(
                repositorio,
                validador
            );

        let organizacao =
            servico.cadastrarOrganizacao({
                razaoSocial:
                    'Empresa Teste LTDA',

                nomeFantasia:
                    'Empresa Teste',

                cnpj:
                    '11.222.333/0001-81'
            });

        expect(
            organizacao
        ).toBeDefined();

        expect(
            organizacao.razaoSocial
        ).toBe(
            'Empresa Teste LTDA'
        );

        expect(
            organizacao.cnpj
        ).toBe(
            '11.222.333/0001-81'
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });

    test('não deve permitir CNPJ duplicado', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let validador =
            new ValidadorCNPJ();

        let servico =
            new ServicoOrganizacao(
                repositorio,
                validador
            );

        let dados = {
            razaoSocial:
                'Empresa Teste LTDA',

            nomeFantasia:
                'Empresa Teste',

            cnpj:
                '11.222.333/0001-81'
        };

        servico.cadastrarOrganizacao(
            dados
        );

        expect(() => {
            servico.cadastrarOrganizacao(
                dados
            );
        }).toThrow(
            'CNPJ já cadastrado.'
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});


// Teste de lote

describe('Lote', () => {
    test('deve criar um lote para uma organização', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servicoOrganizacao =
            new ServicoOrganizacao(
                repositorio,
                new ValidadorCNPJ()
            );

        let organizacao =
            servicoOrganizacao.cadastrarOrganizacao({
                razaoSocial:
                    'Empresa Teste LTDA',

                nomeFantasia:
                    'Empresa Teste',

                cnpj:
                    '11.222.333/0001-81'
            });

        let servicoLote =
            new ServicoLote(
                repositorio
            );

        let lote =
            servicoLote.criarLote({
                organizacaoId:
                    organizacao.id,

                dataEntrada:
                    new Date(),

                notaFiscal:
                    'NF-001',

                transportadora:
                    'Transportadora Teste'
            });

        expect(lote).toBeDefined();

        expect(
            lote.organizacaoId
        ).toBe(
            organizacao.id
        );

        expect(
            lote.statusProcessamento
        ).toBe(
            StatusLote.RECEBIDO
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });

    test('não deve criar lote para organização inexistente', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servicoLote =
            new ServicoLote(
                repositorio
            );

        expect(() => {
            servicoLote.criarLote({
                organizacaoId:
                    'organizacao-inexistente',

                dataEntrada:
                    new Date()
            });
        }).toThrow(
            'Organização não encontrada.'
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});


// Teste de triagem

describe('Triagem', () => {
    test('deve adicionar equipamento ao lote e concluir a triagem', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servicoOrganizacao =
            new ServicoOrganizacao(
                repositorio,
                new ValidadorCNPJ()
            );

        let organizacao =
            servicoOrganizacao.cadastrarOrganizacao({
                razaoSocial:
                    'Empresa Teste LTDA',

                nomeFantasia:
                    'Empresa Teste',

                cnpj:
                    '11.222.333/0001-81'
            });

        let servicoLote =
            new ServicoLote(
                repositorio
            );

        let lote =
            servicoLote.criarLote({
                organizacaoId:
                    organizacao.id,

                dataEntrada:
                    new Date(),

                notaFiscal:
                    'NF-001',

                transportadora:
                    'Transportadora Teste'
            });

        let servicoEquipamento =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servicoEquipamento.criar({
                tipo:
                    TipoEquipamento.NOTEBOOK,

                estadoFisico:
                    EstadoFisico.USADO_LEVE,

                peso:
                    2
            });

        servicoLote.adicionarEquipamentoLote(
            lote.id,
            equipamento
        );

        servicoLote.processarTriagem(
            lote.id
        );

        let loteAtualizado =
            servicoLote.buscar(
                lote.id
            );

        expect(
            loteAtualizado.statusProcessamento
        ).toBe(
            StatusLote.TRIAGEM_CONCLUIDA
        );

        let equipamentoAtualizado =
            repositorio.carregarEntidade(
                'equipamentos',
                equipamento.id
            );

        expect(
            equipamentoAtualizado.statusRastreamento
        ).toBe(
            StatusRastreamento.EM_TRIAGEM
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});


// Teste de rastreamento

describe('Rastreamento', () => {
    test('deve registrar e consultar movimentações do equipamento', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let servicoEquipamento =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servicoEquipamento.criar({
                tipo:
                    TipoEquipamento.NOTEBOOK,

                estadoFisico:
                    EstadoFisico.USADO_LEVE,

                peso:
                    2
            });

        equipamento.registrarMovimentacao(
            'Setor de Triagem',
            'gestor',
            'Equipamento recebido para triagem'
        );

        repositorio.salvarEntidade(
            'equipamentos',
            equipamento
        );

        let rastreamento =
            servicoEquipamento.rastrearEquipamento(
                equipamento.id
            );

        expect(
            rastreamento.equipamento.id
        ).toBe(
            equipamento.id
        );

        expect(
            rastreamento.movimentacoes.length
        ).toBe(1);

        expect(
            rastreamento.movimentacoes[0].destino
        ).toBe(
            'Setor de Triagem'
        );

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});


// Teste da jornada completa

describe('Jornada completa', () => {
    test('deve executar o fluxo completo do sistema', () => {
        let diretorio =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'greencode-teste-'
                )
            );

        let criptografia =
            new CriptografiaArquivo();

        let chave =
            criptografia.gerarChave();

        let repositorio =
            new RepositorioArquivo(
                diretorio,
                criptografia,
                chave
            );

        let credenciais: Credencial[] = [];

        let salt =
            'salt-teste';

        let hashSenha =
            ServicoAutenticacao.criarHash(
                'Admin@123',
                salt
            );

        credenciais.push(
            new Credencial(
                'admin',
                hashSenha,
                salt,
                new Date(),
                PapelUsuario.ADMINISTRADOR
            )
        );

        let autenticacao =
            new ServicoAutenticacao(
                credenciais
            );

        let sessao =
            autenticacao.login(
                'admin',
                'Admin@123'
            );

        expect(
            sessao.isValida()
        ).toBe(true);

        let servicoOrganizacao =
            new ServicoOrganizacao(
                repositorio,
                new ValidadorCNPJ()
            );

        let organizacao =
            servicoOrganizacao.cadastrarOrganizacao({
                razaoSocial:
                    'Empresa Teste LTDA',

                nomeFantasia:
                    'Empresa Teste',

                cnpj:
                    '11.222.333/0001-81'
            });

        expect(
            organizacao.id
        ).toBeDefined();

        let servicoLote =
            new ServicoLote(
                repositorio
            );

        let lote =
            servicoLote.criarLote({
                organizacaoId:
                    organizacao.id,

                dataEntrada:
                    new Date(),

                notaFiscal:
                    'NF-001',

                transportadora:
                    'Transportadora Teste'
            });

        expect(
            lote.statusProcessamento
        ).toBe(
            StatusLote.RECEBIDO
        );

        let servicoEquipamento =
            new ServicoEquipamento(
                repositorio
            );

        let equipamento =
            servicoEquipamento.criar({
                tipo:
                    TipoEquipamento.NOTEBOOK,

                estadoFisico:
                    EstadoFisico.USADO_LEVE,

                peso:
                    2.5
            });

        expect(
            equipamento.id
        ).toBeDefined();

        servicoLote.adicionarEquipamentoLote(
            lote.id,
            equipamento
        );

        servicoLote.processarTriagem(
            lote.id
        );

        let loteTriado =
            servicoLote.buscar(
                lote.id
            );

        expect(
            loteTriado.statusProcessamento
        ).toBe(
            StatusLote.TRIAGEM_CONCLUIDA
        );

        // Correção: o objeto carregado pelo repositório é um objeto simples.
        // A movimentação deve ser registrada na instância original do equipamento.

        equipamento.registrarMovimentacao(
            'Setor de Desmonte',
            'admin',
            'Equipamento encaminhado para desmonte'
        );

        repositorio.salvarEntidade(
            'equipamentos',
            equipamento
        );

        let rastreamento =
            servicoEquipamento.rastrearEquipamento(
                equipamento.id
            );

        expect(
            rastreamento.equipamento.id
        ).toBe(
            equipamento.id
        );

        expect(
            rastreamento.movimentacoes.length
        ).toBe(1);

        autenticacao.logout(
            sessao.token
        );

        expect(
            autenticacao.validarToken(
                sessao.token
            )
        ).toBe(false);

        fs.rmSync(
            diretorio,
            {
                recursive: true,
                force: true
            }
        );
    });
});