# GREENCODE — Documentação Técnica

## 1. Objetivo

O GREENCODE é uma aplicação de linha de comando para o núcleo operacional de uma plataforma de logística reversa de resíduos eletrônicos.

O sistema controla:

* organizações e contratos;
* lotes;
* equipamentos;
* movimentações e rastreabilidade;
* autenticação e autorização;
* relatórios;
* auditoria;
* persistência dos dados.

A solução foi estruturada visando sua evolução para uma futura interface web e para a migração da persistência em arquivos para um banco de dados relacional.

---

## 2. Arquitetura

A solução foi organizada em camadas, separando as responsabilidades do sistema:

```text
src/
├── modelos/
├── validadores/
├── seguranca/
├── repositorios/
├── servicos/
├── utilitarios/
└── interface/
```

As principais responsabilidades são:

* **Modelos:** entidades e regras estruturais do domínio.
* **Validadores:** validações específicas das regras de negócio.
* **Segurança:** autenticação, sessões, hash de senhas e criptografia.
* **Repositórios:** persistência e recuperação dos dados.
* **Serviços:** execução das regras e operações do sistema.
* **Interface:** interação com o usuário por meio da CLI.

A separação reduz o acoplamento e permite substituir a implementação de persistência ou a interface sem alterar diretamente as regras de negócio.

Na evolução para uma aplicação web, a mesma camada de serviços poderá ser utilizada por uma API. Da mesma forma, o repositório baseado em arquivos poderá ser substituído por uma implementação utilizando banco de dados relacional.

---

## 3. Orientação a Objetos

A implementação utiliza conceitos de orientação a objetos:

* **Herança:** `ValidadorCNPJ` e `ValidadorDataEntrada` especializam `Validador`.
* **Abstração:** `Validador` define um contrato comum para validações.
* **Interface:** `Autenticavel` define operações relacionadas à autenticação e renovação.
* **Polimorfismo:** diferentes validadores podem ser utilizados por meio da abstração `Validador`.
* **Composição/agregação:** `Lote` contém equipamentos; `Equipamento` mantém seu histórico de movimentações; `Organizacao` possui contratos.

Essa organização permite adicionar novas regras e funcionalidades sem concentrar responsabilidades em uma única classe.

---

## 4. Segurança

A arquitetura de segurança atende aos requisitos definidos para a atividade.

### 4.1 Criptografia

A persistência utiliza **AES-256-CBC** para proteger os arquivos de dados.

A chave mestra de 256 bits é gerada durante o primeiro provisionamento da aplicação e utilizada para criptografar e descriptografar os dados persistidos.

A escolha do AES-256 atende ao requisito de criptografia da atividade e utiliza recursos criptográficos nativos do Node.js.

Como evolução para um ambiente de produção, recomenda-se a utilização de um modo autenticado, como AES-256-GCM, para proporcionar também proteção de integridade criptográfica.

### 4.2 Senhas

As senhas não são armazenadas em texto puro.

O sistema utiliza **SHA-256 combinado com salt individual** para gerar o valor armazenado.

O salt reduz a possibilidade de que senhas iguais produzam o mesmo hash e dificulta ataques baseados em tabelas pré-computadas.

A utilização de SHA-256 é mantida por ser um requisito explícito da atividade.

**Observação técnica:** SHA-256 simples não é recomendado para armazenamento de senhas em produção. Em uma futura versão, seria preferível utilizar um algoritmo específico para senhas, como Argon2id, scrypt ou bcrypt, com parâmetros de custo apropriados.

### 4.3 Sessões

Após a autenticação, o sistema cria uma sessão associada ao usuário e a um token aleatório.

A sessão possui validade de **60 minutos**. Após esse período, a sessão deixa de ser válida e operações protegidas devem ser recusadas.

A política de expiração limita o período de utilização de uma sessão abandonada ou comprometida.

### 4.4 Autorização

A autenticação identifica o usuário e a autorização determina quais operações podem ser executadas de acordo com seu papel.

---

## 5. Validações

O sistema implementa validações para impedir a persistência de dados inválidos e estados incompatíveis com as regras de negócio.

Entre as principais validações estão:

* CNPJ deve possuir 14 dígitos e dígitos verificadores válidos;
* CNPJ não pode ser duplicado;
* data de entrada não pode ser futura;
* data de entrada não pode ser anterior a 90 dias;
* equipamento não deve seguir para desmonte antes da triagem;
* redução de duas ou mais categorias do estado físico exige justificativa;
* operações que dependem de uma organização, lote ou equipamento existente devem rejeitar identificadores inexistentes.

