
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
  treino_atual: string | null;
}
interface ExercicioCat {
  id_exercicio: number;
  nome: string;
}
interface PerfilApi {
  nome: string;
  email: string;
  cref: string;
}
interface ItemTreino {
  id_exercicio: number;
  nome: string;
  series: number;
  repeticoes: number;
  descanso: string;
}
interface TreinoApi {
  id_treino: number;
  objetivo: string;
  observacoes: string;
  exercicios: ItemTreino[];
}

export default function InicioProfScreen() {
  const router = useRouter();
  const sessao = getSessao();
  const token = sessao?.token;

  // controla as abas debaixo
  const [abaAtiva, setAbaAtiva] = useState('alunos');
  const [carregando, setCarregando] = useState(true);

  // dados vindos do banco
  const [alunos, setAlunos] = useState<AlunoApi[]>([]);
  const [catalogo, setCatalogo] = useState<ExercicioCat[]>([]);

  // dados do perfil do professor logado
  const [profNome, setProfNome] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profCref, setProfCref] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // montagem / edição do treino
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<number | null>(null);
  const [treinoId, setTreinoId] = useState<number | null>(null); // preenchido quando já existe treino (edição)
  const [carregandoTreino, setCarregandoTreino] = useState(false);
  const [objetivoTreino, setObjetivoTreino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [exercicioId, setExercicioId] = useState<number>(0); // 0 = "Outro (Personalizado)"
  const [nomeOutroExercicio, setNomeOutroExercicio] = useState('');
  const [series, setSeries] = useState('3');
  const [repeticoes, setRepeticoes] = useState('12');
  const [descanso, setDescanso] = useState('60s');
  const [itensTreino, setItensTreino] = useState<ItemTreino[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [salvandoTreino, setSalvandoTreino] = useState(false);

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
    const lista = await api<AlunoApi[]>('/professor/alunos', {}, token);
    setAlunos(lista);
    return lista;
  };

  // Seleciona o aluno e carrega o treino atual dele no formulário (ou deixa em branco)
  const abrirTreinoDoAluno = async (id: number) => {
    setAlunoSelecionadoId(id);
    setCarregandoTreino(true);
    try {
      const { treino } = await api<{ treino: TreinoApi | null }>(
        `/professor/alunos/${id}/treino`,
        {},
        token
      );
      setTreinoId(treino?.id_treino ?? null);
      setObjetivoTreino(treino?.objetivo ?? '');
      setObservacoes(treino?.observacoes ?? '');
      setItensTreino(treino?.exercicios ?? []);
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setCarregandoTreino(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const [listaAlunos, exercicios, perfil] = await Promise.all([
          carregarAlunos(),
          api<ExercicioCat[]>('/exercicios', {}, token),
          api<PerfilApi>('/professor/perfil', {}, token),
        ]);
        setCatalogo(exercicios);
        setExercicioId(exercicios[0]?.id_exercicio ?? 0);
        setProfNome(perfil.nome);
        setProfEmail(perfil.email);
        setProfCref(perfil.cref);
        if (listaAlunos[0]) await abrirTreinoDoAluno(listaAlunos[0].id_aluno);
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
    if (!profNome.trim() || !profEmail.trim() || !profCref.trim()) {
      avisar('Erro', 'Preencha nome, e-mail e CREF.');
      return;
    }

    setSalvandoPerfil(true);
    try {
      const atualizado = await api<PerfilApi>(
        '/professor/perfil',
        {
          method: 'PATCH',
          body: JSON.stringify({ nome: profNome, email: profEmail, cref: profCref }),
        },
        token
      );

      if (sessao) {
        salvarSessao({
          token: sessao.token,
          usuario: { ...sessao.usuario, nome: atualizado.nome, email: atualizado.email },
        });
      }
      setProfNome(atualizado.nome);
      setProfEmail(atualizado.email);
      setProfCref(atualizado.cref);
      avisar('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleEditarTreinoAluno = async (id: number) => {
    setAbaAtiva('treinos');
    await abrirTreinoDoAluno(id);
  };

  // Adiciona o exercício preenchido à lista do treino
  const handleAdicionarExercicio = async () => {
    const s = parseInt(series, 10);
    const r = parseInt(repeticoes, 10);

    if (!s || s <= 0 || !r || r <= 0) {
      avisar('Erro', 'Informe séries e repetições com números maiores que zero.');
      return;
    }
    if (!descanso.trim()) {
      avisar('Erro', 'Informe o tempo de descanso.');
      return;
    }
    if (exercicioId === 0 && !nomeOutroExercicio.trim()) {
      avisar('Erro', 'Por favor, digite o nome do exercício personalizado.');
      return;
    }

    setAdicionando(true);
    try {
      let id = exercicioId;
      let nome = catalogo.find((e) => e.id_exercicio === exercicioId)?.nome ?? '';

      // Exercício personalizado: cria (ou reaproveita) no catálogo do banco
      if (exercicioId === 0) {
        const novo = await api<ExercicioCat>(
          '/exercicios',
          { method: 'POST', body: JSON.stringify({ nome: nomeOutroExercicio.trim() }) },
          token
        );
        id = novo.id_exercicio;
        nome = novo.nome;
        setCatalogo((prev) =>
          prev.some((e) => e.id_exercicio === id)
            ? prev
            : [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome))
        );
        setExercicioId(id);
        setNomeOutroExercicio('');
      }

      setItensTreino((prev) => [
        ...prev,
        { id_exercicio: id, nome, series: s, repeticoes: r, descanso: descanso.trim() },
      ]);
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setAdicionando(false);
    }
  };

  // Tira o exercício da lista e devolve os dados para o formulário, para alterar e adicionar de novo
  const handleEditarExercicio = (index: number) => {
    const item = itensTreino[index];
    setExercicioId(item.id_exercicio);
    setSeries(String(item.series));
    setRepeticoes(String(item.repeticoes));
    setDescanso(item.descanso);
    setItensTreino((prev) => prev.filter((_, i) => i !== index));
  };


  const handleRemoverExercicio = (index: number) => {
    setItensTreino((prev) => prev.filter((_, i) => i !== index));
  };

  // Finaliza a montagem e salva o treino do aluno selecionado
  const handleSalvarTreino = async () => {
    if (!alunoSelecionado) {
      avisar('Erro', 'Selecione um aluno.');
      return;
    }
    if (!objetivoTreino.trim()) {
      avisar('Erro', 'Por favor, informe o objetivo do treino.');
      return;
    }
    if (itensTreino.length === 0) {
      avisar('Erro', 'Adicione ao menos um exercício ao treino.');
      return;
    }

    const corpo = {
      objetivo: objetivoTreino.trim(),
      observacoes: observacoes.trim(),
      exercicios: itensTreino.map(({ id_exercicio, series, repeticoes, descanso }) => ({
        id_exercicio,
        series,
        repeticoes,
        descanso,
      })),
    };

    setSalvandoTreino(true);
    try {
      if (treinoId) {
        // já existe: atualiza o mesmo treino
        await api(`/treinos/${treinoId}`, { method: 'PUT', body: JSON.stringify(corpo) }, token);
        avisar('Sucesso!', `Treino de ${alunoSelecionado.nome} atualizado!`);
      } else {
        // ainda não existe: cria
        await api(
          '/treinos',
          { method: 'POST', body: JSON.stringify({ ...corpo, id_aluno: alunoSelecionado.id_aluno }) },
          token
        );
        avisar('Sucesso!', `Treino de ${alunoSelecionado.nome} criado com ${itensTreino.length} exercício(s)!`);
      }

      // Recarrega do banco para mostrar exatamente o que ficou salvo
      await Promise.all([abrirTreinoDoAluno(alunoSelecionado.id_aluno), carregarAlunos()]);
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvandoTreino(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho do painel do professor */}
      {/* botao perfil prof */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Painel do Professor</Text>
            <Text style={styles.headerSubtitle}>Gerenciamento de Alunos e Treinos</Text>
          </View>

        </View>
      </View>

      {/* Área principal que exibe o conteúdo de cada aba */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {carregando ? (
          // Indicador exibido enquanto a tela carrega
          <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 40 }} />

        ) : abaAtiva === 'alunos' ? (
          // aba 1
          <View>
            <Text style={styles.sectionTitle}>Alunos Acompanhados</Text>

            {/* Mensagem exibida quando ainda não existem alunos */}
            {alunos.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem alunos vinculados. Use o botão abaixo para cadastrar o primeiro.
                </Text>
              </View>
            )}

            {/* Lista os alunos cadastrados em cartões */}
            {alunos.map((aluno) => (
              <View key={aluno.id_aluno} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{aluno.nome}</Text>
                  <Text style={styles.cardText}>Objetivo: {aluno.objetivo ?? 'Não definido'}</Text>
                  <Text style={styles.cardText}>Treino Atual: {aluno.treino_atual ?? 'Nenhum treino ainda'}</Text>
                </View>

                {/* Abre a aba de montagem do treino para o aluno escolhido */}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditarTreinoAluno(aluno.id_aluno)}
                >
                  <Text style={styles.editButtonText}>
                    {aluno.treino_atual ? 'Editar Treino' : 'Montar Treino'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Botão para abrir a tela de cadastro de um novo aluno */}
            <TouchableOpacity
              style={styles.buttonAction}
              onPress={() => router.push('/cadastrarAluno' as any)}
            >
              <Text style={styles.buttonActionText}>+ Cadastrar Novo Aluno</Text>
            </TouchableOpacity>
          </View>

        ) : abaAtiva === 'treinos' ? (
          // aba 2
          <View>
            <Text style={styles.sectionTitle}>Montar/Editar Treino</Text>

            {alunos.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem alunos vinculados para montar um treino.
                </Text>
              </View>
            ) : (
              <>
                {/* Opções para escolher qual aluno receberá o treino */}
                <Text style={styles.label}>Selecione o Aluno:</Text>
                <View style={styles.alunoSelectorContainer}>
                  {alunos.map((aluno) => (
                    <TouchableOpacity
                      key={aluno.id_aluno}
                      style={[
                        styles.alunoChip,
                        alunoSelecionadoId === aluno.id_aluno && styles.alunoChipSelected
                      ]}
                      onPress={() => abrirTreinoDoAluno(aluno.id_aluno)}
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


                {carregandoTreino ? (
                  <ActivityIndicator size="small" color="#D97706" style={{ marginVertical: 30 }} />
                ) : (
                  <>
                    <View style={styles.avisoEdicao}>
                      <Text style={styles.avisoEdicaoTexto}>
                        {treinoId
                          ? `✏️ Editando o treino atual de ${alunoSelecionado?.nome ?? ''}. Altere, remova ou adicione exercícios e salve.`
                          : `🆕 Novo treino para ${alunoSelecionado?.nome ?? ''}.`}

                {/* Campo para definir o objetivo do treino */}
                <Text style={styles.label}>Objetivo do Treino</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Hipertrofia de Membros Superiores"
                  placeholderTextColor="#A0AEC0"
                  value={objetivoTreino}
                  onChangeText={setObjetivoTreino}
                />

                {/* Campo opcional para observações */}
                <Text style={styles.label}>Observações (opcional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Ex: Treinar 3x por semana, com carga moderada"
                  placeholderTextColor="#A0AEC0"
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                />

                {/* Lista de opções de exercícios disponíveis */}
                <Text style={styles.label}>Selecione o Exercício:</Text>
                <View style={styles.pickerContainer}>
                  {catalogo.map((item) => (
                    <TouchableOpacity
                      key={item.id_exercicio}
                      style={[
                        styles.exercicioOption,
                        exercicioId === item.id_exercicio && styles.exercicioSelected,
                      ]}
                      onPress={() => setExercicioId(item.id_exercicio)}
                    >
                      <Text
                        style={[
                          styles.exercicioText,
                          exercicioId === item.id_exercicio && styles.exercicioTextSelected,
                        ]}
                      >
                        {item.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Opção para adicionar um exercício que não está na lista */}
                  <TouchableOpacity
                    style={[styles.exercicioOption, exercicioId === 0 && styles.exercicioSelected]}
                    onPress={() => setExercicioId(0)}
                  >
                    <Text style={[styles.exercicioText, exercicioId === 0 && styles.exercicioTextSelected]}>
                      Outro (Personalizado)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Campo que aparece quando o exercício personalizado é selecionado */}
                {exercicioId === 0 && (
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

                {/* Campos para informar séries, repetições e descanso */}
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
                      keyboardType="numeric"
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

                {/* Adiciona o exercício preenchido à lista */}
                <TouchableOpacity
                  style={[styles.buttonAction, adicionando && { opacity: 0.6 }]}
                  onPress={handleAdicionarExercicio}
                  disabled={adicionando}
                >
                  <Text style={styles.buttonActionText}>
                    {adicionando ? 'Adicionando...' : '+ Adicionar ao treino'}
                  </Text>
                </TouchableOpacity>

                {/* Exibe os exercícios que já foram adicionados */}
                <Text style={[styles.label, { marginTop: 20 }]}>
                  Exercícios do treino ({itensTreino.length})
                </Text>

                {itensTreino.length === 0 && (
                  <Text style={styles.cardText}>Nenhum exercício adicionado ainda.</Text>
                )}

                {/* Mostra os detalhes de cada exercício e permite removê-lo */}
                {itensTreino.map((item, index) => (
                  <View key={index} style={styles.itemTreino}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTreinoNome}>{item.nome}</Text>
                      <Text style={styles.itemTreinoDetalhe}>
                        {item.series}x{item.repeticoes} · Descanso: {item.descanso}

                      </Text>
                    </View>


                    <Text style={styles.label}>Objetivo do Treino</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Hipertrofia de Membros Superiores"
                      placeholderTextColor="#A0AEC0"
                      value={objetivoTreino}
                      onChangeText={setObjetivoTreino}
                    />

                    <Text style={styles.label}>Observações (opcional)</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                      placeholder="Ex: Treinar 3x por semana, com carga moderada"
                      placeholderTextColor="#A0AEC0"
                      value={observacoes}
                      onChangeText={setObservacoes}
                      multiline
                    />

                    <Text style={[styles.label, { marginTop: 20 }]}>
                      Exercícios do treino ({itensTreino.length})
                    </Text>

                    {itensTreino.length === 0 && (
                      <Text style={styles.cardText}>Nenhum exercício no treino ainda.</Text>
                    )}

                    {itensTreino.map((item, index) => (
                      <View key={`${item.id_exercicio}-${index}`} style={styles.itemTreino}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTreinoNome}>{item.nome}</Text>
                          <Text style={styles.itemTreinoDetalhe}>
                            {item.series}x{item.repeticoes} · Descanso: {item.descanso}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleEditarExercicio(index)}>
                          <Text style={styles.editarTexto}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoverExercicio(index)}>
                          <Text style={styles.removerTexto}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <Text style={[styles.label, { marginTop: 24 }]}>Adicionar exercício:</Text>
                    <View style={styles.pickerContainer}>
                      {catalogo.map((item) => (
                        <TouchableOpacity
                          key={item.id_exercicio}
                          style={[
                            styles.exercicioOption,
                            exercicioId === item.id_exercicio && styles.exercicioSelected,
                          ]}
                          onPress={() => setExercicioId(item.id_exercicio)}
                        >
                          <Text
                            style={[
                              styles.exercicioText,
                              exercicioId === item.id_exercicio && styles.exercicioTextSelected,
                            ]}
                          >
                            {item.nome}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        style={[styles.exercicioOption, exercicioId === 0 && styles.exercicioSelected]}
                        onPress={() => setExercicioId(0)}
                      >
                        <Text style={[styles.exercicioText, exercicioId === 0 && styles.exercicioTextSelected]}>
                          Outro (Personalizado)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {exercicioId === 0 && (
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
                          keyboardType="numeric"
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

                    <TouchableOpacity
                      style={[styles.buttonAction, adicionando && { opacity: 0.6 }]}
                      onPress={handleAdicionarExercicio}
                      disabled={adicionando}
                    >
                      <Text style={styles.buttonActionText}>
                        {adicionando ? 'Adicionando...' : '+ Adicionar ao treino'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.buttonPrimary, salvandoTreino && { opacity: 0.6 }]}
                      onPress={handleSalvarTreino}
                      disabled={salvandoTreino}
                    >
                      <Text style={styles.buttonPrimaryText}>
                        {salvandoTreino
                          ? 'Salvando...'
                          : treinoId
                            ? `Atualizar Treino de ${alunoSelecionado?.nome ?? ''}`
                            : `Salvar Treino de ${alunoSelecionado?.nome ?? ''}`}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Botão para salvar o treino completo */}
                <TouchableOpacity
                  style={[styles.buttonPrimary, salvandoTreino && { opacity: 0.6 }]}
                  onPress={handleSalvarTreino}
                  disabled={salvandoTreino}
                >
                  <Text style={styles.buttonPrimaryText}>
                    {salvandoTreino
                      ? 'Salvando...'
                      : `Salvar Treino de ${alunoSelecionado?.nome ?? ''}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        ) : (
          // aba 3
          <View>
            <Text style={styles.sectionTitle}>Meu Perfil Profissional</Text>

            {/* Campos com as informações do perfil do professor */}
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
              autoCapitalize="none"
            />

            <Text style={styles.label}>Registro CREF (Comprovação)</Text>
            <TextInput
              style={styles.input}
              value={profCref}
              onChangeText={setProfCref}
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

            {/* Botão para retornar à aba de alunos */}
            <TouchableOpacity
              style={[styles.buttonAction, { marginTop: 15, backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
              onPress={() => setAbaAtiva('alunos')}
            >
              <Text style={[styles.buttonActionText, { color: '#B91C1C' }]}>Voltar ao Painel</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Abas inferiores para navegar entre as áreas do painel */}
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
  avisoEdicao: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  avisoEdicaoTexto: {
    fontSize: 13,
    color: '#92400E',
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
  itemTreino: {
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
  itemTreinoNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemTreinoDetalhe: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  editarTexto: {
    color: '#B45309',
    fontWeight: 'bold',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  removerTexto: {
    color: '#B91C1C',
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 8,
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