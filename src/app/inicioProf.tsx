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

export default function InicioProfScreen() {
  const router = useRouter();

  // controla as abas debaixo
  const [abaAtiva, setAbaAtiva] = useState('alunos');

  // dados do perfil do professor logado (simulação)
  const [profNome, setProfNome] = useState('Carlos Eduardo');
  const [profEmail, setProfEmail] = useState('carlos.prof@techfit.com');
  const [profCref, setProfCref] = useState('012345-G/SP');

  const handleSalvarPerfil = () => {
    Alert.alert('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
  };

  // lista de alunos
  const listaAlunos = [
    { id: '1', nome: 'João Silva', objetivo: 'Hipertrofia', treino: 'supino' },
    { id: '2', nome: 'Maria Souza', objetivo: 'Emagrecimento', treino: 'supino' },
  ];

  const [alunoSelecionado, setAlunoSelecionado] = useState('João Silva');
  const [objetivoTreino, setObjetivoTreino] = useState('');

  const exerciciosDisponiveis = [
    { id: '1', nome: 'Supino Reto (Aparelho/Barra)' },
    { id: '2', nome: 'Puxada Alta na Polia' },
    { id: '3', nome: 'Agachamento Livre / Smith' },
    { id: '4', nome: 'Rosca Direta com Halteres' },
    { id: '5', nome: 'Tríceps na Polia com Corda' },
    { id: '6', nome: 'Outro (Personalizado)' },
  ];

  const [exercicioEscolhido, setExercicioEscolhido] = useState('Supino Reto (Aparelho/Barra)');
  const [nomeOutroExercicio, setNomeOutroExercicio] = useState('');

  const [series, setSeries] = useState('3');
  const [repeticoes, setRepeticoes] = useState('12');
  const [descanso, setDescanso] = useState('60s');

  const handleEditarTreinoAluno = (nomeAluno: string) => {
    setAlunoSelecionado(nomeAluno);
    setAbaAtiva('treinos');
  };

  const handleSalvarTreino = () => {
    if (!objetivoTreino) {
      Alert.alert('Erro', 'Por favor, informe o objetivo do treino.');
      return;
    }

    const exercicioFinal = exercicioEscolhido === 'Outro (Personalizado)' ? nomeOutroExercicio : exercicioEscolhido;

    if (exercicioEscolhido === 'Outro (Personalizado)' && !nomeOutroExercicio) {
      Alert.alert('Erro', 'Por favor, digite o nome do exercício personalizado.');
      return;
    }

    Alert.alert(
      'Sucesso!',
      `Treino de ${alunoSelecionado} atualizado!\nExercício: ${exercicioFinal} (${series}x${repeticoes}, Descanso: ${descanso})`
    );

    setObjetivoTreino('');
    setNomeOutroExercicio('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* botao perfil prof */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Painel do Professor</Text>
            <Text style={styles.headerSubtitle}>Gerenciamento de Alunos e Treinos</Text>
          </View>

        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {abaAtiva === 'alunos' ? (
          // aba 1
          <View>
            <Text style={styles.sectionTitle}>Alunos Acompanhados</Text>

            {listaAlunos.map((aluno) => (
              <View key={aluno.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{aluno.nome}</Text>
                  <Text style={styles.cardText}>Objetivo: {aluno.objetivo}</Text>
                  <Text style={styles.cardText}>Treino Atual: {aluno.treino}</Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditarTreinoAluno(aluno.nome)}
                >
                  <Text style={styles.editButtonText}>Editar Treino</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.buttonAction}
              onPress={() => router.push('/cadastrarAluno' as any)}
            >
              <Text style={styles.buttonActionText}>+ Cadastrar Novo Aluno</Text>
            </TouchableOpacity>          </View>
        ) : abaAtiva === 'treinos' ? (
          // aba 2
          <View>
            <Text style={styles.sectionTitle}>Montar/Editar Treino</Text>

            <Text style={styles.label}>Selecione o Aluno:</Text>
            <View style={styles.alunoSelectorContainer}>
              {listaAlunos.map((aluno) => (
                <TouchableOpacity
                  key={aluno.id}
                  style={[
                    styles.alunoChip,
                    alunoSelecionado === aluno.nome && styles.alunoChipSelected
                  ]}
                  onPress={() => setAlunoSelecionado(aluno.nome)}
                >
                  <Text style={[
                    styles.alunoChipText,
                    alunoSelecionado === aluno.nome && styles.alunoChipTextSelected
                  ]}>
                    {aluno.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Objetivo do Treino</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Hipertrofia de Membros Superiores"
              placeholderTextColor="#A0AEC0"
              value={objetivoTreino}
              onChangeText={setObjetivoTreino}
            />

            <Text style={styles.label}>Selecione o Exercício:</Text>
            <View style={styles.pickerContainer}>
              {exerciciosDisponiveis.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.exercicioOption,
                    exercicioEscolhido === item.nome && styles.exercicioSelected,
                  ]}
                  onPress={() => setExercicioEscolhido(item.nome)}
                >
                  <Text
                    style={[
                      styles.exercicioText,
                      exercicioEscolhido === item.nome && styles.exercicioTextSelected,
                    ]}
                  >
                    {item.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {exercicioEscolhido === 'Outro (Personalizado)' && (
              <>
                <Text style={styles.label}>Nome do Exercício Personalizado:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Elevação Lateral com Halteres"
                  placeholderTextColor="#A0AEC0"
                  value={nomeOutroExercicio}
                  onChangeText={setNomeOutroExercicio}
                />
              </>
            )}

            <View style={styles.rowContainer}>
              <View style={styles.column}>
                <Text style={styles.label}>Séries</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  keyboardType="numeric"
                  value={series}
                  onChangeText={setSeries}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Repetições</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12"
                  value={repeticoes}
                  onChangeText={setRepeticoes}
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Descanso</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60s"
                  value={descanso}
                  onChangeText={setDescanso}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSalvarTreino}>
              <Text style={styles.buttonPrimaryText}>Salvar Treino de {alunoSelecionado}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // aba 3
          <View>
            <Text style={styles.sectionTitle}>Meu Perfil Profissional</Text>

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={profNome}
              onChangeText={setProfNome}
            />

            <Text style={styles.label}>E-mail de Acesso</Text>
            <TextInput
              style={styles.input}
              value={profEmail}
              onChangeText={setProfEmail}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Registro CREF (Comprovação)</Text>
            <TextInput
              style={styles.input}
              value={profCref}
              onChangeText={setProfCref}
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSalvarPerfil}>
              <Text style={styles.buttonPrimaryText}>Salvar Alterações do Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonAction, { marginTop: 15, backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
              onPress={() => setAbaAtiva('alunos')}
            >
              <Text style={[styles.buttonActionText, { color: '#B91C1C' }]}>Voltar ao Painel</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* abas debaixo */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'alunos' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('alunos')}
        >
          <Text style={[styles.tabText, abaAtiva === 'alunos' && styles.tabTextActive]}>
            Meus Alunos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'treinos' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('treinos')}
        >
          <Text style={[styles.tabText, abaAtiva === 'treinos' && styles.tabTextActive]}>
            Montar/Editar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'perfil' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('perfil')}
        >
          <Text style={[styles.tabText, abaAtiva === 'perfil' && styles.tabTextActive]}>
            Meu Perfil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sair */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => router.back()}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#D97706',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FEF3C7',
    marginTop: 2,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardInfo: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D97706',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#B45309',
    fontWeight: 'bold',
    fontSize: 13,
  },
  buttonAction: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonActionText: {
    color: '#B45309',
    fontWeight: 'bold',
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  alunoSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  alunoChip: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
  },
  alunoChipSelected: {
    backgroundColor: '#D97706',
  },
  alunoChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  alunoChipTextSelected: {
    color: '#FFFFFF',
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
  pickerContainer: {
    marginVertical: 4,
  },
  exercicioOption: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 6,
  },
  exercicioSelected: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  exercicioText: {
    fontSize: 14,
    color: '#374151',
  },
  exercicioTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonPrimary: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 45,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabButtonActive: {
    backgroundColor: '#FEF3C7',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#B45309',
    fontWeight: 'bold',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  logoutText: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});