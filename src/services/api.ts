import { Alert, Platform } from 'react-native';

// Web: localhost | Emulador Android: 10.0.2.2
// Celular físico: use o IP do seu PC, ex.: http://192.168.0.10:3000
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
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