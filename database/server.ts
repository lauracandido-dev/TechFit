import bcrypt from 'bcryptjs';
import cors from 'cors';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// ---------------------------------------------------------------
// Configuração
// Ajuste os nomes das variáveis para bater com o seu .env
// ---------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // o Supabase exige SSL
});

const JWT_SECRET = process.env.JWT_SECRET || 'troque-isto-no-env';
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------
// Tipos e helpers
// ---------------------------------------------------------------
type Papel = 'aluno' | 'professor' | 'nutricionista';

interface AuthRequest extends Request {
  user?: { id: number; papel: Papel };
}

const TABELAS: Record<Papel, { tabela: string; id: string }> = {
  aluno: { tabela: 'usuarioAluno', id: 'id_aluno' },
  professor: { tabela: 'usuarioProfessor', id: 'id_professor' },
  nutricionista: { tabela: 'usuarioNutri', id: 'id_nutricionista' },
};

// Evita try/catch repetido em cada rota
const h =
  (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch(next);

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

const apenas =
  (papel: Papel) => (req: AuthRequest, res: Response, next: NextFunction) =>
    req.user?.papel === papel
      ? next()
      : res.status(403).json({ erro: 'Acesso negado para este perfil' });

// ---------------------------------------------------------------
// Auth: cadastro e login
// ---------------------------------------------------------------
app.post('/cadastro', h(async (req, res) => {
  const { tipo, nome, email, senha, registro } = req.body as {
    tipo: Papel; nome: string; email: string; senha: string; registro?: string;
  };

  if (!TABELAS[tipo]) return res.status(400).json({ erro: 'Tipo inválido' });
  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  if ((tipo === 'professor' || tipo === 'nutricionista') && !registro)
    return res.status(400).json({ erro: 'CREF/CRN é obrigatório' });

  // Impede o mesmo e-mail em perfis diferentes (o login procura nas 3 tabelas)
  for (const p of Object.values(TABELAS)) {
    const existe = await pool.query(`SELECT 1 FROM ${p.tabela} WHERE email = $1`, [email]);
    if (existe.rowCount) return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const hash = await bcrypt.hash(senha, 10);
  const { tabela, id } = TABELAS[tipo];
  let result;

  if (tipo === 'aluno') {
    result = await pool.query(
      `INSERT INTO ${tabela} (nome, email, senha) VALUES ($1,$2,$3)
       RETURNING ${id} AS id, nome, email`,
      [nome, email, hash]
    );
  } else {
    const coluna = tipo === 'professor' ? 'CREF' : 'CRN';
    result = await pool.query(
      `INSERT INTO ${tabela} (nome, email, senha, ${coluna}) VALUES ($1,$2,$3,$4)
       RETURNING ${id} AS id, nome, email`,
      [nome, email, hash, registro]
    );
  }

  res.status(201).json({ ...result.rows[0], papel: tipo });
}));

app.post('/login', h(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });

  for (const [papel, { tabela, id }] of Object.entries(TABELAS) as [Papel, typeof TABELAS[Papel]][]) {
    const r = await pool.query(
      `SELECT ${id} AS id, nome, email, senha FROM ${tabela} WHERE email = $1`,
      [email]
    );
    if (!r.rowCount) continue;

    const user = r.rows[0];
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) break;

    const token = jwt.sign({ id: user.id, papel }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, papel } });
  }

  res.status(401).json({ erro: 'E-mail ou senha incorretos' });
}));

// ---------------------------------------------------------------
// Exercícios (qualquer usuário logado)
// ---------------------------------------------------------------
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

