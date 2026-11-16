
import bcrypt from 'bcryptjs';
import cors from 'cors';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Importa as bibliotecas utilizadas para criptografia de senhas,
// controle de acesso, criação da API, autenticação e conexão com o banco.

// ---------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------

// Cria a conexão com o banco de dados PostgreSQL utilizando
// a URL armazenada nas variáveis de ambiente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Define a chave utilizada para gerar e validar tokens JWT
// e a porta em que o servidor será executado.
const JWT_SECRET = process.env.JWT_SECRET || 'vamos-para-o-quinto-semestre';
const PORT = Number(process.env.PORT || 3000);

// Inicializa o servidor Express e configura o recebimento
// de requisições de outros endereços e de dados no formato JSON.
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------
// Tipos e helpers
// ---------------------------------------------------------------

// Define os três tipos de usuários permitidos no sistema.
type Papel = 'aluno' | 'professor' | 'nutricionista';

// Estende o tipo Request do Express para armazenar
// as informações do usuário autenticado na requisição.
interface AuthRequest extends Request {
  user?: { id: number; papel: Papel };
}

// Relaciona cada perfil à sua respectiva tabela no banco
// e ao campo que identifica o usuário.
const TABELAS: Record<Papel, { tabela: string; id: string }> = {
  aluno: { tabela: 'usuarioAluno', id: 'id_aluno' },
  professor: { tabela: 'usuarioProfessor', id: 'id_professor' },
  nutricionista: { tabela: 'usuarioNutri', id: 'id_nutricionista' },
};

// Cria uma função auxiliar para capturar erros das rotas assíncronas
// e encaminhá-los automaticamente ao tratamento geral de erros.
const h =
  (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch(next);

// Verifica se a requisição possui um token JWT válido.
// Se estiver autenticado, disponibiliza os dados do usuário para a rota.
function autenticar(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token não enviado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// Verifica se o usuário autenticado possui o perfil necessário
// para acessar determinada funcionalidade do sistema.
const apenas =
  (papel: Papel) => (req: AuthRequest, res: Response, next: NextFunction) =>
    req.user?.papel === papel
      ? next()
      : res.status(403).json({ erro: 'Acesso negado para este perfil' });

// ---------------------------------------------------------------
// Auth: cadastro e login
// ---------------------------------------------------------------

// Realiza o cadastro de alunos, professores e nutricionistas,
// validando os dados e armazenando a senha de forma criptografada.
app.post('/cadastro', h(async (req, res) => {
  const { tipo, nome, email, senha, registro } = req.body as {
    tipo: Papel; nome: string; email: string; senha: string; registro?: string;
  };

  // Verifica se o tipo de conta é válido e se os campos obrigatórios
  // foram preenchidos, incluindo CREF ou CRN para profissionais.
  if (!TABELAS[tipo]) return res.status(400).json({ erro: 'Tipo inválido' });
  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  if ((tipo === 'professor' || tipo === 'nutricionista') && !registro)
    return res.status(400).json({ erro: 'CREF/CRN é obrigatório' });

  // Consulta as três tabelas de usuários para impedir
  // que um mesmo e-mail seja utilizado em mais de uma conta.
  for (const p of Object.values(TABELAS)) {
    const existe = await pool.query(`SELECT 1 FROM ${p.tabela} WHERE email = $1`, [email]);
    if (existe.rowCount) return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  // Criptografa a senha antes de armazená-la no banco de dados
  // e identifica a tabela correspondente ao perfil selecionado.
  const hash = await bcrypt.hash(senha, 10);
  const { tabela, id } = TABELAS[tipo];
  let result;

  // Insere os dados do aluno na tabela correspondente
  // e retorna as informações básicas da conta criada.
  if (tipo === 'aluno') {
    result = await pool.query(
      `INSERT INTO ${tabela} (nome, email, senha) VALUES ($1,$2,$3)
       RETURNING ${id} AS id, nome, email`,
      [nome, email, hash]
    );
  } else {
    // Insere professores ou nutricionistas, armazenando também
    // o número de registro profissional (CREF ou CRN).
    const coluna = tipo === 'professor' ? 'CREF' : 'CRN';
    result = await pool.query(
      `INSERT INTO ${tabela} (nome, email, senha, ${coluna}) VALUES ($1,$2,$3,$4)
       RETURNING ${id} AS id, nome, email`,
      [nome, email, hash, registro]
    );
  }

  // Retorna os dados da conta cadastrada e o perfil do usuário.
  res.status(201).json({ ...result.rows[0], papel: tipo });
}));

// Realiza o login do usuário, verificando o e-mail e a senha
// para permitir o acesso ao sistema.
app.post('/login', h(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });

  // Procura o e-mail nas tabelas dos três perfis
  // e compara a senha informada com a senha criptografada.
  for (const [papel, { tabela, id }] of Object.entries(TABELAS) as [Papel, typeof TABELAS[Papel]][]) {
    const r = await pool.query(
      `SELECT ${id} AS id, nome, email, senha FROM ${tabela} WHERE email = $1`,
      [email]
    );
    if (!r.rowCount) continue;

    const user = r.rows[0];
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) break;

    // Gera um token JWT com o identificador e o perfil do usuário,
    // permitindo autenticar suas próximas requisições durante sete dias.
    const token = jwt.sign({ id: user.id, papel }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, papel } });
  }

  // Retorna erro caso o e-mail ou a senha não correspondam a uma conta.
  res.status(401).json({ erro: 'E-mail ou senha incorretos' });
}));

