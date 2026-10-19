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

export default function InicioAlunoScreen() {
  const router = useRouter();

  // Controla as abas debaixo (incluindo 'perfil')
  const [abaAtiva, setAbaAtiva] = useState('inicio');

  // Dados editáveis do perfil do aluno
  const [alunoNome, setAlunoNome] = useState('João Silva');
  const [alunoEmail, setAlunoEmail] = useState('joao.silva@techfit.com');
  const [alunoObjetivo, setAlunoObjetivo] = useState('Hipertrofia');
  const [professorResponsavel, setProfessorResponsavel] = useState('Carlos Eduardo');
  const [nutriResponsavel, setNutriResponsavel] = useState('Ana Beatriz');

  const handleSalvarPerfil = () => {
    Alert.alert('Sucesso!', 'Informações do perfil atualizadas com sucesso!');
  };

  // Treino do aluno
  const treinoAluno = [
    { exercicio: 'Supino Reto', series: '3', repeticoes: '12', descanso: '60s' },
    { exercicio: 'Crucifixo com Halteres', series: '3', repeticoes: '10', descanso: '60s' },
    { exercicio: 'Tríceps na Polia', series: '4', repeticoes: '15', descanso: '45s' },
  ];

  // Dieta do aluno
  const dietaAluno = [
    { refeicao: 'Café da Manhã', itens: '3 ovos mexidos + 2 fatias de pão integral' },
    { refeicao: 'Almoço', itens: '150g de frango grelhado + 150g de arroz + salada à vontade' },
    { refeicao: 'Lanche da Tarde', itens: 'Vitamina de abacate com Whey Protein' },
  ];

  // Aulas programadas
  const [aulas, setAulas] = useState([
    { id: '1', nome: 'CrossFit Avançado', horario: 'Hoje, 18:00', vagasTotais: 10, vagasInscritas: 10, inscrito: false },
    { id: '2', nome: 'Spinning / Indoor Cycling', horario: 'Hoje, 19:00', vagasTotais: 15, vagasInscritas: 12, inscrito: false },
    { id: '3', nome: 'Musculação Orientada', horario: 'Amanhã, 08:00', vagasTotais: 20, vagasInscritas: 8, inscrito: true },
  ]);

  // Função para se inscrever ou cancelar inscrição na aula
  const handleToggleAula = (idAula: any) => {
    setAulas((prevAulas) =>
      prevAulas.map((aula) => {
        if (aula.id === idAula) {
          if (aula.inscrito) {
            Alert.alert('Inscrição Cancelada', `Você saiu da aula de ${aula.nome}.`);
            return { ...aula, inscrito: false, vagasInscritas: aula.vagasInscritas - 1 };
          } else {
            if (aula.vagasInscritas >= aula.vagasTotais) {
              Alert.alert('Aula Lotada', 'Infelizmente esta aula atingiu o limite máximo de vagas.');
              return aula;
            }
            Alert.alert('Sucesso!', `Você garantiu sua vaga na aula de ${aula.nome}!`);
            return { ...aula, inscrito: true, vagasInscritas: aula.vagasInscritas + 1 };
          }
        }
        return aula;
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Painel do Aluno</Text>
            <Text style={styles.headerSubtitle}>Bem-vindo(a), {alunoNome}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {abaAtiva === 'inicio' ? (
          <View>
            <Text style={styles.sectionTitle}>Resumo da sua Conta</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seu Objetivo</Text>
              <Text style={styles.cardTextBold}>{alunoObjetivo}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profissionais Responsáveis</Text>
              <Text style={styles.cardText}>🏋️ Professor: {professorResponsavel}</Text>
              <Text style={styles.cardText}>🥗 Nutricionista: {nutriResponsavel}</Text>
            </View>

            <View style={styles.cardInfoBox}>
              <Text style={styles.infoBoxText}>💡 Dica do dia: Mantenha-se hidratado e não pule o descanso entre as séries!</Text>
            </View>
          </View>

        ) : abaAtiva === 'treino' ? (
          <View>
            <Text style={styles.sectionTitle}>Seu Treino Atual</Text>
            <Text style={styles.subtitleSub}>Montado por: {professorResponsavel}</Text>

            {treinoAluno.map((item, index) => (
              <View key={index} style={styles.cardTreino}>
                <Text style={styles.cardTitleTreino}>{item.exercicio}</Text>
                <View style={styles.detalhesTreinoRow}>
                  <Text style={styles.badgeText}>Séries: {item.series}</Text>
                  <Text style={styles.badgeText}>Repetições: {item.repeticoes}</Text>
                  <Text style={styles.badgeText}>Descanso: {item.descanso}</Text>
                </View>
              </View>
            ))}
          </View>

        ) : abaAtiva === 'dieta' ? (
          <View>
            <Text style={styles.sectionTitle}>Sua Dieta Atual</Text>
            <Text style={styles.subtitleSub}>Prescrita por: {nutriResponsavel}</Text>

            {dietaAluno.map((item, index) => (
              <View key={index} style={styles.cardDieta}>
                <Text style={styles.cardTitleDieta}>{item.refeicao}</Text>
                <Text style={styles.cardText}>{item.itens}</Text>
              </View>
            ))}
          </View>

        ) : abaAtiva === 'aulas' ? (
          <View>
            <Text style={styles.sectionTitle}>Aulas Programadas</Text>
            <Text style={styles.subtitleSub}>Selecione e garanta sua vaga na aula</Text>

            {aulas.map((aula) => {
              const lotada = aula.vagasInscritas >= aula.vagasTotais && !aula.inscrito;

              return (
                <View key={aula.id} style={styles.cardAula}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{aula.nome}</Text>
                    <Text style={styles.cardText}>🕒 {aula.horario}</Text>
                    <Text style={styles.vagasText}>
                      Vagas: {aula.vagasInscritas} / {aula.vagasTotais} preenchidas
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btnAula,
                      aula.inscrito && styles.btnInscrito,
                      lotada && styles.btnLotada,
                    ]}
                    onPress={() => handleToggleAula(aula.id)}
                    disabled={lotada}
                  >
                    <Text
                      style={[
                        styles.btnAulaText,
                        aula.inscrito && styles.btnInscritoText,
                        lotada && styles.btnLotadaText,
                      ]}
                    >
                      {aula.inscrito ? 'Inscrito ✅' : lotada ? 'Lotada ❌' : 'Participar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          // aba 5
          <View>
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
            />

            <Text style={styles.label}>Objetivo Principal</Text>
            <TextInput
              style={styles.input}
              value={alunoObjetivo}
              onChangeText={setAlunoObjetivo}
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSalvarPerfil}>
              <Text style={styles.buttonPrimaryText}>Salvar Alterações</Text>
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

      {/* abas debaixo */}
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
  logoutButton: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    display: 'none',
  },
  logoutText: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});