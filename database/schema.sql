
CREATE TABLE usuarioAluno (
    id_aluno  SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha  VARCHAR(255) NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarioProfessor (
    id_professor  SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha  VARCHAR(255) NOT NULL,
    CREF   VARCHAR(25) NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarioNutri  (
    id_nutricionista  SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha  VARCHAR(255) NOT NULL,
    CRN   VARCHAR(25) NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE aula (
    id_aula    SERIAL PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    data       DATE NOT NULL,
    horario    TIME NOT NULL,
    capacidade INT  NOT NULL CHECK (capacidade > 0)
);

CREATE TABLE reserva(
  id_reserva   SERIAL PRIMARY KEY,
  dataReserva  DATE NOT NULL,
  statusReserva BOOLEAN NOT NULL DEFAULT TRUE,
  FK_id_aluno INT NOT NULL REFERENCES usuarioAluno(id_aluno),
  FK_id_aula  INT NOT NULL REFERENCES aula(id_aula)
);

-- O banco impede 2 reservas ATIVAS do mesmo aluno na mesma aula.
CREATE UNIQUE INDEX uq_reserva_ativa_aluno_aula
    ON reserva (FK_id_aluno, FK_id_aula)
    WHERE statusReserva = TRUE;

CREATE TABLE dieta(
  id_dieta  SERIAL PRIMARY KEY,
  objetivo  VARCHAR(255) NOT NULL,
  observacoes TEXT NOT NULL,
  alimentacao TEXT NOT NULL,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  FK_id_aluno INT NOT NULL REFERENCES usuarioAluno(id_aluno),
  FK_id_nutricionista INT NOT NULL REFERENCES usuarioNutri(id_nutricionista)
);

CREATE TABLE treino(
  id_treino SERIAL PRIMARY KEY,
  objetivo  VARCHAR(255) NOT NULL,
  observacoes TEXT NOT NULL,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  FK_id_aluno INT NOT NULL REFERENCES usuarioAluno(id_aluno),
  FK_id_professor  INT NOT NULL REFERENCES usuarioProfessor(id_professor)
);

CREATE TABLE exercicio (
    id_exercicio   SERIAL PRIMARY KEY,
    nome           VARCHAR(120) NOT NULL UNIQUE,
    grupo_muscular VARCHAR(60),
    gif_url        TEXT,
    descricao      TEXT
);

CREATE TABLE treinoexercicio (
    id_treino_exercicio SERIAL PRIMARY KEY,
    series      INT NOT NULL CHECK (series > 0),
    repeticoes  INT NOT NULL CHECK (repeticoes > 0),
    descanso    VARCHAR(60) NOT NULL,
    FK_id_treino    INT NOT NULL REFERENCES treino(id_treino) ON DELETE CASCADE,
    FK_id_exercicio INT NOT NULL REFERENCES exercicio(id_exercicio)
);

CREATE TABLE alunoprofessor (
    id_vinculo      SERIAL PRIMARY KEY,
    objetivo        VARCHAR(255),
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    FK_id_aluno     INT NOT NULL REFERENCES usuarioAluno(id_aluno)         ON DELETE CASCADE,
    FK_id_professor INT NOT NULL REFERENCES usuarioProfessor(id_professor) ON DELETE CASCADE,
    UNIQUE (FK_id_aluno, FK_id_professor)   -- impede vincular duas vezes o mesmo par
);
 
-- Aluno <-> Nutricionista
CREATE TABLE alunonutricionista (
    id_vinculo          SERIAL PRIMARY KEY,
    objetivo            VARCHAR(255),
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW(),
    FK_id_aluno         INT NOT NULL REFERENCES usuarioAluno(id_aluno)               ON DELETE CASCADE,
    FK_id_nutricionista INT NOT NULL REFERENCES usuarioNutri(id_nutricionista)       ON DELETE CASCADE,
    UNIQUE (FK_id_aluno, FK_id_nutricionista)
);
 
-- Para listar "meus alunos" rápido
CREATE INDEX idx_aluno_prof_prof   ON alunoprofessor(FK_id_professor);
CREATE INDEX idx_aluno_nutri_nutri ON alunonutricionista(FK_id_nutricionista);