// ---------------------------------------------------------------
// Exercícios
// ---------------------------------------------------------------

// Lista os exercícios cadastrados no banco, incluindo grupo muscular,
// endereço do GIF e descrição. É necessário estar autenticado.
app.get('/exercicios', autenticar, h(async (_req, res) => {
  const r = await pool.query(
    `SELECT id_exercicio, nome, grupo_muscular, gif_url, descricao
     FROM exercicio ORDER BY nome`
  );
  res.json(r.rows);
}));

// ---------------------------------------------------------------
// Aulas e reservas
// ---------------------------------------------------------------

// Lista as aulas disponíveis a partir da data atual,
// calculando a quantidade de vagas restantes em cada aula.
app.get('/aulas', autenticar, h(async (_req, res) => {
  const r = await pool.query(
    `SELECT a.id_aula, a.nome, a.data, a.horario, a.capacidade,
            a.capacidade - (COUNT(r.id_reserva) FILTER (WHERE r.statusReserva = TRUE))::int AS vagas
     FROM aula a
     LEFT JOIN reserva r ON r.FK_id_aula = a.id_aula
     WHERE a.data >= CURRENT_DATE
     GROUP BY a.id_aula
     ORDER BY a.data, a.horario`
  );
  res.json(r.rows);
}));

// Permite que um aluno reserve uma aula, verificando a disponibilidade
// de vagas e impedindo reservas duplicadas.
app.post('/reservas', autenticar, apenas('aluno'), h(async (req, res) => {
  const { id_aula } = req.body;
  const client = await pool.connect();
  try {
    // Inicia uma transação para garantir que a reserva
    // e a verificação de disponibilidade sejam executadas em conjunto.
    await client.query('BEGIN');

    // Bloqueia temporariamente o registro da aula para evitar
    // que dois alunos reservem simultaneamente a última vaga.
    const aula = await client.query(
      'SELECT capacidade FROM aula WHERE id_aula = $1 FOR UPDATE', [id_aula]
    );
    if (!aula.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }

    // Conta as reservas ativas e verifica se a capacidade máxima
    // da aula já foi atingida.
    const ocupadas = await client.query(
      'SELECT COUNT(*)::int AS total FROM reserva WHERE FK_id_aula = $1 AND statusReserva = TRUE',
      [id_aula]
    );
    if (ocupadas.rows[0].total >= aula.rows[0].capacidade) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'Aula lotada' });
    }

    // Registra a reserva vinculando a aula ao aluno autenticado
    // e confirma a transação no banco de dados.
    const nova = await client.query(
      `INSERT INTO reserva (dataReserva, FK_id_aluno, FK_id_aula)
       VALUES (CURRENT_DATE, $1, $2) RETURNING *`,
      [req.user!.id, id_aula]
    );
    await client.query('COMMIT');
    res.status(201).json(nova.rows[0]);
  } catch (e: any) {
    // Cancela as operações da transação caso ocorra algum erro
    // e identifica se o aluno já possui uma reserva para a aula.
    await client.query('ROLLBACK');
    if (e.code === '23505')
      return res.status(409).json({ erro: 'Você já reservou esta aula' });
    throw e;
  } finally {
    // Libera a conexão com o banco para que possa ser reutilizada.
    client.release();
  }
}));