app.post('/reservas', autenticar, apenas('aluno'), h(async (req, res) => {
  const { id_aula } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Trava a linha da aula para duas pessoas não pegarem a última vaga juntas
    const aula = await client.query(
      'SELECT capacidade FROM aula WHERE id_aula = $1 FOR UPDATE', [id_aula]
    );
    if (!aula.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Aula não encontrada' });
    }

    const ocupadas = await client.query(
      'SELECT COUNT(*)::int AS total FROM reserva WHERE FK_id_aula = $1 AND statusReserva = TRUE',
      [id_aula]
    );
    if (ocupadas.rows[0].total >= aula.rows[0].capacidade) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'Aula lotada' });
    }

    const nova = await client.query(
      `INSERT INTO reserva (dataReserva, FK_id_aluno, FK_id_aula)
       VALUES (CURRENT_DATE, $1, $2) RETURNING *`,
      [req.user!.id, id_aula]
    );
    await client.query('COMMIT');
    res.status(201).json(nova.rows[0]);
  } catch (e: any) {
    await client.query('ROLLBACK');
    if (e.code === '23505')
      return res.status(409).json({ erro: 'Você já reservou esta aula' });
    throw e;
  } finally {
    client.release();
  }
}));

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
app.get('/professor/alunos', autenticar, apenas('professor'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT a.id_aluno, a.nome, a.email, v.objetivo, v.criado_em AS vinculado_em
     FROM alunoprofessor v JOIN usuarioAluno a ON a.id_aluno = v.FK_id_aluno
     WHERE v.FK_id_professor = $1
     ORDER BY a.nome`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

// Vincula um aluno já cadastrado (pelo e-mail) ao professor
app.post('/professor/alunos', autenticar, apenas('professor'), h(async (req, res) => {
  const { email, objetivo } = req.body;
  const aluno = await pool.query('SELECT id_aluno, nome FROM usuarioAluno WHERE email = $1', [email]);
  if (!aluno.rowCount) return res.status(404).json({ erro: 'Aluno não encontrado' });

  try {
    await pool.query(
      `INSERT INTO alunoprofessor (objetivo, FK_id_aluno, FK_id_professor) VALUES ($1,$2,$3)`,
      [objetivo || null, aluno.rows[0].id_aluno, req.user!.id]
    );
    res.status(201).json({ mensagem: 'Aluno vinculado', aluno: aluno.rows[0] });
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Aluno já vinculado' });
    throw e;
  }
}));

// Cria treino com lista de exercícios
// body: { id_aluno, objetivo, observacoes, exercicios: [{ id_exercicio, series, repeticoes, descanso }] }
app.post('/treinos', autenticar, apenas('professor'), h(async (req, res) => {
  const { id_aluno, objetivo, observacoes, exercicios } = req.body;
  if (!id_aluno || !objetivo || !Array.isArray(exercicios) || !exercicios.length)
    return res.status(400).json({ erro: 'Informe aluno, objetivo e ao menos um exercício' });

  const vinculo = await pool.query(
    'SELECT 1 FROM alunoprofessor WHERE FK_id_aluno = $1 AND FK_id_professor = $2',
    [id_aluno, req.user!.id]
  );
  if (!vinculo.rowCount) return res.status(403).json({ erro: 'Este aluno não está vinculado a você' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const treino = await client.query(
      `INSERT INTO treino (objetivo, observacoes, FK_id_aluno, FK_id_professor)
       VALUES ($1,$2,$3,$4) RETURNING id_treino`,
      [objetivo, observacoes || '', id_aluno, req.user!.id]
    );
    const idTreino = treino.rows[0].id_treino;

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
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------
// Nutricionista
// ---------------------------------------------------------------
app.get('/nutri/alunos', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const r = await pool.query(
    `SELECT a.id_aluno, a.nome, a.email, v.objetivo, v.criado_em AS vinculado_em
     FROM alunonutricionista v JOIN usuarioAluno a ON a.id_aluno = v.FK_id_aluno
     WHERE v.FK_id_nutricionista = $1
     ORDER BY a.nome`,
    [req.user!.id]
  );
  res.json(r.rows);
}));

app.post('/nutri/alunos', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { email, objetivo } = req.body;
  const aluno = await pool.query('SELECT id_aluno, nome FROM usuarioAluno WHERE email = $1', [email]);
  if (!aluno.rowCount) return res.status(404).json({ erro: 'Aluno não encontrado' });

  try {
    await pool.query(
      `INSERT INTO alunonutricionista (objetivo, FK_id_aluno, FK_id_nutricionista) VALUES ($1,$2,$3)`,
      [objetivo || null, aluno.rows[0].id_aluno, req.user!.id]
    );
    res.status(201).json({ mensagem: 'Aluno vinculado', aluno: aluno.rows[0] });
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Aluno já vinculado' });
    throw e;
  }
}));

app.post('/dietas', autenticar, apenas('nutricionista'), h(async (req, res) => {
  const { id_aluno, objetivo, observacoes, alimentacao } = req.body;
  if (!id_aluno || !objetivo || !alimentacao)
    return res.status(400).json({ erro: 'Informe aluno, objetivo e alimentação' });

  const vinculo = await pool.query(
    'SELECT 1 FROM alunonutricionista WHERE FK_id_aluno = $1 AND FK_id_nutricionista = $2',
    [id_aluno, req.user!.id]
  );
  if (!vinculo.rowCount) return res.status(403).json({ erro: 'Este aluno não está vinculado a você' });

  const r = await pool.query(
    `INSERT INTO dieta (objetivo, observacoes, alimentacao, FK_id_aluno, FK_id_nutricionista)
     VALUES ($1,$2,$3,$4,$5) RETURNING id_dieta`,
    [objetivo, observacoes || '', alimentacao, id_aluno, req.user!.id]
  );
  res.status(201).json(r.rows[0]);
}));

// ---------------------------------------------------------------
// Tratamento de erros e inicialização
// ---------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));