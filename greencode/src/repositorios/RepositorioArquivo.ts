import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CriptografiaArquivo } from '../seguranca/CriptografiaArquivo';
import { Journal } from '../utilitarios/Journal';

export class RepositorioArquivo {
  constructor(public diretorioBase:string, public criptografia:CriptografiaArquivo, private chave:string, private journal?:Journal) {
    fs.mkdirSync(diretorioBase,{recursive:true});
  }
  private p(n:string){ return path.join(this.diretorioBase,n+'.enc'); }
  private gravarAtomico(file:string, text:string) {
    const tmp=file+'.'+crypto.randomUUID()+'.tmp';
    let fd:number|undefined;
    try {
      fd=fs.openSync(tmp,'wx',0o600); fs.writeFileSync(fd,text,'utf8'); fs.fsyncSync(fd); fs.closeSync(fd); fd=undefined;
      fs.renameSync(tmp,file);
    } catch(err) {
      if(fd!==undefined) try{fs.closeSync(fd)}catch{}
      try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}
      throw new Error('Não foi possível persistir os dados de forma atômica.');
    }
  }
  salvarEntidade(nomeArquivo:string, entidade:any) {
    if(!entidade || typeof entidade!=='object' || Array.isArray(entidade)) throw new Error('Entidade inválida.');
    const atual=this.listarEntidades(nomeArquivo);
    const id=entidade.id;
    const i=id ? atual.findIndex(x=>x.id===id) : -1;
    const antes=i>=0?atual[i]:null;
    if(i>=0) atual[i]=entidade; else atual.push(entidade);
    const tx=this.journal?.iniciar(i>=0?'ATUALIZAR':'CRIAR',nomeArquivo,antes,entidade);
    this.gravarAtomico(this.p(nomeArquivo),this.criptografia.cifrar(JSON.stringify(atual),this.chave));
    if(tx) this.journal?.concluir(tx,i>=0?'ATUALIZAR':'CRIAR',nomeArquivo);
  }
  carregarEntidade(nomeArquivo:string,id:string){ return this.listarEntidades(nomeArquivo).find(x=>x.id===id); }
  listarEntidades(nomeArquivo:string) {
    const file=this.p(nomeArquivo);
    if(!fs.existsSync(file)) return [];
    try {
      const parsed=JSON.parse(this.criptografia.decifrar(fs.readFileSync(file,'utf8'),this.chave));
      if(!Array.isArray(parsed)) throw new Error('Formato inválido');
      return parsed;
    } catch { throw new Error(`Falha ao carregar ${nomeArquivo}: arquivo corrompido, inválido ou chave incorreta.`); }
  }
  excluirEntidade(nomeArquivo:string,id:string) {
    const atual=this.listarEntidades(nomeArquivo), alvo=atual.find(x=>x.id===id);
    if(!alvo) throw new Error('Entidade não encontrada.');
    const depois=atual.filter(x=>x.id!==id);
    const tx=this.journal?.iniciar('EXCLUIR',nomeArquivo,alvo,null);
    this.gravarAtomico(this.p(nomeArquivo),this.criptografia.cifrar(JSON.stringify(depois),this.chave));
    if(tx) this.journal?.concluir(tx,'EXCLUIR',nomeArquivo);
  }
}
