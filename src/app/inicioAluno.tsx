import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video'; // player de vídeo
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration, //(vibração do celular)
  View,
} from 'react-native';
import { WebView } from 'react-native-webview'; //usado para o player do YouTube
import { api, avisar } from '../services/api';
import { getSessao, limparSessao, salvarSessao } from '../services/sessao';

//  Padrões de vibração (atuador) 
//(espera, vibra, espera, vibra) em milissegundos
const VIBRACAO_INSCRICAO = [0, 200, 100, 200]; // duas vibradas curtas = "confirmado"
const VIBRACAO_CANCELAMENTO = 400;             // uma vibrada longa

//  Tipos do que a API devolve 
interface AulaApi {
  id_aula: number;
  nome: string;
  data: string;
  horario: string;
  capacidade: number;
  vagas: number; // vagas restantes
}
interface ReservaApi {
  id_reserva: number;
  ativa: boolean;
  id_aula: number;
}
interface ExercicioApi {
  id_exercicio: number;
  nome: string;
  series: number;
  repeticoes: number;
  descanso: string;
  gif_url: string | null; //link do vídeo do exercício (pode ser nulo)
}
interface TreinoApi {
  id_treino: number;
  objetivo: string;
  observacoes: string;
  professor: string;
  exercicios: ExercicioApi[];
}
interface DietaApi {
  id_dieta: number;
  objetivo: string;
  observacoes: string;
  alimentacao: string;
  nutricionista: string;
}
interface ResumoApi {
  professor: string | null;
  nutricionista: string | null;
  objetivo: string | null;
}

//  Funções auxiliares 

// "2026-10-30" + "18:00:00" -> "Hoje, 18:00" / "Amanhã, 08:00" / "30/10, 18:00"
function formatarQuando(data: string, horario: string) {
  const dia = String(data).slice(0, 10);
  const hora = String(horario).slice(0, 5);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);

  if (dia === fmt(hoje)) return `Hoje, ${hora}`;
  if (dia === fmt(amanha)) return `Amanhã, ${hora}`;
  const [, mes, diaMes] = dia.split('-');
  return `${diaMes}/${mes}, ${hora}`;
}

// A dieta é um texto só no banco. Cada linha no formato "Refeição: itens"
// vira um cartão; linhas sem ":" aparecem só como texto.
function separarRefeicoes(texto: string) {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const i = linha.indexOf(':');
      return i > 0 && i < 40
        ? { refeicao: linha.slice(0, i).trim(), itens: linha.slice(i + 1).trim() }
        : { refeicao: '', itens: linha };
    });
}

// tira o ID do vídeo de um link do YouTube.
// Se o link não for do YouTube, devolve null.
function extrairIdYoutube(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// player para arquivo de vídeo direto.
// Precisa ser um componente separado porque useVideoPlayer é um hook,
// e hooks não podem ser chamados dentro de um .map() nem dentro de um if.
function VideoMp4({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p: VideoPlayer) => {
    p.loop = true; // repete o vídeo em loop
  });

  return (
    <VideoView
      player={player}
      style={styles.videoExercicio}
      nativeControls       // mostra os controles de play/pause
      contentFit="contain" // não corta o vídeo
    />
  );
}

// escolhe o player certo conforme o link guardado em gif_url.

function VideoExercicio({ url }: { url: string }) {
  const idYoutube = extrairIdYoutube(url);

  if (idYoutube) {
    return (
      <View style={styles.videoExercicio}>
        <WebView
          source={{ uri: `https://www.youtube.com/embed/${idYoutube}?playsinline=1&rel=0` }}
          style={{ flex: 1 }}
          javaScriptEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
        />
      </View>
    );
  }

  return <VideoMp4 url={url} />;
}

