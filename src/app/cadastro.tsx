import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, avisar } from '../services/api';

// Converte o texto do botão para o valor que a API espera
const TIPO_API: Record<string, 'aluno' | 'professor' | 'nutricionista'> = {
  Aluno: 'aluno',
  Professor: 'professor',
  Nutricionista: 'nutricionista',
};

export default function CadastroScreen() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('Aluno'); 
  const [comprovacao, setComprovacao] = useState(''); // aprovação se for nutri ou prof
  const [carregando, setCarregando] = useState(false);

  const handleCadastro = async () => {
    if (!nome.trim() || !email.trim() || !senha) {
      avisar('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if ((perfil === 'Nutricionista' || perfil === 'Professor') && !comprovacao.trim()) {
      const documento = perfil === 'Nutricionista' ? 'CRN' : 'CREF/Registro';
      avisar('Atenção', `Por favor, informe o seu ${documento} para comprovação.`);
      return;
    }

    setCarregando(true);
    try {
      await api('/cadastro', {
        method: 'POST',
        body: JSON.stringify({
          tipo: TIPO_API[perfil],
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
          registro: perfil === 'Aluno' ? undefined : comprovacao.trim(),
        }),
      });

      avisar('Sucesso!', `Cadastro de ${perfil} realizado com sucesso!`, () => router.back()); // volta p login
    } catch (e: any) {
      avisar('Erro', e.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>TechFit</Text>
            <Text style={styles.subtitleText}>Crie a sua conta</Text>
          </View>

          {/* forms */}
          <View style={styles.formContainer}>
            
            {/* nome */}
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome"
              placeholderTextColor="#A0AEC0"
              value={nome}
              onChangeText={setNome}
            />

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
              placeholder="Crie uma senha"
              placeholderTextColor="#A0AEC0"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />

            {/* selecionar se e alu, prof ou nutri */}
            <Text style={styles.label}>Você é:</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownOption, perfil === 'Aluno' && styles.optionSelected]}
                onPress={() => { setPerfil('Aluno'); setComprovacao(''); }}
              >
                <Text style={[styles.optionText, perfil === 'Aluno' && styles.optionTextSelected]}>
                  Aluno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownOption, perfil === 'Professor' && styles.optionSelected]}
                onPress={() => { setPerfil('Professor'); setComprovacao(''); }}
              >
                <Text style={[styles.optionText, perfil === 'Professor' && styles.optionTextSelected]}>
                  Professor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownOption, perfil === 'Nutricionista' && styles.optionSelected]}
                onPress={() => { setPerfil('Nutricionista'); setComprovacao(''); }}
              >
                <Text style={[styles.optionText, perfil === 'Nutricionista' && styles.optionTextSelected]}>
                  Nutricionista
                </Text>
              </TouchableOpacity>
            </View>

            {/* campo pra aprovação de prof e nutri */}
            {perfil === 'Nutricionista' && (
              <>
                <Text style={styles.label}>Número do CRN (Comprovação)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: CRN-3 12345"
                  placeholderTextColor="#A0AEC0"
                  value={comprovacao}
                  onChangeText={setComprovacao}
                />
              </>
            )}

            {perfil === 'Professor' && (
              <>
                <Text style={styles.label}>Registro CREF  (Comprovação)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 012345-G/SP"
                  placeholderTextColor="#A0AEC0"
                  value={comprovacao}
                  onChangeText={setComprovacao}
                />
              </>
            )}

            {/* botao p cadastrar */}
            <TouchableOpacity
              style={[styles.buttonPrimary, carregando && styles.buttonDisabled]}
              onPress={handleCadastro}
              disabled={carregando}
            >
              <Text style={styles.buttonTextPrimary}>
                {carregando ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </Text>
            </TouchableOpacity>

            {/* volta p login */}
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonTextSecondary}>Voltar para o Login</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
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
  },
  scrollContainer: {
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    fontSize: 11,
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
    marginTop: 20,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: '#a6c0f1',
    borderWidth: 2,
    borderColor: '#343cd3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonTextSecondary: {
    color: '#174185',
    fontSize: 16,
    fontWeight: 'bold',
  },
});