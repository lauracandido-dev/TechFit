import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Oculta o título/barra superior padrão da navegação
        contentStyle: { backgroundColor: '#FFFFFF' }, // Fundo branco padrão
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Login' }} />
      <Stack.Screen name="cadastro" options={{ title: 'Cadastro' }} />
      <Stack.Screen name="explore" options={{ title: 'Explorar' }} />
    </Stack>
  );
}