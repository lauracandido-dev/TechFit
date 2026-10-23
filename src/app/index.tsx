import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('Aluno');//começa no aluno, padrão

  const handleLogin = () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Por favor, preencha o e-mail e a senha.');
      return;
    }
    // logica p banco de dados+
    Alert.alert('Sucesso', `Login de ${perfil} efetuado com sucesso!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>TechFit</Text>
          <Text style={styles.subtitleText}>Gestão para Academias</Text>
        </View>

        {/* forms */}
        <View style={styles.formContainer}>
          {/* email */}
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite seu e-mail"
            placeholderTextColor="#A0AEC0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* senha */}
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          {/* selecionar se é alu, prof ou nutri */}
          <Text style={styles.label}>Você é:</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdownOption, perfil === 'Aluno' && styles.optionSelected]}
              onPress={() => setPerfil('Aluno')}
            >
              <Text style={[styles.optionText, perfil === 'Aluno' && styles.optionTextSelected]}>
                Aluno
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownOption, perfil === 'Professor' && styles.optionSelected]}
              onPress={() => setPerfil('Professor')}
            >
              <Text style={[styles.optionText, perfil === 'Professor' && styles.optionTextSelected]}>
                Professor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownOption, perfil === 'Nutricionista' && styles.optionSelected]}
              onPress={() => setPerfil('Nutricionista')}
            >
              <Text style={[styles.optionText, perfil === 'Nutricionista' && styles.optionTextSelected]}>
                Nutricionista
              </Text>
            </TouchableOpacity>
          </View>

          {/* botao entrar */}
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
            <Text style={styles.buttonTextPrimary}>Entrar</Text>
          </TouchableOpacity>

          {/* botao cadastro */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Ainda não tem conta?</Text>

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => router.push('/cadastro')}
            >
              <Text style={styles.buttonTextSecondary}>Criar nova conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6699ff',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#000066',
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 15,
    color: '#6c569f',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#cad1ea',
    borderWidth: 1,
    borderColor: '#325388',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  // Estilo da caixinha/bloco de opções abaixo da senha
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dropdownOption: {
    flex: 1,
    backgroundColor: '#cad1ea',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#325388',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#174185',
    borderColor: '#000066',
  },
  optionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#174185',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  buttonPrimary: {
    backgroundColor: '#174185',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#000066',
    marginBottom: 6,
    fontWeight: '600',
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: '#a6c0f1',
    borderWidth: 2,
    borderColor: '#343cd3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: '#174185',
    fontSize: 16,
    fontWeight: 'bold',
  },
});