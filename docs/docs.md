# Relatório/Documentação AV1

## 1. Objetivo
O greencode é uma aplicação de linha de comando para o núcleo operacional de uma plataforma de logística reversa de resíduos eletrônicos. O sistema deve controlar organizações, contratos, lotes, equipamentos, movimentações, autenticação, relatórios e auditoria.

## 2. Arquitetura
A solução foi organizada em camadas: domínio (`models`), validação (`validators`), segurança (`security`), persistência (`repositories`), serviços de aplicação (`services`) e interface (`cli`). A separação reduz acoplamento e facilita futura migração para interface web e banco relacional.

## 3. Orientação a objetos
- **Herança:** `ValidadorCNPJ` e `ValidadorDataEntrada` especializam `Validador`.
- **Abstração:** `Validador` define o contrato comum de validação.
- **Interface:** `Autenticavel` define operações de autenticação/renovação.
- **Polimorfismo:** diferentes validadores podem ser utilizados por meio da abstração `Validador`.
- **Composição/agregação:** `Lote` contém equipamentos; `Equipamento` mantém seu histórico de movimentações; `Organizacao` possui contrato.

## 4. Segurança
O requisito da atividade especifica AES-256 para persistência e SHA-256 para hash de senhas, além de sessão expirada após 30 minutos. A chave mestra é gerada no primeiro provisionamento. Os arquivos são gravados por meio de arquivo temporário e `rename`, evitando uma escrita parcialmente concluída.

**Observação técnica:** SHA-256 simples não é uma escolha recomendada para armazenamento de senhas em produção. Mantido aqui porque é requisito explícito da atividade; em produção seria preferível Argon2id/scrypt/bcrypt com parâmetros de custo.

## 5. Validações
- CNPJ com 14 dígitos e dígitos verificadores.
- CNPJ único.
- Data de entrada não pode ser futura nem anterior a 90 dias.
- Equipamento não deve seguir para desmonte antes da triagem.
- Redução de duas ou mais categorias do estado físico exige justificativa.

## 6. Journaling
Cada alteração pode ser registrada contendo identificador, timestamp, operação, entidade, estado anterior, estado posterior e usuário responsável. O arquivo é rotacionado ao ultrapassar 10 MB. A política de retenção mínima de 180 dias deve ser aplicada pelo processo de manutenção em produção; esta entrega fornece a estrutura de journal e rotação.

## 7. Papéis
Administrador: configuração/gestão global. Operador de cadastro: organizações e contratos. Gestor de almoxarifado: lotes, triagem e equipamentos. Auditor: consultas e relatórios sem alteração.

## 8. Testes
Os testes cobrem validação de CNPJ, data de entrada e cálculo de peso de lote. A jornada completa recomendada é: provisionamento → login → organização → lote → equipamento → triagem → movimentações/rastreamento → relatório.