Essas validações são concentradas nos validadores e serviços para que possam ser reutilizadas por futuras interfaces.

---

## 6. Persistência e Journaling

Os dados são atualmente persistidos em arquivos protegidos por criptografia.

Para reduzir o risco de corrupção durante uma gravação, o sistema utiliza um arquivo temporário e posteriormente realiza a substituição do arquivo principal por meio de `rename`.

As alterações podem ser registradas por meio de um **journal**, permitindo identificar:

* identificador da operação;
* timestamp;
* operação realizada;
* entidade afetada;
* estado anterior;
* estado posterior;
* usuário responsável.

O arquivo de journal é rotacionado ao ultrapassar aproximadamente **10 MB**.

A política de retenção mínima de **180 dias** deve ser aplicada pelo processo de manutenção em produção. A implementação atual fornece a estrutura de journal e o mecanismo de rotação.

O journaling fornece uma base para auditoria e para futuras evoluções relacionadas à rastreabilidade das operações.

---

## 7. Papéis e controle de acesso

O sistema possui quatro papéis principais:

| Papel                   | Responsabilidade                               |
| ----------------------- | ---------------------------------------------- |
| **ADMINISTRADOR**       | Configuração e gestão global do sistema        |
| **OPERADOR_CADASTRO**   | Organizações e contratos                       |
| **GESTOR_ALMOXARIFADO** | Lotes, triagem e equipamentos                  |
| **AUDITOR**             | Consultas e relatórios, sem alteração de dados |

O controle de acesso é realizado nos serviços da aplicação, evitando que a autorização dependa exclusivamente da interface utilizada.

---

## 8. Cenários de falha

A aplicação trata situações de erro e operações inválidas, incluindo:

* usuário ou senha incorretos;
* sessão inexistente ou expirada;
* usuário sem permissão para determinada operação;
* CNPJ inválido ou duplicado;
* data de entrada inválida;
* organização inexistente;
* lote ou equipamento inexistente;
* tentativa de alterar o estado de um equipamento fora da sequência permitida;
* tentativa de encaminhar equipamento para desmonte antes da triagem;
* arquivos de dados inválidos ou corrompidos.

Nesses casos, a operação é recusada e o sistema apresenta uma mensagem de erro, evitando a persistência de dados inválidos.

---

## 9. Testes

Os testes devem verificar tanto regras isoladas quanto a jornada completa de utilização do sistema.

Entre as validações estão:

* CNPJ;
* data de entrada;
* cálculo do peso de lote;
* autenticação;
* autorização por papel;
* transições de estado;
* rastreabilidade;
* tratamento de operações inválidas.

A jornada principal de teste é:

```text
Provisionamento
      ↓
Login
      ↓
Organização
      ↓
Lote
      ↓
Equipamento
      ↓
Triagem
      ↓
Múltiplas movimentações
      ↓
Consulta de rastreabilidade
      ↓
Relatório
```

Os testes automatizados devem permitir executar essa jornada sem depender exclusivamente de interação manual pela CLI.

---

## 10. Evolução do sistema

A arquitetura foi organizada para permitir a evolução do projeto nas próximas atividades.

### Interface web

Uma futura interface web poderá utilizar uma API como camada de entrada, mantendo as regras de negócio nos serviços existentes:

```text
Interface Web
      ↓
API
      ↓
Serviços
      ↓
Repositórios
```

### Banco de dados relacional

O `RepositorioArquivo` funciona como uma abstração da persistência atual.

Futuramente, poderá ser criada uma implementação baseada em banco relacional, como:

```text
Repositório em arquivos
        ↓
Repositório SQL
```

Essa abordagem permite migrar a persistência sem transferir regras de negócio para a camada de banco ou para a interface.

### Segurança

Para uma versão de produção, são previstas as seguintes evoluções:

* Argon2id, scrypt ou bcrypt para senhas;
* AES-256-GCM ou mecanismo equivalente para criptografia autenticada;
* armazenamento da chave mestra em um mecanismo externo de gerenciamento de segredos;
* utilização de HTTPS e cookies seguros em uma futura aplicação web.

---

## 11. Execução

O projeto utiliza **Node.js e TypeScript**.

Após a configuração do projeto e instalação das dependências:

```bash
npm install
```

Compilação:

```bash
npm run build
```

Execução:

```bash
npm start
```

Os testes automatizados podem ser executados com:

```bash
npm test
```

A utilização de APIs nativas do Node.js e de caminhos multiplataforma permite a execução em **Windows e Linux/Ubuntu**, desde que seja utilizada uma versão compatível do Node.js.
