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
interface DietaApi {
  id_dieta: number;
  objetivo: string;
  observacoes: string;
  alimentacao: string;
}
interface Refeicao {
  titulo: string;
  itens: string[];
}

// No banco a dieta é um texto só, uma refeição por linha: "Café da Manhã: 2 ovos + 1 pão".
// Esta função faz o caminho de volta, para a dieta poder ser editada.
function separarRefeicoes(texto: string): Refeicao[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const i = linha.indexOf(':');
      const titulo = i > 0 && i < 40 ? linha.slice(0, i).trim() : 'Refeição';
      const resto = i > 0 && i < 40 ? linha.slice(i + 1) : linha;
      return {
        titulo,
        itens: resto.split(' + ').map((item) => item.trim()).filter(Boolean),
      };
    });
}

export default function InicioNutriScreen() {
  const router = useRouter();
  const sessao = getSessao();
  const token = sessao?.token;

  // Controla as abas inferiores da tela
  const [abaAtiva, setAbaAtiva] = useState('alunos');
  const [carregando, setCarregando] = useState(true);

  // Dados dos alunos
  const [alunos, setAlunos] = useState<AlunoApi[]>([]);

  // Dados do perfil da nutricionista logada
  const [nutriNome, setNutriNome] = useState('');
  const [nutriEmail, setNutriEmail] = useState('');
  const [nutriCrn, setNutriCrn] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // montagem / edição da dieta
  // Dados do aluno selecionado e objetivo da dieta
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<number | null>(null);
  const [dietaId, setDietaId] = useState<number | null>(null); // preenchido quando já existe dieta (edição)
  const [carregandoDieta, setCarregandoDieta] = useState(false);
  const [objetivoDieta, setObjetivoDieta] = useState('');
  const [observacoesDieta, setObservacoesDieta] = useState('');

  // Campos para montar uma refeição
  const [tituloRefeicao, setTituloRefeicao] = useState('');
  const [itemAlimento, setItemAlimento] = useState('');
  const [listaItens, setListaItens] = useState<string[]>([]);

  // Lista de refeições já adicionadas à dieta
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [salvandoDieta, setSalvandoDieta] = useState(false);

  // Identifica qual aluno está selecionado no momento
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

  // Seleciona o aluno e carrega a dieta atual dele no formulário (ou deixa em branco)
  const abrirDietaDoAluno = async (id: number) => {
    setAlunoSelecionadoId(id);
    setCarregandoDieta(true);
    try {
      const { dieta } = await api<{ dieta: DietaApi | null }>(
        `/nutri/alunos/${id}/dieta`,
        {},
        token
      );
      setDietaId(dieta?.id_dieta ?? null);
      setObjetivoDieta(dieta?.objetivo ?? '');
      setObservacoesDieta(dieta?.observacoes ?? '');
      setRefeicoes(dieta ? separarRefeicoes(dieta.alimentacao) : []);
      setTituloRefeicao('');
      setItemAlimento('');
      setListaItens([]);
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setCarregandoDieta(false);
    }
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
        setNutriNome(perfil.nome);
        setNutriEmail(perfil.email);
        setNutriCrn(perfil.crn);
        if (listaAlunos[0]) await abrirDietaDoAluno(listaAlunos[0].id_aluno);
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

  // Abre a tela de montagem da dieta para o aluno escolhido
  const handleEditarDietaAluno = async (id: number) => {
    setAbaAtiva('dietas');
    await abrirDietaDoAluno(id);
  };

  // Adiciona um alimento à refeição que está sendo montada
  const handleAdicionarItem = () => {
    if (!itemAlimento.trim()) {
      avisar('Atenção', 'Digite o alimento antes de adicionar.');
      return;
    }
    setListaItens([...listaItens, itemAlimento.trim()]);
    setItemAlimento('');
  };

  // Remove um alimento da lista da refeição
  const handleRemoverItem = (indexParaRemover: number) => {
    setListaItens(listaItens.filter((_, index) => index !== indexParaRemover));
  };

  // O ":" separa o título dos itens quando o aluno vê a dieta, então não pode ficar no título
  const limparTitulo = (texto: string) => texto.trim().replace(/:/g, '');

  // Adiciona a refeição finalizada à lista da dieta
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

  // Devolve a refeição ao formulário para alterar o título ou os itens
  const handleEditarRefeicao = (index: number) => {
    if (tituloRefeicao.trim() || listaItens.length > 0) {
      avisar('Atenção', 'Termine ou limpe a refeição em andamento antes de editar outra.');
      return;
    }
    const refeicao = refeicoes[index];
    setTituloRefeicao(refeicao.titulo);
    setListaItens(refeicao.itens);
    setRefeicoes(refeicoes.filter((_, i) => i !== index));
  };

  // Remove uma refeição que já foi adicionada à dieta
  const handleRemoverRefeicao = (indexParaRemover: number) => {
    setRefeicoes(refeicoes.filter((_, index) => index !== indexParaRemover));
  };

  // Remove um alimento de uma refeição já adicionada (se ficar vazia, a refeição some)
  const handleRemoverItemDaRefeicao = (indexRefeicao: number, indexItem: number) => {
    setRefeicoes(
      refeicoes
        .map((refeicao, i) =>
          i === indexRefeicao
            ? { ...refeicao, itens: refeicao.itens.filter((_, j) => j !== indexItem) }
            : refeicao
        )
        .filter((refeicao) => refeicao.itens.length > 0)
    );
  };

  // Finaliza a montagem e salva a dieta do aluno selecionado
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

    const corpo = {
      objetivo: objetivoDieta.trim(),
      observacoes: observacoesDieta.trim(),
      alimentacao,
    };

    setSalvandoDieta(true);
    try {
      if (dietaId) {
        // já existe: atualiza a mesma dieta
        await api(`/dietas/${dietaId}`, { method: 'PUT', body: JSON.stringify(corpo) }, token);
        avisar('Sucesso!', `Dieta de ${alunoSelecionado.nome} atualizada!`);
      } else {
        // ainda não existe: cria
        await api(
          '/dietas',
          { method: 'POST', body: JSON.stringify({ ...corpo, id_aluno: alunoSelecionado.id_aluno }) },
          token
        );
        avisar('Sucesso!', `Dieta de ${alunoSelecionado.nome} criada com ${refeicoesFinais.length} refeição(ões)!`);
      }

      // Recarrega do banco para mostrar exatamente o que ficou salvo
      await Promise.all([abrirDietaDoAluno(alunoSelecionado.id_aluno), carregarAlunos()]);
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvandoDieta(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
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
          // Aba 1: lista de alunos acompanhados
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

            {/* Botão para cadastrar um novo aluno */}
            <TouchableOpacity
              style={styles.buttonAction}
              onPress={() => router.push('/cadastrarAluno' as any)}
            >
              <Text style={styles.buttonActionText}>+ Cadastrar Novo Aluno</Text>
            </TouchableOpacity>
          </View>

        ) : abaAtiva === 'dietas' ? (
          // Aba 2: formulário para montar ou editar dietas
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
                {/* Seleção do aluno que receberá a dieta */}
                <Text style={styles.label}>Selecione o Aluno:</Text>
                <View style={styles.alunoSelectorContainer}>
                  {alunos.map((aluno) => (
                    <TouchableOpacity
                      key={aluno.id_aluno}
                      style={[
                        styles.alunoChip,
                        alunoSelecionadoId === aluno.id_aluno && styles.alunoChipSelected
                      ]}
                      onPress={() => abrirDietaDoAluno(aluno.id_aluno)}
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

                {carregandoDieta ? (
                  <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 30 }} />
                ) : (
                  <>
                    <View style={styles.avisoEdicao}>
                      <Text style={styles.avisoEdicaoTexto}>
                        {dietaId
                          ? `✏️ Editando a dieta atual de ${alunoSelecionado?.nome ?? ''}. Altere, remova ou adicione refeições e alimentos e salve.`
                          : `🆕 Nova dieta para ${alunoSelecionado?.nome ?? ''}.`}
                      </Text>
                    </View>

                    {/* Campo para informar o objetivo da dieta */}
                    <Text style={styles.label}>Objetivo da Dieta</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Ganho de massa magra"
                      placeholderTextColor="#A0AEC0"
                      value={objetivoDieta}
                      onChangeText={setObjetivoDieta}
                    />

                    {/* Refeições já adicionadas */}
                    <Text style={[styles.label, { marginTop: 20 }]}>
                      Refeições da dieta ({refeicoes.length})
                    </Text>

                    {refeicoes.length === 0 && (
                      <Text style={styles.cardText}>Nenhuma refeição na dieta ainda.</Text>
                    )}

                    {refeicoes.map((refeicao, indexRefeicao) => (
                      <View key={indexRefeicao} style={styles.refeicaoCard}>
                        <View style={styles.refeicaoHeader}>
                          <Text style={styles.refeicaoTitulo}>{refeicao.titulo}</Text>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={() => handleEditarRefeicao(indexRefeicao)}>
                              <Text style={styles.acaoTexto}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleRemoverRefeicao(indexRefeicao)}>
                              <Text style={styles.acaoRemover}>Remover</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {refeicao.itens.map((item, indexItem) => (
                          <View key={indexItem} style={styles.refeicaoItemRow}>
                            <Text style={styles.refeicaoItemTexto}>{item}</Text>
                            <TouchableOpacity onPress={() => handleRemoverItemDaRefeicao(indexRefeicao, indexItem)}>
                              <Text style={styles.itemRemoveText}>❌</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ))}

                    {/* Título da refeição que está sendo montada */}
                    <Text style={[styles.label, { marginTop: 24 }]}>Título da Refeição (Ex: Café da Manhã)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Café da Manhã"
                      placeholderTextColor="#A0AEC0"
                      value={tituloRefeicao}
                      onChangeText={setTituloRefeicao}
                    />

                    {/* Adicionar alimento */}
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

                    {/* Itens da refeição em andamento */}
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

                    {/* Botão para adicionar a refeição completa à dieta */}
                    <TouchableOpacity style={styles.buttonAction} onPress={handleAdicionarRefeicao}>
                      <Text style={styles.buttonActionText}>+ Adicionar refeição à dieta</Text>
                    </TouchableOpacity>

                    {/* Campo para orientações e observações nutricionais */}
                    <Text style={styles.label}>Orientações Nutricionais / Observações</Text>
                    <TextInput
                      style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                      placeholder="Ex: Beber água, substituir se necessário..."
                      placeholderTextColor="#A0AEC0"
                      multiline
                      value={observacoesDieta}
                      onChangeText={setObservacoesDieta}
                    />

                    {/* Botão para finalizar a dieta */}
                    <TouchableOpacity
                      style={[styles.buttonPrimary, salvandoDieta && { opacity: 0.6 }]}
                      onPress={handleSalvarDieta}
                      disabled={salvandoDieta}
                    >
                      <Text style={styles.buttonPrimaryText}>
                        {salvandoDieta
                          ? 'Salvando...'
                          : dietaId
                            ? `Atualizar Dieta de ${alunoSelecionado?.nome ?? ''}`
                            : `Salvar Dieta de ${alunoSelecionado?.nome ?? ''}`}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

        ) : (
          // Aba 3: perfil da nutricionista
          <View>
            <Text style={styles.sectionTitle}>Meu Perfil Nutricional</Text>

            {/* Campos para visualizar e editar os dados pessoais */}
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

            {/* Botão para salvar as alterações do perfil */}
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

      {/* Menu inferior para navegar entre as telas */}
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

      {/* Botão para sair da conta */}
      <TouchableOpacity style={styles.logoutButton} onPress={sair}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// CSS
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
  avisoEdicao: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  avisoEdicaoTexto: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginTop: 8,
  },
  refeicaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  refeicaoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    flex: 1,
  },
  acaoTexto: {
    color: '#047857',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 12,
  },
  acaoRemover: {
    color: '#B91C1C',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 12,
  },
  refeicaoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refeicaoItemTexto: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    marginRight: 8,
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