export default function InicioAlunoScreen() {
  const router = useRouter();
  const sessao = getSessao();
  const token = sessao?.token;

  // Controla as abas debaixo 
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<number | null>(null); // aula em andamento
  const [salvando, setSalvando] = useState(false);

  // Dados do perfil do aluno
  const [nomeAtual, setNomeAtual] = useState(sessao?.usuario.nome ?? '');
  const [alunoNome, setAlunoNome] = useState(sessao?.usuario.nome ?? '');
  const [alunoEmail, setAlunoEmail] = useState(sessao?.usuario.email ?? '');

  // Dados vindos do banco
  const [resumo, setResumo] = useState<ResumoApi>({ professor: null, nutricionista: null, objetivo: null });
  const [treino, setTreino] = useState<TreinoApi | null>(null);
  const [dieta, setDieta] = useState<DietaApi | null>(null);
  const [aulas, setAulas] = useState<AulaApi[]>([]);
  const [reservas, setReservas] = useState<Record<number, number>>({}); // id_aula -> id_reserva ativa

  // Sair e tratamento de erros 
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

  // Carregamento dos dados 
  const carregarAulas = async () => {
    const [listaAulas, minhas] = await Promise.all([
      api<AulaApi[]>('/aulas', {}, token),
      api<ReservaApi[]>('/reservas/minhas', {}, token),
    ]);
    setAulas(listaAulas);

    const mapa: Record<number, number> = {};
    minhas.filter((r) => r.ativa).forEach((r) => {
      mapa[r.id_aula] = r.id_reserva;
    });
    setReservas(mapa);
  };

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const [dadosResumo, treinos, dietas] = await Promise.all([
          api<ResumoApi>('/aluno/resumo', {}, token),
          api<TreinoApi[]>('/treinos/meus', {}, token),
          api<DietaApi[]>('/dietas/minhas', {}, token),
          carregarAulas(),
        ]);
        setResumo(dadosResumo);
        setTreino(treinos[0] ?? null); // o mais recente
        setDieta(dietas[0] ?? null);
      } catch (e: any) {
        tratarErro(e);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // Atualiza o treino quando o aluno abre a aba Treino
  useEffect(() => {
    if (carregando || abaAtiva !== 'treino' || !token) return;

    async function atualizarTreino() {
      try {
        const treinos = await api<TreinoApi[]>('/treinos/meus', {}, token);
        setTreino(treinos[0] ?? null);
      } catch (e: any) {
        tratarErro(e);
      }
    }

    atualizarTreino();
  }, [abaAtiva, carregando]);


  // Acoes 
  const handleSalvarPerfil = async () => {
    if (!alunoNome.trim() || !alunoEmail.trim()) {
      avisar('Erro', 'Preencha o nome e o e-mail.');
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await api<{ id: number; nome: string; email: string }>(
        '/aluno/perfil',
        { method: 'PATCH', body: JSON.stringify({ nome: alunoNome, email: alunoEmail }) },
        token
      );

      if (sessao) {
        salvarSessao({
          token: sessao.token,
          usuario: { ...sessao.usuario, nome: atualizado.nome, email: atualizado.email },
        });
      }
      setNomeAtual(atualizado.nome);
      setAlunoNome(atualizado.nome);
      setAlunoEmail(atualizado.email);
      avisar('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
    } catch (e: any) {
      tratarErro(e);
    } finally {
      setSalvando(false);
    }
  };

  // Função para se inscrever ou cancelar inscrição na aula
  const handleToggleAula = async (aula: AulaApi) => {
    const idReserva = reservas[aula.id_aula];
    setProcessando(aula.id_aula);

    try {
      if (idReserva) {
        await api(`/reservas/${idReserva}/cancelar`, { method: 'PATCH' }, token);
        Vibration.vibrate(VIBRACAO_CANCELAMENTO); //  vibra ao cancelar
        avisar('Inscrição Cancelada', `Você saiu da aula de ${aula.nome}.`);
      } else {
        await api('/reservas', { method: 'POST', body: JSON.stringify({ id_aula: aula.id_aula }) }, token);
        Vibration.vibrate(VIBRACAO_INSCRICAO); //  vibra ao se inscrever
        avisar('Sucesso!', `Você garantiu sua vaga na aula de ${aula.nome}!`);
      }
      await carregarAulas();
    } catch (e: any) {
      tratarErro(e);
      await carregarAulas().catch(() => {}); // atualiza as vagas mesmo após o erro
    } finally {
      setProcessando(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Painel do Aluno</Text>
            <Text style={styles.headerSubtitle}>Bem-vindo(a), {nomeAtual}</Text>
          </View>

          <TouchableOpacity style={styles.headerSair} onPress={sair}>
            <Text style={styles.headerSairText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {carregando ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />

        ) : abaAtiva === 'inicio' ? (
          <View>
            /* Tela inicial com o resumo da conta */
            <Text style={styles.sectionTitle}>Resumo da sua Conta</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seu Objetivo</Text>
              <Text style={styles.cardTextBold}>{resumo.objetivo ?? 'Ainda não definido'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profissionais Responsáveis</Text>
              <Text style={styles.cardText}>🏋️ Professor: {resumo.professor ?? 'Ainda não vinculado'}</Text>
              <Text style={styles.cardText}>🥗 Nutricionista: {resumo.nutricionista ?? 'Ainda não vinculado'}</Text>
            </View>

            <View style={styles.cardInfoBox}>
              <Text style={styles.infoBoxText}>Dica do dia: Mantenha-se hidratado e não pule o descanso entre as séries!</Text>
            </View>
          </View>

        ) : abaAtiva === 'treino' ? (
          <View>
            {/* Lista de exercícios do treino atual */}
            <Text style={styles.sectionTitle}>Seu Treino Atual</Text>

            {treino ? (
              <>
                <Text style={styles.subtitleSub}>Montado por: {treino.professor}</Text>

                {treino.exercicios.map((item) => (
                  <View key={item.id_exercicio} style={styles.cardTreino}>
                    <Text style={styles.cardTitleTreino}>{item.nome}</Text>

                    {/* vídeo entre o nome e as séries.
                        Só aparece se o exercício tiver URL cadastrada no banco (gif_url). */}
                    {!!item.gif_url && <VideoExercicio url={item.gif_url} />}

                    <View style={styles.detalhesTreinoRow}>
                      <Text style={styles.badgeText}>Séries: {item.series}</Text>
                      <Text style={styles.badgeText}>Repetições: {item.repeticoes}</Text>
                      <Text style={styles.badgeText}>Descanso: {item.descanso}</Text>
                    </View>
                  </View>
                ))}

                {!!treino.observacoes && (
                  <View style={styles.cardInfoBox}>
                    <Text style={styles.infoBoxText}>📝 {treino.observacoes}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem um treino. Quando o seu professor montar um, ele aparece aqui.
                </Text>
              </View>
            )}
          </View>

        ) : abaAtiva === 'dieta' ? (
          <View>
            {/* Refeições e observações da dieta */}
            <Text style={styles.sectionTitle}>Sua Dieta Atual</Text>

            {dieta ? (
              <>
                <Text style={styles.subtitleSub}>Prescrita por: {dieta.nutricionista}</Text>

                {separarRefeicoes(dieta.alimentacao).map((item, index) => (
                  <View key={index} style={styles.cardDieta}>
                    {!!item.refeicao && <Text style={styles.cardTitleDieta}>{item.refeicao}</Text>}
                    <Text style={styles.cardText}>{item.itens}</Text>
                  </View>
                ))}

                {!!dieta.observacoes && (
                  <View style={styles.cardInfoBox}>
                    <Text style={styles.infoBoxText}>📝 {dieta.observacoes}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Você ainda não tem uma dieta. Quando o seu nutricionista montar uma, ela aparece aqui.
                </Text>
              </View>
            )}
          </View>

        ) : abaAtiva === 'aulas' ? (
          <View>
            {/* Aulas disponíveis para inscrição */}
            <Text style={styles.sectionTitle}>Aulas Programadas</Text>
            <Text style={styles.subtitleSub}>Selecione e garanta sua vaga na aula</Text>

            {aulas.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.cardText}>Nenhuma aula programada no momento.</Text>
              </View>
            )}

            {aulas.map((aula) => {
              const inscrito = !!reservas[aula.id_aula];
              const inscritas = aula.capacidade - aula.vagas;
              const lotada = aula.vagas <= 0 && !inscrito;
              const ocupado = processando === aula.id_aula;

              return (
                <View key={aula.id_aula} style={styles.cardAula}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{aula.nome}</Text>
                    <Text style={styles.cardText}>🕒 {formatarQuando(aula.data, aula.horario)}</Text>
                    <Text style={styles.vagasText}>
                      Vagas: {inscritas} / {aula.capacidade} preenchidas
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btnAula,
                      inscrito && styles.btnInscrito,
                      lotada && styles.btnLotada,
                    ]}
                    onPress={() => handleToggleAula(aula)}
                    disabled={lotada || ocupado}
                  >
                    <Text
                      style={[
                        styles.btnAulaText,
                        inscrito && styles.btnInscritoText,
                        lotada && styles.btnLotadaText,
                      ]}
                    >
                      {ocupado ? '...' : inscrito ? 'Inscrito ✅' : lotada ? 'Lotada ❌' : 'Participar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

        ) : (
          // Aba de perfil do aluno
          <View>
            {/* Campos para visualizar e editar os dados do perfil */}
            <Text style={styles.sectionTitle}>Meu Perfil</Text>

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={alunoNome}
              onChangeText={setAlunoNome}
            />

            <Text style={styles.label}>E-mail de Acesso</Text>
            <TextInput
              style={styles.input}
              value={alunoEmail}
              onChangeText={setAlunoEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Objetivo Principal (definido pelo seu profissional)</Text>
            <TextInput
              style={[styles.input, styles.inputDesabilitado]}
              value={resumo.objetivo ?? 'Ainda não definido'}
              editable={false}
            />

            <TouchableOpacity
              style={[styles.buttonPrimary, salvando && { opacity: 0.6 }]}
              onPress={handleSalvarPerfil}
              disabled={salvando}
            >
              <Text style={styles.buttonPrimaryText}>
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.buttonAction, { marginTop: 15, backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]} 
              onPress={() => setAbaAtiva('inicio')}
            >
              <Text style={[styles.buttonActionText, { color: '#B91C1C' }]}>Voltar ao Início</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Menu inferior para navegar entre as telas */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'inicio' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('inicio')}
        >
          <Text style={[styles.tabText, abaAtiva === 'inicio' && styles.tabTextActive]}>
            Início
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'treino' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('treino')}
        >
          <Text style={[styles.tabText, abaAtiva === 'treino' && styles.tabTextActive]}>
            Treino
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'dieta' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('dieta')}
        >
          <Text style={[styles.tabText, abaAtiva === 'dieta' && styles.tabTextActive]}>
            Dieta
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'aulas' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('aulas')}
        >
          <Text style={[styles.tabText, abaAtiva === 'aulas' && styles.tabTextActive]}>
            Aulas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, abaAtiva === 'perfil' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('perfil')}
        >
          <Text style={[styles.tabText, abaAtiva === 'perfil' && styles.tabTextActive]}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

{/* CSS */}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 30,
  },
  header: {
    backgroundColor: '#2563EB', 
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
    color: '#DBEAFE',
    marginTop: 2,
  },
  
  headerSair: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  headerSairText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 14,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitleSub: {
    fontSize: 13,
    color: '#6B7280',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  cardTextBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  cardInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  cardTreino: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitleTreino: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },

  videoExercicio: {
    width: '100%',
    aspectRatio: 16 / 9, 
    borderRadius: 8,
    backgroundColor: '#000',
    marginVertical: 10,
    overflow: 'hidden', 
  },
  detalhesTreinoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  cardDieta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitleDieta: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  cardAula: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vagasText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  btnAula: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnAulaText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnInscrito: {
    backgroundColor: '#10B981',
  },
  btnInscritoText: {
    color: '#FFFFFF',
  },
  btnLotada: {
    backgroundColor: '#9CA3AF',
  },
  btnLotadaText: {
    color: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
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
  inputDesabilitado: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
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
  buttonAction: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonActionText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
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
    backgroundColor: '#DBEAFE',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
});