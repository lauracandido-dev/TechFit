
# TechFit

O **TechFit** é um aplicativo de gerenciamento para academias.

O objetivo do projeto é facilitar a organização das atividades de uma academia, reunindo informações de alunos, treinos, dietas e profissionais em uma única aplicação.

O aplicativo possui três perfis de usuário: **Aluno, Professor e Nutricionista**, cada um com telas e funcionalidades específicas.

## Funcionalidades

### Login e Cadastro
- Tela de login.
- Cadastro de usuários.
- Seleção do perfil de acesso.
- Acesso às áreas correspondentes a cada tipo de usuário.

### Aluno
- Painel inicial do aluno.
- Consulta de treinos.
- Consulta de dietas.
- Área de aulas e reservas.
- Visualização do perfil.

### Professor
- Painel inicial do professor.
- Visualização dos alunos cadastrados.
- Área para criação e edição de treinos.
- Visualização do perfil.

### Nutricionista
- Painel inicial da nutricionista.
- Visualização dos alunos cadastrados.
- Área para criação e edição de dietas.
- Organização de refeições e alimentos.
- Visualização do perfil.

### Cadastro de Alunos
- Formulário para preenchimento dos dados dos alunos.
- Interface para cadastro de novos alunos.

## Tecnologias utilizadas

- **React Native:** desenvolvimento das interfaces do aplicativo.
- **Expo:** ambiente utilizado para executar e desenvolver a aplicação.
- **TypeScript:** implementação da lógica e dos componentes, com tipagem estática.
- **TSX:** extensão utilizada nos arquivos que combinam TypeScript e componentes React.
- **Expo Router:** organização das telas e navegação da aplicação.
- **React Hooks:** gerenciamento de estados e interações das interfaces.

## Estrutura do projeto

As telas foram organizadas em arquivos separados, de acordo com suas funcionalidades:

| Arquivo | Descrição |
|---|---|
| `index.tsx` | Tela de login |
| `cadastro.tsx` | Tela de cadastro de usuários |
| `cadastrarAluno.tsx` | Cadastro de alunos |
| `inicioAluno.tsx` | Painel do aluno |
| `inicioProf.tsx` | Painel do professor |
| `inicioNutri.tsx` | Painel da nutricionista |

## Como executar o projeto

### Pré-requisitos

- Node.js instalado.
- npm instalado.
- Expo Go no celular ou um emulador configurado.

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/lauracandido-dev/TechFit.git
```

2. Entre na pasta do projeto:

```bash
cd TechFit
```

3. Instale as dependências:

```bash
npm install
```

4. Inicie a aplicação:

```bash
npx expo start
```

Após iniciar, será possível abrir o aplicativo pelo Expo Go ou por um emulador Android/iOS.

## Objetivo acadêmico

O TechFit foi desenvolvido no segundo semestre de 2026, como parte da disciplina de Engenharia de Software do Centro Universitário FEI.

O projeto permitiu aplicar conhecimentos de desenvolvimento mobile, organização de componentes, navegação entre telas e utilização de TypeScript com React Native.

## Integrantes

- Camille Pereira Hernandes
- Laura Candido da Silva
- Leonardo Henrique Vieira Bardini
- Guilherme Proença

**Professora:** Renata M. Nogueira de Oliveira

---

**TechFit — Mais organização para a academia, mais praticidade para os alunos.**
