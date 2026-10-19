// src/app/inicioNutri.tsx
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

export default function InicioNutriScreen() {
  const router = useRouter();

  // controla as abas debaixo
  const [abaAtiva, setAbaAtiva] = useState('alunos');

  // dados (simulação)
  const [nutriNome, setNutriNome] = useState('Ana Beatriz');
  const [nutriEmail, setNutriEmail] = useState('ana.nutri@techfit.com');
  const [nutriCrn, setNutriCrn] = useState('CRN-3 12345');

  const handleSalvarPerfil = () => {
    Alert.alert('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
  };

  // lista de alunos
  const listaAlunos = [
    { id: '1', nome: 'João Silva', objetivo: 'Hipertrofia', dieta: 'Dieta Hipercalórica' },
    { id: '2', nome: 'Maria Souza', objetivo: 'Emagrecimento', dieta: 'Dieta Low Carb' },
  ];

  const [alunoSelecionado, setAlunoSelecionado] = useState('João Silva');
  
  // estado p montar as dietas por itens
  const [tituloRefeicao, setTituloRefeicao] = useState('');
  const [itemAlimento, setItemAlimento] = useState('');
  const [listaItens, setListaItens] = useState<string[]>([]);
  const [observacoesDieta, setObservacoesDieta] = useState('');

  // adicionar alimento
  const handleAdicionarItem = () => {
    if (!itemAlimento.trim()) {
      Alert.alert('Atenção', 'Digite o alimento antes de adicionar.');
      return;
    }
    setListaItens([...listaItens, itemAlimento]);
    setItemAlimento('');
  };

  // remover um item da lista 
  const handleRemoverItem = (indexParaRemover: number) => {
    const novaLista = listaItens.filter((_, index) => index !== indexParaRemover);
    setListaItens(novaLista);
  };

  const handleEditarDietaAluno = (nomeAluno: string) => {
    setAlunoSelecionado(nomeAluno);
    setAbaAtiva('dietas');
  };

  const handleSalvarDieta = () => {
    if (!tituloRefeicao || listaItens.length === 0) {
      Alert.alert('Erro', 'Informe o título da refeição e adicione pelo menos um item na dieta.');
      return;
    }

    Alert.alert(
      'Sucesso!', 
      `Dieta (${tituloRefeicao}) de ${alunoSelecionado} salva com ${listaItens.length} itens!`
    );
    
    setTituloRefeicao('');
    setListaItens([]);
    setObservacoesDieta('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Painel da Nutricionista</Text>
            <Text style={styles.headerSubtitle}>Gerenciamento de Alunos e Dietas</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {abaAtiva === 'alunos' ? (
          // aba 1
          <View>
            <Text style={styles.sectionTitle}>Alunos em Acompanhamento Nutricional</Text>
            
            {listaAlunos.map((aluno) => (
              <View key={aluno.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{aluno.nome}</Text>
                  <Text style={styles.cardText}>Objetivo: {aluno.objetivo}</Text>
                  <Text style={styles.cardText}>Dieta Atual: {aluno.dieta}</Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditarDietaAluno(aluno.nome)}
                >
                  <Text style={styles.editButtonText}>Editar Dieta</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.buttonAction} 
              onPress={() => router.push('/cadastrarAluno'as any)}
            >
              <Text style={styles.buttonActionText}>+ Cadastrar Novo Aluno</Text>
            </TouchableOpacity>
          </View>
        ) : abaAtiva === 'dietas' ? (
          // aba 2
          <View>
            <Text style={styles.sectionTitle}>Montar/Editar Dieta</Text>

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

            <Text style={styles.label}>Título da Refeição (Ex: Café da Manhã)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Café da Manhã"
              placeholderTextColor="#A0AEC0"
              value={tituloRefeicao}
              onChangeText={setTituloRefeicao}
            />

            {/* adicionar alimento */}
            <Text style={styles.label}>Adicionar Alimento / Item:</Text>
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.inputFino}
                placeholder="Ex: 2 fatias de pão integral"
                placeholderTextColor="#A0AEC0"
                value={itemAlimento}
                onChangeText={setItemAlimento}
              />
              <TouchableOpacity style={styles.btnAddItem} onPress={handleAdicionarItem}>
                <Text style={styles.btnAddItemText}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>

            {/* lista de itens */}
            {listaItens.length > 0 && (
              <View style={styles.listaItensContainer}>
                <Text style={styles.listaItensTitulo}>Itens da Refeição:</Text>
                {listaItens.map((item, index) => (
                  <View key={index} style={styles.itemRowCard}>
                    <Text style={styles.itemRowText}>{item}</Text>
                    <TouchableOpacity onPress={() => handleRemoverItem(index)}>
                      <Text style={styles.itemRemoveText}>❌</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>Orientações Nutricionais / Observações</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Ex: Beber água, substituir se necessário..."
              placeholderTextColor="#A0AEC0"
              multiline
              value={observacoesDieta}
              onChangeText={setObservacoesDieta}
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSalvarDieta}>
              <Text style={styles.buttonPrimaryText}>Salvar Dieta de {alunoSelecionado}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // aba 3
          <View>
            <Text style={styles.sectionTitle}>Meu Perfil Nutricional</Text>

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={nutriNome}
              onChangeText={setNutriNome}
            />

            <Text style={styles.label}>E-mail de Acesso</Text>
            <TextInput
              style={styles.input}
              value={nutriEmail}
              onChangeText={setNutriEmail}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Número do CRN (Comprovação)</Text>
            <TextInput
              style={styles.input}
              value={nutriCrn}
              onChangeText={setNutriCrn}
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
          style={[styles.tabButton, abaAtiva === 'dietas' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('dietas')}
        >
          <Text style={[styles.tabText, abaAtiva === 'dietas' && styles.tabTextActive]}>
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
    backgroundColor: '#059669',
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
    color: '#D1FAE5',
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
    color: '#059669',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#047857',
    fontWeight: 'bold',
    fontSize: 13,
  },
  buttonAction: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonActionText: {
    color: '#047857',
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
    backgroundColor: '#059669',
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
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputFino: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    marginRight: 8,
  },
  btnAddItem: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddItemText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  listaItensContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  listaItensTitulo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 6,
  },
  itemRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  itemRowText: {
    fontSize: 13,
    color: '#1F2937',
  },
  itemRemoveText: {
    fontSize: 12,
  },
  buttonPrimary: {
    backgroundColor: '#059669',
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
    backgroundColor: '#D1FAE5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#047857',
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