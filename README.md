# Greencode

Aplicação de linha de comando (CLI) em Node.js e TypeScript para apoiar a gestão da logística reversa de resíduos eletrônicos.

## Requisitos para executar

- Node.js 20 ou superior
- npm

## Instalação e execução

Na pasta do projeto (terminal cmd), execute:

npm install
npm run build
npm start

Para executar durante o desenvolvimento:

npm run dev

## Organização do código

```text
greencode/
├── src/
│   ├── index.ts              # ponto de entrada
│   ├── interface/            # interação com o usuário
│   ├── modelos/              # entidades e enumerações
│   ├── repositorios/         # leitura e gravação dos dados
│   ├── servicos/             # regras e operações do sistema
│   ├── seguranca/            # autenticação e criptografia
│   ├── utilitarios/          # journal e funções auxiliares
│   └── validadores/          # validações de entrada
├── data/                     # arquivos de dados em tempo de execução
├── package.json
└── tsconfig.json
```

## Observação sobre dados

Os dados de execução são armazenados na pasta `data/`. Não apague essa pasta se quiser manter os cadastros entre execuções.

## Comandos

A interface apresenta os comandos disponíveis para teste. Entre os comandos implementados estão autenticação, cadastro e consulta de organizações, criação e triagem de lotes, rastreamento de equipamentos e relatórios. Os argumentos aceitos podem ser conferidos no arquivo `src/interface/InterfaceCLI.ts`.