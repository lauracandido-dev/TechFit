import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

// Se a conexão automática falhar, escreva aqui o IP do computador, por exemplo '192.168.0.10'.
// Deixe '' para o app tentar descobrir sozinho.
const IP_MANUAL = '';


function descobrirUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web') return 'http://localhost:3000';

  if (IP_MANUAL) return `http://${IP_MANUAL}:3000`;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && /^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== '127.0.0.1') {
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const BASE_URL = descobrirUrl();
console.log('BASE_URL:', BASE_URL);

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  // Se o servidor não responder em 8 segundos, desiste e mostra o erro
  // (antes o app ficava esperando para sempre)
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      ...options,
      signal: controle.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error(
      `Não foi possível conectar ao servidor (tentou ${BASE_URL}). ` +
        'Verifique se a API está rodando e se o celular está na mesma rede.'
    );
  } finally {
    clearTimeout(limite);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data as T;
}

// Alert.alert não aparece no navegador, então no web usamos window.alert
export function avisar(titulo: string, mensagem: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    onOk?.();
  } else {
    Alert.alert(titulo, mensagem, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
}