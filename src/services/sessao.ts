import { Platform } from 'react-native';

export type Papel = 'aluno' | 'professor' | 'nutricionista';

export interface Sessao {
  token: string;
  usuario: { id: number; nome: string; email: string; papel: Papel };
}

const CHAVE = 'techfit_sessao';
let memoria: Sessao | null = null;

// No navegador (web) a sessão também fica no localStorage, então sobrevive
// ao recarregar a página. No celular fica só em memória (some ao fechar o app).
const storage = (): any => (Platform.OS === 'web' ? (globalThis as any).localStorage : null);

export function salvarSessao(s: Sessao) {
  memoria = s;
  try {
    storage()?.setItem(CHAVE, JSON.stringify(s));
  } catch {}
}

export function getSessao(): Sessao | null {
  if (memoria) return memoria;
  try {
    const texto = storage()?.getItem(CHAVE);
    if (texto) memoria = JSON.parse(texto);
  } catch {}
  return memoria;
}

export function limparSessao() {
  memoria = null;
  try {
    storage()?.removeItem(CHAVE);
  } catch {}
}