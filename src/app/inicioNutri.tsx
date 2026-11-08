// src/app/inicioNutri.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, avisar } from '../services/api';
import { getSessao, limparSessao, salvarSessao } from '../services/sessao';

// ---------- Tipos do que a API devolve ----------
interface AlunoApi {
  id_aluno: number;
  nome: string;
  email: string;
  objetivo: string | null;
  dieta_atual: string | null;
}
interface PerfilApi {
  nome: string;
  email: string;
  crn: string;
}
interface Refeicao {
  titulo: string;
  itens: string[];
}

export default function InicioNutriScreen() {
  const router = useRouter();
  const sessao = getSessao();
  const token = sessao?.token;

  // controla as abas debaixo
  const [abaAtiva, setAbaAtiva] = useState('alunos');
  const [carregando, setCarregando] = useState(true);

  // dados vindos do banco
  const [alunos, setAlunos] = useState<AlunoApi[]>([]);

  // dados do perfil da nutricionista logada
  const [nutriNome, setNutriNome] = useState('');
  const [nutriEmail, setNutriEmail] = useState('');
  const [nutriCrn, setNutriCrn] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // montagem da dieta
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<number | null>(null);
  const [objetivoDieta, setObjetivoDieta] = useState('');
  const [observacoesDieta, setObservacoesDieta] = useState('');

  // refeição em montagem (título + itens)
  const [tituloRefeicao, setTituloRefeicao] = useState('');
  const [itemAlimento, setItemAlimento] = useState('');
  const [listaItens, setListaItens] = useState<string[]>([]);

  // refeições já adicionadas à dieta
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [salvandoDieta, setSalvandoDieta] = useState(false);

  const alunoSelecionado = alunos.find((a) => a.id_aluno === alunoSelecionadoId) ?? null;

  // ---------- Sair e tratamento de erros ----------
  const sair = () => {
    limparSessao();
    router.replace('/');
  };

  const tratarErro = (e: any) => {
    if (/token/i.test(e.message)) {
      avisar('Sessão expirada', 'Entre novamente para continuar.', sair);
      return;
    }
    avisar('Erro', e.message);
  };

  // ---------- Carregamento dos dados ----------
  const carregarAlunos = async () => {
    const lista = await api<AlunoApi[]>('/nutri/alunos', {}, token);
    setAlunos(lista);
    return lista;
  };

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const [listaAlunos, perfil] = await Promise.all([
          carregarAlunos(),
          api<PerfilApi>('/nutri/perfil', {}, token),
        ]);
        setAlunoSelecionadoId(listaAlunos[0]?.id_aluno ?? null);
        setNutriNome(perfil.nome);
        setNutriEmail(perfil.email);
        setNutriCrn(perfil.crn);
      } catch (e: any) {
        tratarErro(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // Atualiza a lista de alunos ao voltar de outra tela (ex.: Cadastrar Novo Aluno)
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      carregarAlunos()
        .then((lista) => setAlunoSelecionadoId((atual) => atual ?? lista[0]?.id_aluno ?? null))
        .catch(() => {});
    }, [token])
  );

  // ---------- Ações ----------
  const handleSalvarPerfil = async () => {
    if (!nutriNome.trim() || !nutriEmail.trim() || !nutriCrn.trim()) {
      avisar('Erro', 'Preencha nome, e-mail e CRN.');
      return;
    }

    setSalvandoPerfil(true);
    try {
      const atualizado = await api<PerfilApi>(
        '/nutri/perfil',
        {
          method: 'PATCH',
          body: JSON.stringify({ nome: nutriNome, email: nutriEmail, crn: nutriCrn }),
        },
        token
      );

      if (sessao) {
        salvarSessao({
          token: sessao.token,
          usuario: { ...sessao.usuario, nome: atualizado.nome, email: atualizado.email },
        });
      }
      setNutriNome(atualizado.nome);
      setNutriEmail(atualizado.email);
      setNutriCrn(atualizado.crn);
      avisar('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // Trocar de aluno começa uma dieta nova (evita enviar a dieta para o aluno errado)
  const selecionarAluno = (id: number) => {
    if (id !== alunoSelecionadoId) {
      setRefeicoes([]);
      setObjetivoDieta('');
      setObservacoesDieta('');
      setTituloRefeicao('');
      setItemAlimento('');
      setListaItens([]);
    }
    setAlunoSelecionadoId(id);
  };

  const handleEditarDietaAluno = (id: number) => {
    selecionarAluno(id);
    setAbaAtiva('dietas');
  };

  // adicionar alimento à refeição em montagem
  const handleAdicionarItem = () => {
    if (!itemAlimento.trim()) {
      avisar('Atenção', 'Digite o alimento antes de adicionar.');
      return;
    }
    setListaItens([...listaItens, itemAlimento.trim()]);
    setItemAlimento('');
  };

  // remover um item da refeição em montagem
  const handleRemoverItem = (indexParaRemover: number) => {
    setListaItens(listaItens.filter((_, index) => index !== indexParaRemover));
  };

  // O ":" separa o título dos itens quando o aluno vê a dieta, então não pode ficar no título
  const limparTitulo = (texto: string) => texto.trim().replace(/:/g, '');

  // adicionar a refeição pronta à dieta
  const handleAdicionarRefeicao = () => {
    const titulo = limparTitulo(tituloRefeicao);
    if (!titulo || listaItens.length === 0) {
      avisar('Atenção', 'Informe o título da refeição e adicione pelo menos um item.');
      return;
    }
    setRefeicoes([...refeicoes, { titulo, itens: listaItens }]);
    setTituloRefeicao('');
    setItemAlimento('');
    setListaItens([]);
  };

  const handleRemoverRefeicao = (indexParaRemover: number) => {
    setRefeicoes(refeicoes.filter((_, index) => index !== indexParaRemover));
  };

  const handleSalvarDieta = async () => {
    if (!alunoSelecionado) {
      avisar('Erro', 'Selecione um aluno.');
      return;
    }
    if (!objetivoDieta.trim()) {
      avisar('Erro', 'Por favor, informe o objetivo da dieta.');
      return;
    }

    // Se há uma refeição em andamento, ela entra na dieta junto
    const refeicoesFinais = [...refeicoes];
    const tituloAtual = limparTitulo(tituloRefeicao);
    if (tituloAtual || listaItens.length > 0) {
      if (!tituloAtual || listaItens.length === 0) {
        avisar('Erro', 'Complete a refeição em andamento (título e ao menos um item) ou limpe os campos.');
        return;
      }
      refeicoesFinais.push({ titulo: tituloAtual, itens: listaItens });
    }

    if (refeicoesFinais.length === 0) {
      avisar('Erro', 'Informe o título da refeição e adicione pelo menos um item na dieta.');
      return;
    }

    // Uma refeição por linha: "Café da Manhã: 2 ovos + 1 pão"
    const alimentacao = refeicoesFinais
      .map((r) => `${r.titulo}: ${r.itens.join(' + ')}`)
      .join('\n');

    setSalvandoDieta(true);
    try {
      await api(
        '/dietas',
        {
          method: 'POST',
          body: JSON.stringify({
            id_aluno: alunoSelecionado.id_aluno,
            objetivo: objetivoDieta.trim(),
            observacoes: observacoesDieta.trim(),
            alimentacao,
          }),
        },
        token
      );

      avisar('Sucesso!', `Dieta de ${alunoSelecionado.nome} salva com ${refeicoesFinais.length} refeição(ões)!`);
      setRefeicoes([]);
      setObjetivoDieta('');
      setObservacoesDieta('');
      setTituloRefeicao('');
      setItemAlimento('');
      setListaItens([]);
      await carregarAlunos();
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvandoDieta(false);
    }
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
        
        {carregando ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />

        ) : abaAtiva === 'alunos' ? (
          // aba 1
          <View>
            <Text style={styles.sectionTitle}>Alunos em Acompanhamento Nutricional</Text>

            {alunos.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem alunos vinculados. Use o botão abaixo para cadastrar o primeiro.
                </Text>
              </View>
            )}
            
            {alunos.map((aluno) => (
              <View key={aluno.id_aluno} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{aluno.nome}</Text>
                  <Text style={styles.cardText}>Objetivo: {aluno.objetivo ?? 'Não definido'}</Text>
                  <Text style={styles.cardText}>Dieta Atual: {aluno.dieta_atual ?? 'Nenhuma dieta ainda'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditarDietaAluno(aluno.id_aluno)}
                >
                  <Text style={styles.editButtonText}>
                    {aluno.dieta_atual ? 'Editar Dieta' : 'Montar Dieta'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.buttonAction} 
              onPress={() => router.push('/cadastrarAluno' as any)}
            >
              <Text style={styles.buttonActionText}>+ Cadastrar Novo Aluno</Text>
            </TouchableOpacity>
          </View>

        ) : abaAtiva === 'dietas' ? (
          // aba 2
          <View>
            <Text style={styles.sectionTitle}>Montar/Editar Dieta</Text>

            {alunos.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem alunos vinculados para montar uma dieta.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Selecione o Aluno:</Text>
                <View style={styles.alunoSelectorContainer}>
                  {alunos.map((aluno) => (
                    <TouchableOpacity
                      key={aluno.id_aluno}
                      style={[
                        styles.alunoChip,
                        alunoSelecionadoId === aluno.id_aluno && styles.alunoChipSelected
                      ]}
                      onPress={() => selecionarAluno(aluno.id_aluno)}
                    >
                      <Text style={[
                        styles.alunoChipText,
                        alunoSelecionadoId === aluno.id_aluno && styles.alunoChipTextSelected
                      ]}>
                        {aluno.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Objetivo da Dieta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Ganho de massa magra"
                  placeholderTextColor="#A0AEC0"
                  value={objetivoDieta}
                  onChangeText={setObjetivoDieta}
                />

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

                <TouchableOpacity style={styles.buttonAction} onPress={handleAdicionarRefeicao}>
                  <Text style={styles.buttonActionText}>+ Adicionar refeição à dieta</Text>
                </TouchableOpacity>

                {/* refeições já adicionadas */}
                <Text style={[styles.label, { marginTop: 20 }]}>
                  Refeições da dieta ({refeicoes.length})
                </Text>

                {refeicoes.length === 0 && (
                  <Text style={styles.cardText}>Nenhuma refeição adicionada ainda.</Text>
                )}

                {refeicoes.map((refeicao, index) => (
                  <View key={index} style={styles.refeicaoCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.refeicaoTitulo}>{refeicao.titulo}</Text>
                      <Text style={styles.refeicaoItens}>{refeicao.itens.join(' + ')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoverRefeicao(index)}>
                      <Text style={styles.itemRemoveText}>❌</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={styles.label}>Orientações Nutricionais / Observações</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Ex: Beber água, substituir se necessário..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                  value={observacoesDieta}
                  onChangeText={setObservacoesDieta}
                />

                <TouchableOpacity
                  style={[styles.buttonPrimary, salvandoDieta && { opacity: 0.6 }]}
                  onPress={handleSalvarDieta}
                  disabled={salvandoDieta}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {salvandoDieta
                      ? 'Salvando...'
                      : `Salvar Dieta de ${alunoSelecionado?.nome ?? ''}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
              autoCapitalize="none"
            />

            <Text style={styles.label}>Número do CRN (Comprovação)</Text>
            <TextInput
              style={styles.input}
              value={nutriCrn}
              onChangeText={setNutriCrn}
            />

            <TouchableOpacity
              style={[styles.buttonPrimary, salvandoPerfil && { opacity: 0.6 }]}
              onPress={handleSalvarPerfil}
              disabled={salvandoPerfil}
            >
              <Text style={styles.buttonPrimaryText}>
                {salvandoPerfil ? 'Salvando...' : 'Salvar Alterações do Perfil'}
              </Text>
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
      <TouchableOpacity style={styles.logoutButton} onPress={sair}>
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
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  alunoChip: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
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
  refeicaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginTop: 8,
  },
  refeicaoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  refeicaoItens: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
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