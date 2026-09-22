import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CriptografiaArquivo } from '../seguranca/CriptografiaArquivo';

type JournalRecord = { id:string; timestamp:string; phase:'PREPARE'|'COMMIT'; operacao:string; entidade:string; dadosAntes:unknown; dadosDepois:unknown; usuarioResponsavel:string };

export class Journal {
  constructor(private dir:string, private criptografia?:CriptografiaArquivo, private chave?:string) {
    fs.mkdirSync(dir,{recursive:true});
    this.rotacionarAntigos();
  }
  private gravar(record:JournalRecord) {
    const file=path.join(this.dir,`journal-${record.timestamp.slice(0,10)}.log`);
    const line=JSON.stringify(record);
    const content=this.criptografia && this.chave ? this.criptografia.cifrar(line,this.chave) : line;
    const fd=fs.openSync(file,'a',0o600);
    try { fs.writeSync(fd,content+'\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if(fs.statSync(file).size>10*1024*1024) fs.renameSync(file,file.replace('.log',`-${Date.now()}.log`));
    this.rotacionarAntigos();
  }
  iniciar(operacao:string,entidade:string,antes:unknown,depois:unknown,usuario='sistema'):string {
    const id=crypto.randomUUID();
    this.gravar({id,timestamp:new Date().toISOString(),phase:'PREPARE',operacao,entidade,dadosAntes:antes,dadosDepois:depois,usuarioResponsavel:usuario});
    return id;
  }
  concluir(id:string,operacao:string,entidade:string,usuario='sistema') {
    this.gravar({id,timestamp:new Date().toISOString(),phase:'COMMIT',operacao,entidade,dadosAntes:null,dadosDepois:null,usuarioResponsavel:usuario});
  }
  registrar(operacao:string,entidade:string,antes:unknown,depois:unknown,usuario='sistema') {
    const id=this.iniciar(operacao,entidade,antes,depois,usuario);
    this.concluir(id,operacao,entidade,usuario);
  }
  private rotacionarAntigos() {
    const cutoff=Date.now()-180*24*60*60*1000;
    for(const name of fs.readdirSync(this.dir)) {
      if(!/^journal-\d{4}-\d{2}-\d{2}.*\.log$/.test(name)) continue;
      const match=name.match(/^journal-(\d{4}-\d{2}-\d{2})/);
      if(match && Date.parse(match[1]+'T00:00:00Z')<cutoff) {
        try { fs.unlinkSync(path.join(this.dir,name)); } catch { /* preserva arquivo se remoção falhar */ }
      }
    }
  }
}