// Retorna todas as reservas realizadas pelo aluno autenticado,
// apresentando os dados das aulas e o status de cada reserva.
app.get('/reservas/minhas', autenticar, apenas('aluno'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT r.id_reserva, r.statusReserva AS ativa, a.id_aula, a.nome, a.data, a.horario
     FROM reserva r JOIN aula a ON a.id_aula = r.FK_id_aula
     WHERE r.FK_id_aluno = $1
     ORDER BY a.data DESC, a.horario DESC`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// Cancela uma reserva alterando seu status para inativo,
// garantindo que somente o aluno responsável possa cancelá-la.
app.patch('/reservas/:id/cancelar', autenticar, apenas('aluno'), h(async (req, res) => {
  const r = await pool.query(
    `UPDATE reserva SET statusReserva = FALSE
     WHERE id_reserva = $1 AND FK_id_aluno = $2 RETURNING *`,
    [req.params.id, req.user!.id]
  );
  if (!r.rowCount) return res.status(404).json({ erro: 'Reserva não encontrada' });
  res.json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Aluno: ver treinos e dietas
// ---------------------------------------------------------------

// Busca os treinos associados ao aluno autenticado,
// incluindo os exercícios, suas séries, repetições e descanso.
app.get('/treinos/meus', autenticar, apenas('aluno'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT t.id_treino, t.objetivo, t.observacoes, t.criado_em, t.atualizado_em,
            p.nome AS professor,
            COALESCE(
              json_agg(json_build_object(
                'id_exercicio', e.id_exercicio,
                'nome', e.nome,
                'grupo_muscular', e.grupo_muscular,
                'gif_url', e.gif_url,
                'series', te.series,
                'repeticoes', te.repeticoes,
                'descanso', te.descanso
              ) ORDER BY te.id_treino_exercicio) FILTER (WHERE e.id_exercicio IS NOT NULL),
              '[]'
            ) AS exercicios
     FROM treino t
     JOIN usuarioProfessor p ON p.id_professor = t.FK_id_professor
     LEFT JOIN treinoexercicio te ON te.FK_id_treino = t.id_treino
     LEFT JOIN exercicio e ON e.id_exercicio = te.FK_id_exercicio
     WHERE t.FK_id_aluno = $1
     GROUP BY t.id_treino, p.nome
     ORDER BY t.criado_em DESC`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// Busca as dietas vinculadas ao aluno, apresentando o objetivo,
// as observações, a alimentação e o nome do nutricionista responsável.
app.get('/dietas/minhas', autenticar, apenas('aluno'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT d.id_dieta, d.objetivo, d.observacoes, d.alimentacao,
            d.criado_em, d.atualizado_em, n.nome AS nutricionista
     FROM dieta d JOIN usuarioNutri n ON n.id_nutricionista = d.FK_id_nutricionista
     WHERE d.FK_id_aluno = $1
     ORDER BY d.criado_em DESC`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// ---------------------------------------------------------------
// Professor
// ---------------------------------------------------------------

// Lista os alunos vinculados ao professor e apresenta
// o objetivo e o treino mais recente de cada aluno.
app.get('/professor/alunos', autenticar, apenas('professor'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT a.id_aluno, a.nome, a.email, v.objetivo, v.criado_em AS vinculado_em,
            (SELECT t.objetivo FROM treino t
              WHERE t.FK_id_aluno = a.id_aluno AND t.FK_id_professor = v.FK_id_professor
              ORDER BY t.criado_em DESC LIMIT 1) AS treino_atual
     FROM alunoprofessor v JOIN usuarioAluno a ON a.id_aluno = v.FK_id_aluno
     WHERE v.FK_id_professor = $1
     ORDER BY a.nome`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// Permite ao professor vincular um aluno já cadastrado
// utilizando o e-mail do aluno e definindo um objetivo.
app.post('/professor/alunos', autenticar, apenas('professor'), h(async (req, res) => {
  const { email, objetivo } = req.body;
  const aluno = await pool.query('SELECT id_aluno, nome FROM usuarioAluno WHERE email = $1', [email]);
  if (!aluno.rowCount) return res.status(404).json({ erro: 'Aluno não encontrado' });

  try {
    // Registra o vínculo entre o aluno e o professor autenticado.
    await pool.query(
      `INSERT INTO alunoprofessor (objetivo, FK_id_aluno, FK_id_professor) VALUES ($1,$2,$3)`,
      [objetivo || null, aluno.rows[0].id_aluno, req.user!.id]
    );
    res.status(201).json({ mensagem: 'Aluno vinculado', aluno: aluno.rows[0] });
  } catch (e: any) {
    // Identifica se o vínculo já existe e evita cadastrá-lo novamente.
    if (e.code === '23505') return res.status(409).json({ erro: 'Aluno já vinculado' });
    throw e;
  }
}));

// Cria um novo treino para um aluno vinculado ao professor,
// registrando o objetivo e a lista de exercícios com suas configurações.
app.post('/treinos', autenticar, apenas('professor'), h(async (req, res) => {
  const { id_aluno, objetivo, observacoes, exercicios } = req.body;
  if (!id_aluno || !objetivo || !Array.isArray(exercicios) || !exercicios.length)
    return res.status(400).json({ erro: 'Informe aluno, objetivo e ao menos um exercício' });

  // Confirma se o aluno informado está vinculado ao professor autenticado.
  const vinculo = await pool.query(
    'SELECT 1 FROM alunoprofessor WHERE FK_id_aluno = $1 AND FK_id_professor = $2',
    [id_aluno, req.user!.id]
  );
  if (!vinculo.rowCount) return res.status(403).json({ erro: 'Este aluno não está vinculado a você' });

  const client = await pool.connect();
  try {
    // Inicia uma transação para garantir que o treino
    // e todos os seus exercícios sejam cadastrados juntos.
    await client.query('BEGIN');
    const treino = await client.query(
      `INSERT INTO treino (objetivo, observacoes, FK_id_aluno, FK_id_professor)
       VALUES ($1,$2,$3,$4) RETURNING id_treino`,
      [objetivo, observacoes || '', id_aluno, req.user!.id]
    );
    const idTreino = treino.rows[0].id_treino;

    // Percorre a lista de exercícios recebida e registra cada um
    // na tabela de relacionamento entre treinos e exercícios.
    for (const ex of exercicios) {
      await client.query(
        `INSERT INTO treinoexercicio (series, repeticoes, descanso, FK_id_treino, FK_id_exercicio)
         VALUES ($1,$2,$3,$4,$5)`,
        [ex.series, ex.repeticoes, ex.descanso, idTreino, ex.id_exercicio]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id_treino: idTreino });
  } catch (e) {
    // Desfaz o cadastro caso ocorra algum erro durante a criação do treino.
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------
// Professor: abrir o treino atual de um aluno e atualizá-lo
// ---------------------------------------------------------------

// Busca o treino mais recente de um aluno vinculado ao professor,
// retornando também a lista de exercícios cadastrados.
app.get('/professor/alunos/:id/treino', autenticar, apenas('professor'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT t.id_treino, t.objetivo, t.observacoes,
            COALESCE(
              json_agg(json_build_object(
                'id_exercicio', e.id_exercicio,
                'nome', e.nome,
                'series', te.series,
                'repeticoes', te.repeticoes,
                'descanso', te.descanso
              ) ORDER BY te.id_treino_exercicio) FILTER (WHERE e.id_exercicio IS NOT NULL),
              '[]'
            ) AS exercicios
     FROM treino t
     LEFT JOIN treinoexercicio te ON te.FK_id_treino = t.id_treino
     LEFT JOIN exercicio e ON e.id_exercicio = te.FK_id_exercicio
     WHERE t.FK_id_aluno = $1 AND t.FK_id_professor = $2
     GROUP BY t.id_treino
     ORDER BY t.criado_em DESC
     LIMIT 1`,
    [req.params.id, req.user!.id]
  );
  res.json({ treino: r.rows[0] ?? null });
}));

// Atualiza um treino existente, alterando seu objetivo,
// suas observações e substituindo a lista de exercícios.
app.put('/treinos/:id', autenticar, apenas('professor'), h(async (req, res) => {
  const { objetivo, observacoes, exercicios } = req.body;
  if (!objetivo?.trim() || !Array.isArray(exercicios) || !exercicios.length)
    return res.status(400).json({ erro: 'Informe o objetivo e ao menos um exercício' });

  const client = await pool.connect();
  try {
    // Inicia a transação e verifica se o treino pertence
    // ao professor que está realizando a alteração.
    await client.query('BEGIN');

    // Atualiza os dados principais do treino e registra
    // a data e o horário da última atualização.
    const upd = await client.query(
      `UPDATE treino SET objetivo = $1, observacoes = $2, atualizado_em = NOW()
       WHERE id_treino = $3 AND FK_id_professor = $4
       RETURNING id_treino`,
      [objetivo.trim(), observacoes || '', req.params.id, req.user!.id]
    );
    if (!upd.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Treino não encontrado' });
    }

    // Remove os exercícios antigos e cadastra a nova lista
    // recebida na requisição.
    await client.query('DELETE FROM treinoexercicio WHERE FK_id_treino = $1', [req.params.id]);
    for (const ex of exercicios) {
      await client.query(
        `INSERT INTO treinoexercicio (series, repeticoes, descanso, FK_id_treino, FK_id_exercicio)
         VALUES ($1,$2,$3,$4,$5)`,
        [ex.series, ex.repeticoes, ex.descanso, req.params.id, ex.id_exercicio]
      );
    }

    // Confirma as alterações no banco e retorna o identificador do treino.
    await client.query('COMMIT');
    res.json({ id_treino: Number(req.params.id) });
  } catch (e) {
    // Desfaz todas as alterações caso alguma operação apresente erro.
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------
// Nutricionista
// ---------------------------------------------------------------

// Lista os alunos vinculados à nutricionista e apresenta
// o objetivo e a dieta mais recente de cada aluno.
app.get('/nutri/alunos', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT a.id_aluno, a.nome, a.email, v.objetivo, v.criado_em AS vinculado_em,
            (SELECT d.objetivo FROM dieta d
              WHERE d.FK_id_aluno = a.id_aluno AND d.FK_id_nutricionista = v.FK_id_nutricionista
              ORDER BY d.criado_em DESC LIMIT 1) AS dieta_atual
     FROM alunonutricionista v JOIN usuarioAluno a ON a.id_aluno = v.FK_id_aluno
     WHERE v.FK_id_nutricionista = $1
     ORDER BY a.nome`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// Permite que a nutricionista vincule um aluno já cadastrado
// utilizando o e-mail e definindo um objetivo para o acompanhamento.
app.post('/nutri/alunos', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { email, objetivo } = req.body;
  const aluno = await pool.query('SELECT id_aluno, nome FROM usuarioAluno WHERE email = $1', [email]);
  if (!aluno.rowCount) return res.status(404).json({ erro: 'Aluno não encontrado' });

  try {
    // Registra o vínculo entre o aluno e a nutricionista autenticada.
    await pool.query(
      `INSERT INTO alunonutricionista (objetivo, FK_id_aluno, FK_id_nutricionista) VALUES ($1,$2,$3)`,
      [objetivo || null, aluno.rows[0].id_aluno, req.user!.id]
    );
    res.status(201).json({ mensagem: 'Aluno vinculado', aluno: aluno.rows[0] });
  } catch (e: any) {
    // Impede a criação de um vínculo duplicado entre os usuários.
    if (e.code === '23505') return res.status(409).json({ erro: 'Aluno já vinculado' });
    throw e;
  }
}));

// Cadastra uma dieta para um aluno vinculado à nutricionista,
// armazenando o objetivo, as observações e as informações alimentares.
app.post('/dietas', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { id_aluno, objetivo, observacoes, alimentacao } = req.body;
  if (!id_aluno || !objetivo || !alimentacao)
    return res.status(400).json({ erro: 'Informe aluno, objetivo e alimentação' });

  // Verifica se existe um vínculo entre a nutricionista e o aluno informado.
  const vinculo = await pool.query(
    'SELECT 1 FROM alunonutricionista WHERE FK_id_aluno = $1 AND FK_id_nutricionista = $2',
    [id_aluno, req.user!.id]
  );
  if (!vinculo.rowCount) return res.status(403).json({ erro: 'Este aluno não está vinculado a você' });

  // Insere a nova dieta no banco de dados e retorna seu identificador.
  const r = await pool.query(
    `INSERT INTO dieta (objetivo, observacoes, alimentacao, FK_id_aluno, FK_id_nutricionista)
     VALUES ($1,$2,$3,$4,$5) RETURNING id_dieta`,
    [objetivo, observacoes || '', alimentacao, id_aluno, req.user!.id]
  );
  res.status(201).json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Nutricionista: abrir a dieta atual de um aluno e atualizá-la
// ---------------------------------------------------------------

// Busca a dieta mais recente de um aluno vinculado à nutricionista,
// retornando seus dados para visualização ou edição.
app.get('/nutri/alunos/:id/dieta', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT id_dieta, objetivo, observacoes, alimentacao
     FROM dieta
     WHERE FK_id_aluno = $1 AND FK_id_nutricionista = $2
     ORDER BY criado_em DESC
     LIMIT 1`,
    [req.params.id, req.user!.id]
  );
  res.json({ dieta: r.rows[0] ?? null });
}));

// Atualiza os dados de uma dieta existente, verificando
// se ela pertence à nutricionista que está realizando a operação.
app.put('/dietas/:id', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { objetivo, observacoes, alimentacao } = req.body;
  if (!objetivo?.trim() || !alimentacao?.trim())
    return res.status(400).json({ erro: 'Informe o objetivo e a alimentação' });

  // Atualiza os campos da dieta e registra a data da alteração.
  const r = await pool.query(
    `UPDATE dieta SET objetivo = $1, observacoes = $2, alimentacao = $3, atualizado_em = NOW()
     WHERE id_dieta = $4 AND FK_id_nutricionista = $5
     RETURNING id_dieta`,
    [objetivo.trim(), observacoes || '', alimentacao, req.params.id, req.user!.id]
  );
  if (!r.rowCount) return res.status(404).json({ erro: 'Dieta não encontrada' });
  res.json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Aluno: resumo e edição de perfil
// ---------------------------------------------------------------

// Retorna o nome do professor, da nutricionista e o objetivo
// associado ao aluno autenticado.
app.get('/aluno/resumo', autenticar, apenas('aluno'), h(async (req, res) => {
  // Consulta o professor vinculado mais recentemente ao aluno.
  const prof = await pool.query(
    `SELECT p.nome, v.objetivo
     FROM alunoprofessor v JOIN usuarioProfessor p ON p.id_professor = v.FK_id_professor
     WHERE v.FK_id_aluno = $1 ORDER BY v.criado_em DESC LIMIT 1`,
    [req.user!.id]
  );

  // Consulta a nutricionista vinculada mais recentemente ao aluno.
  const nutri = await pool.query(
    `SELECT n.nome, v.objetivo
     FROM alunonutricionista v JOIN usuarioNutri n ON n.id_nutricionista = v.FK_id_nutricionista
     WHERE v.FK_id_aluno = $1 ORDER BY v.criado_em DESC LIMIT 1`,
    [req.user!.id]
  );
  res.json({
    professor: prof.rows[0]?.nome ?? null,
    nutricionista: nutri.rows[0]?.nome ?? null,
    objetivo: prof.rows[0]?.objetivo ?? nutri.rows[0]?.objetivo ?? null,
  });
}));

// Permite que o aluno atualize seu nome e e-mail,
// verificando se o novo endereço de e-mail está disponível.
app.patch('/aluno/perfil', autenticar, apenas('aluno'), h(async (req, res) => {
  const { nome, email } = req.body;
  if (!nome?.trim() || !email?.trim())
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios' });

  // Padroniza o e-mail para letras minúsculas e verifica
  // se ele já está cadastrado em outra conta.
  const emailNovo = email.trim().toLowerCase();

  const emUso = await pool.query(
    `SELECT 1 FROM usuarioAluno WHERE email = $1 AND id_aluno <> $2
     UNION ALL SELECT 1 FROM usuarioProfessor WHERE email = $1
     UNION ALL SELECT 1 FROM usuarioNutri WHERE email = $1`,
    [emailNovo, req.user!.id]
  );
  if (emUso.rowCount) return res.status(409).json({ erro: 'E-mail já cadastrado' });

  // Atualiza os dados do aluno e retorna as informações modificadas.
  const r = await pool.query(
    `UPDATE usuarioAluno SET nome = $1, email = $2 WHERE id_aluno = $3
     RETURNING id_aluno AS id, nome, email`,
    [nome.trim(), emailNovo, req.user!.id]
  );
  res.json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Professor: exercício personalizado e perfil
// ---------------------------------------------------------------

// Permite ao professor cadastrar um exercício no catálogo,
// reutilizando o registro caso já exista um exercício com o mesmo nome.
app.post('/exercicios', autenticar, apenas('professor'), h(async (req, res) => {
  const nome = req.body.nome?.trim();
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do exercício' });

  // Insere o exercício ou mantém o registro existente
  // e retorna seu identificador e nome.
  const r = await pool.query(
    `INSERT INTO exercicio (nome) VALUES ($1)
     ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
     RETURNING id_exercicio, nome`,
    [nome]
  );
  res.status(201).json(r.rows[0]);
}));

// Consulta os dados do perfil do professor autenticado,
// incluindo seu registro profissional CREF.
app.get('/professor/perfil', autenticar, apenas('professor'), h(async (req, res) => {
  const r = await pool.query(
    'SELECT nome, email, CREF AS cref FROM usuarioProfessor WHERE id_professor = $1',
    [req.user!.id]
  );
  res.json(r.rows[0]);
}));

// Permite ao professor editar seu nome, e-mail e CREF,
// verificando se o novo e-mail não está sendo utilizado por outra conta.
app.patch('/professor/perfil', autenticar, apenas('professor'), h(async (req, res) => {
  const { nome, email, cref } = req.body;
  if (!nome?.trim() || !email?.trim() || !cref?.trim())
    return res.status(400).json({ erro: 'Nome, e-mail e CREF são obrigatórios' });

  // Padroniza o e-mail e verifica sua disponibilidade nas três tabelas.
  const emailNovo = email.trim().toLowerCase();

  const emUso = await pool.query(
    `SELECT 1 FROM usuarioAluno WHERE email = $1
     UNION ALL SELECT 1 FROM usuarioProfessor WHERE email = $1 AND id_professor <> $2
     UNION ALL SELECT 1 FROM usuarioNutri WHERE email = $1`,
    [emailNovo, req.user!.id]
  );
  if (emUso.rowCount) return res.status(409).json({ erro: 'E-mail já cadastrado' });

  // Atualiza os dados do professor e retorna as informações modificadas.
  const r = await pool.query(
    `UPDATE usuarioProfessor SET nome = $1, email = $2, CREF = $3 WHERE id_professor = $4
     RETURNING nome, email, CREF AS cref`,
    [nome.trim(), emailNovo, cref.trim(), req.user!.id]
  );
  res.json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Profissional cadastra um aluno e realiza o vínculo
// ---------------------------------------------------------------

// Permite que professores e nutricionistas cadastrem um aluno novo
// ou vinculem um aluno existente à sua lista de acompanhamento.
app.post('/alunos/cadastrar', autenticar, h(async (req, res) => {
  // Identifica o perfil do profissional e impede que alunos
  // utilizem essa funcionalidade.
  const papel = req.user!.papel;
  if (papel !== 'professor' && papel !== 'nutricionista')
    return res.status(403).json({ erro: 'Acesso negado para este perfil' });

  const { nome, email, senha, objetivo } = req.body;
  const emailNorm = email?.trim().toLowerCase();
  if (!emailNorm) return res.status(400).json({ erro: 'Informe o e-mail do aluno' });

  const client = await pool.connect();
  try {
    // Inicia uma transação para garantir que a criação da conta
    // e o vínculo com o profissional sejam realizados em conjunto.
    await client.query('BEGIN');

    let idAluno: number;
    let nomeAluno: string;
    let jaExistia = false;

    // Verifica se já existe uma conta de aluno com o e-mail informado.
    const existente = await client.query(
      'SELECT id_aluno, nome FROM usuarioAluno WHERE email = $1', [emailNorm]
    );

    if (existente.rowCount) {
      // Se a conta já existir, utiliza os dados encontrados
      // sem criar um novo cadastro.
      idAluno = existente.rows[0].id_aluno;
      nomeAluno = existente.rows[0].nome;
      jaExistia = true;
    } else {
      // Verifica se o e-mail pertence a outro perfil e valida
      // os dados necessários para criar uma nova conta de aluno.
      const outro = await client.query(
        `SELECT 1 FROM usuarioProfessor WHERE email = $1
         UNION ALL SELECT 1 FROM usuarioNutri WHERE email = $1`,
        [emailNorm]
      );
      if (outro.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ erro: 'Este e-mail já pertence a outro tipo de conta' });
      }
      if (!nome?.trim() || !senha) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: 'Informe o nome e a senha inicial para criar a conta do aluno' });
      }

      // Criptografa a senha inicial e cria uma nova conta de aluno.
      const hash = await bcrypt.hash(senha, 10);
      const novo = await client.query(
        'INSERT INTO usuarioAluno (nome, email, senha) VALUES ($1,$2,$3) RETURNING id_aluno',
        [nome.trim(), emailNorm, hash]
      );
      idAluno = novo.rows[0].id_aluno;
      nomeAluno = nome.trim();
    }

    // Define qual tabela e coluna serão utilizadas para vincular
    // o aluno ao professor ou à nutricionista.
    const [tabela, colunaProfissional] =
      papel === 'professor'
        ? ['alunoprofessor', 'FK_id_professor']
        : ['alunonutricionista', 'FK_id_nutricionista'];

    // Registra o vínculo entre o aluno e o profissional autenticado,
    // evitando duplicações por meio da cláusula ON CONFLICT.
    const vinculo = await client.query(
      `INSERT INTO ${tabela} (objetivo, FK_id_aluno, ${colunaProfissional})
       VALUES ($1,$2,$3)
       ON CONFLICT (FK_id_aluno, ${colunaProfissional}) DO NOTHING
       RETURNING id_vinculo`,
      [objetivo?.trim() || null, idAluno, req.user!.id]
    );
    if (!vinculo.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'Este aluno já está vinculado a você' });
    }

    // Confirma o cadastro e o vínculo e retorna os dados do aluno,
    // indicando se a conta já existia ou foi criada nessa operação.
    await client.query('COMMIT');
    res.status(201).json({
      jaExistia,
      aluno: { id_aluno: idAluno, nome: nomeAluno },
      mensagem: jaExistia
        ? `${nomeAluno} já tinha conta e agora está vinculado(a) à sua lista.`
        : `Aluno(a) ${nomeAluno} cadastrado(a) e vinculado(a) à sua lista! Informe a senha inicial a ele(a).`,
    });
  } catch (e: any) {
    // Desfaz a transação em caso de erro e identifica
    // possíveis conflitos de e-mail no banco de dados.
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ erro: 'E-mail já cadastrado' });
    throw e;
  } finally {
    // Libera a conexão utilizada durante a operação.
    client.release();
  }
}));

// ---------------------------------------------------------------
// Nutricionista: perfil
// ---------------------------------------------------------------

// Consulta os dados do perfil da nutricionista autenticada,
// incluindo seu registro profissional CRN.
app.get('/nutri/perfil', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const r = await pool.query(
    'SELECT nome, email, CRN AS crn FROM usuarioNutri WHERE id_nutricionista = $1',
    [req.user!.id]
  );
  res.json(r.rows[0]);
}));

// Permite que a nutricionista atualize seu nome, e-mail e CRN,
// verificando se o novo e-mail não pertence a outra conta.
app.patch('/nutri/perfil', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { nome, email, crn } = req.body;
  if (!nome?.trim() || !email?.trim() || !crn?.trim())
    return res.status(400).json({ erro: 'Nome, e-mail e CRN são obrigatórios' });

  // Padroniza o e-mail e verifica se ele já está cadastrado
  // nas tabelas de alunos, professores ou nutricionistas.
  const emailNovo = email.trim().toLowerCase();

  const emUso = await pool.query(
    `SELECT 1 FROM usuarioAluno WHERE email = $1
     UNION ALL SELECT 1 FROM usuarioProfessor WHERE email = $1
     UNION ALL SELECT 1 FROM usuarioNutri WHERE email = $1 AND id_nutricionista <> $2`,
    [emailNovo, req.user!.id]
  );
  if (emUso.rowCount) return res.status(409).json({ erro: 'E-mail já cadastrado' });

  // Atualiza os dados da nutricionista e retorna as informações modificadas.
  const r = await pool.query(
    `UPDATE usuarioNutri SET nome = $1, email = $2, CRN = $3 WHERE id_nutricionista = $4
     RETURNING nome, email, CRN AS crn`,
    [nome.trim(), emailNovo, crn.trim(), req.user!.id]
  );
  res.json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Tratamento de erros e inicialização
// ---------------------------------------------------------------

// Captura erros não tratados pelas rotas, registra o problema
// no console e retorna uma resposta de erro interno ao cliente.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

// Inicia o servidor na porta configurada e exibe uma mensagem
// no terminal informando o endereço em que a API está funcionando.
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
