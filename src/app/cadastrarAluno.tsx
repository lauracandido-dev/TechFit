import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, avisar } from '../services/api';
import { getSessao, limparSessao } from '../services/sessao';

export default function CadastrarAlunoScreen() {
  const router = useRouter();
  const token = getSessao()?.token;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSalvarAluno = async () => {
    if (!nome.trim() || !email.trim() || !senha || !objetivo.trim()) {
      avisar('Campos Obrigatórios', 'Por favor, preencha todos os campos do aluno.');
      return;
    }

    setSalvando(true);
    try {
      const resposta = await api<{ mensagem: string }>(
        '/alunos/cadastrar',
        {
          method: 'POST',
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            senha,
            objetivo: objetivo.trim(),
          }),
        },
        token
      );

      // Volta para o painel anterior
      avisar('Sucesso!', resposta.mensagem, () => router.back());
    } catch (e: any) {
      if (/token/i.test(e.message)) {
        avisar('Sessão expirada', 'Entre novamente para continuar.', () => {
          limparSessao();
          router.replace('/');
        });
      } else {
        avisar('Erro', e.message);
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()}>
          <Text style={styles.btnVoltarText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar Novo Aluno</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Nome Completo do Aluno</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Lucas Mendes"
          placeholderTextColor="#A0AEC0"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>E-mail de Acesso do Aluno</Text>
        <TextInput
          style={styles.input}
          placeholder="lucas@email.com"
          placeholderTextColor="#A0AEC0"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha Inicial do Aluno</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: techfit123"
          placeholderTextColor="#A0AEC0"
          autoCapitalize="none"
          value={senha}
          onChangeText={setSenha}
        />
        <Text style={styles.hintText}>
          Informe esta senha ao aluno para o primeiro acesso. Se ele já tiver conta, o nome e a senha são
          ignorados e ele apenas é vinculado a você.
        </Text>

        <Text style={styles.label}>Objetivo Inicial</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Hipertrofia, Emagrecimento, Condicionamento..."
          placeholderTextColor="#A0AEC0"
          value={objetivo}
          onChangeText={setObjetivo}
        />

        <TouchableOpacity
          style={[styles.buttonPrimary, salvando && { opacity: 0.6 }]}
          onPress={handleSalvarAluno}
          disabled={salvando}
        >
          <Text style={styles.buttonPrimaryText}>
            {salvando ? 'Cadastrando...' : 'Cadastrar Aluno'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 30,
  },
  header: {
    backgroundColor: '#1F2937',
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnVoltar: {
    marginRight: 15,
  },
  btnVoltarText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 16,
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});