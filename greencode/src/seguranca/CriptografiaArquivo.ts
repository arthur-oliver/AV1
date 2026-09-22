import crypto from 'crypto';

export class CriptografiaArquivo {
  gerarChave() {
    return crypto.randomBytes(32).toString('hex');
  }

  cifrar(dados: string, chave: string) {
    const iv = crypto.randomBytes(16);

    const c = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(chave, 'hex').subarray(0, 32),
      iv
    );

    return (
      iv.toString('hex') +
      ':' +
      Buffer.concat([
        c.update(dados, 'utf8'),
        c.final()
      ]).toString('hex')
    );
  }
// arthur
  decifrar(dadosCifrados: string, chave: string) {
    const [ivHex, dataHex] = dadosCifrados.split(':');

    const d = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(chave, 'hex').subarray(0, 32),
      Buffer.from(ivHex, 'hex')
    );

    return Buffer.concat([
      d.update(Buffer.from(dataHex, 'hex')),
      d.final()
    ]).toString('utf8');
  }
}