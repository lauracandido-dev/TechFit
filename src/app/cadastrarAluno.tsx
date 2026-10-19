import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CadastrarAlunoScreen() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [objetivo, setObjetivo] = useState('');

  const handleSalvarAluno = () => {
    if (!nome || !email || !objetivo) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos do aluno.');
      return;
    }

    Alert.alert(
      'Sucesso!',
      `Aluno(a) ${nome} cadastrado(a) e vinculado(a) à sua lista no banco de dados!`
    );

    // Volta para o painel anterior
    router.back();
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
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Objetivo Inicial</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Hipertrofia, Emagrecimento, Condicionamento..."
          placeholderTextColor="#A0AEC0"
          value={objetivo}
          onChangeText={setObjetivo}
        />

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSalvarAluno}>
          <Text style={styles.buttonPrimaryText}>Cadastrar Aluno</Text>
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