import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const API = "http://localhost:8080/api";

type Exam = {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Option = {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
};

type Question = {
  id: number;
  examId: number;
  text: string;
  type: string;
  points: number;
  options: Option[];
};

function App() {
  const [view, setView] = useState("home");

  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MultipleChoice");
  const [points, setPoints] = useState(1);

  const [timeLeft, setTimeLeft] = useState(0);

  const [answers, setAnswers] = useState<
    Record<number, string | number>
  >({});

  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // CARGAR DATOS
  // =========================================================

  const loadExams = async () => {
    try {
      const response = await fetch(`${API}/exams`);

      if (!response.ok) {
        throw new Error("Error cargando exámenes");
      }

      const data = await response.json();
      setExams(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API}/users`);

      if (!response.ok) {
        throw new Error("Error cargando usuarios");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadExams();
    loadUsers();
  }, []);

  // =========================================================
  // TEMPORIZADOR
  // =========================================================

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // =========================================================
  // EXÁMENES
  // =========================================================

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 0,
          title,
          description,
          durationMinutes: duration,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear el examen");
      }

      setTitle("");
      setDescription("");
      setDuration(60);

      await loadExams();

      alert("Examen creado correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el examen.");
    }
  };

  const deleteExam = async (id: number) => {
    const confirmed = confirm(
      "¿Deseas eliminar este examen?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API}/exams/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar el examen");
      }

      await loadExams();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el examen.");
    }
  };

  // =========================================================
  // PREGUNTAS
  // =========================================================

  const openQuestions = async (exam: Exam) => {
    try {
      setSelectedExam(exam);

      const response = await fetch(
        `${API}/questions/${exam.id}`
      );

      if (!response.ok) {
        throw new Error("No se pudieron cargar las preguntas");
      }

      const data = await response.json();

      setQuestions(data);
      setView("questions");
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar las preguntas.");
    }
  };

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExam) {
      return;
    }

    try {
      const response = await fetch(`${API}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 0,
          examId: selectedExam.id,
          text: questionText,
          type: questionType,
          points,
          options: [],
          answers: [],
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear la pregunta");
      }

      setQuestionText("");
      setPoints(1);

      await openQuestions(selectedExam);

      alert("Pregunta agregada correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo crear la pregunta.");
    }
  };

  const addOption = async (
    questionId: number,
    isCorrect: boolean
  ) => {
    const text = prompt(
      isCorrect
        ? "Escribe la respuesta correcta:"
        : "Escribe la opción:"
    );

    if (!text) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/question-options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: 0,
            questionId,
            text,
            isCorrect,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("No se pudo agregar la opción");
      }

      if (selectedExam) {
        await openQuestions(selectedExam);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar la opción.");
    }
  };

  // =========================================================
  // INICIAR EXAMEN
  // =========================================================

  const startExam = async (exam: Exam) => {
    try {
      setSelectedExam(exam);

      const response = await fetch(
        `${API}/questions/${exam.id}`
      );

      if (!response.ok) {
        throw new Error("No se pudieron cargar las preguntas");
      }

      const data = await response.json();

      setQuestions(data);
      setAnswers({});
      setTimeLeft(exam.durationMinutes * 60);
      setView("take");
    } catch (error) {
      console.error(error);
      alert("No se pudo iniciar el examen.");
    }
  };

  // =========================================================
  // FINALIZAR EXAMEN
  // =========================================================

  const finishExam = async () => {
    if (!selectedExam) {
      return;
    }

    const student = users.find(
      (user) => user.role === "Student"
    );

    if (!student) {
      alert(
        "No existe un estudiante registrado en el sistema."
      );
      return;
    }

    const confirmed = confirm(
      "¿Deseas finalizar y enviar el examen?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      // Calcular puntuación de preguntas automáticas
      let totalScore = 0;

      for (const question of questions) {
        if (question.type === "Open") {
          continue;
        }

        const selectedOptionId = Number(
          answers[question.id]
        );

        const selectedOption = question.options?.find(
          (option) =>
            option.id === selectedOptionId
        );

        if (selectedOption?.isCorrect) {
          totalScore += Number(question.points);
        }
      }

      // Crear submission
      const submissionResponse = await fetch(
        `${API}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: 0,
            examId: selectedExam.id,
            userId: student.id,
            startedAt: new Date().toISOString(),
            submittedAt: new Date().toISOString(),
            score: totalScore,
            answers: [],
          }),
        }
      );

      if (!submissionResponse.ok) {
        const errorText =
          await submissionResponse.text();

        console.error(errorText);

        throw new Error(
          "No se pudo registrar el examen"
        );
      }

      const submission =
        await submissionResponse.json();

      // Guardar cada respuesta
      for (const question of questions) {
        const value = answers[question.id];

        let answerScore = 0;
        let selectedOptionId: number | null = null;
        let textAnswer: string | null = null;

        if (question.type === "Open") {
          textAnswer =
            value !== undefined
              ? String(value)
              : null;
        } else {
          selectedOptionId =
            value !== undefined
              ? Number(value)
              : null;

          const selectedOption =
            question.options?.find(
              (option) =>
                option.id === selectedOptionId
            );

          if (selectedOption?.isCorrect) {
            answerScore = Number(
              question.points
            );
          }
        }

        const answerResponse = await fetch(
          `${API}/answers`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: 0,
              submissionId: submission.id,
              questionId: question.id,
              selectedOptionId,
              textAnswer,
              score: answerScore,
            }),
          }
        );

        if (!answerResponse.ok) {
          const errorText =
            await answerResponse.text();

          console.error(errorText);

          throw new Error(
            `No se pudo guardar la respuesta de la pregunta ${question.id}`
          );
        }
      }

      const totalPoints = questions.reduce(
        (sum, question) =>
          sum + Number(question.points),
        0
      );

      alert(
        `Examen enviado correctamente.\n\nResultado automático: ${totalScore} / ${totalPoints} puntos.`
      );

      setAnswers({});
      setTimeLeft(0);
      setSelectedExam(null);

      await loadExams();

      setView("student");
    } catch (error) {
      console.error(error);

      alert(
        "Ocurrió un error al enviar el examen. Revisa la consola si el problema continúa."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // UTILIDADES
  // =========================================================

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const students = users.filter(
    (user) => user.role === "Student"
  );

  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h2>ExamOnline</h2>

          <p className="subtitle">
            Plataforma académica
          </p>
        </div>

        <nav>
          <button onClick={() => setView("home")}>
            Inicio
          </button>

          <button
            onClick={() => setView("teacher")}
          >
            Panel docente
          </button>

          <button
            onClick={() => setView("student")}
          >
            Panel estudiante
          </button>

          <button
            onClick={() => setView("users")}
          >
            Usuarios
          </button>
        </nav>

        <div className="api-status">
          <span className="status-dot"></span>
          API conectada
        </div>
      </aside>

      <main className="content">
        {/* ================= INICIO ================= */}

        {view === "home" && (
          <>
            <header>
              <div>
                <p className="eyebrow">
                  SISTEMA DE EVALUACIÓN
                </p>

                <h1>
                  Aplicación de Exámenes en Línea
                </h1>

                <p>
                  Administración, asignación y
                  resolución de evaluaciones
                  académicas.
                </p>
              </div>
            </header>

            <section className="stats">
              <div className="stat-card">
                <span>Exámenes</span>
                <strong>{exams.length}</strong>
              </div>

              <div className="stat-card">
                <span>Usuarios</span>
                <strong>{users.length}</strong>
              </div>

              <div className="stat-card">
                <span>Estudiantes</span>
                <strong>{students.length}</strong>
              </div>
            </section>

            <section className="panel">
              <h2>Acceso rápido</h2>

              <div className="quick-grid">
                <button
                  className="quick-card"
                  onClick={() =>
                    setView("teacher")
                  }
                >
                  <strong>
                    Panel docente
                  </strong>

                  <span>
                    Crear y administrar
                    evaluaciones.
                  </span>
                </button>

                <button
                  className="quick-card"
                  onClick={() =>
                    setView("student")
                  }
                >
                  <strong>
                    Realizar examen
                  </strong>

                  <span>
                    Acceder a las evaluaciones
                    disponibles.
                  </span>
                </button>
              </div>
            </section>
          </>
        )}

        {/* ================= DOCENTE ================= */}

        {view === "teacher" && (
          <>
            <header>
              <p className="eyebrow">
                DOCENTE
              </p>

              <h1>
                Administración de exámenes
              </h1>
            </header>

            <section className="panel">
              <h2>Nuevo examen</h2>

              <form
                onSubmit={createExam}
                className="form"
              >
                <label>
                  Título

                  <input
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    required
                    placeholder="Ej. Examen de Programación"
                  />
                </label>

                <label>
                  Descripción

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    placeholder="Descripción del examen"
                  />
                </label>

                <label>
                  Duración (minutos)

                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) =>
                      setDuration(
                        Number(e.target.value)
                      )
                    }
                    required
                  />
                </label>

                <button
                  className="primary"
                  type="submit"
                >
                  Crear examen
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>
                Exámenes registrados
              </h2>

              <div className="exam-grid">
                {exams.length === 0 && (
                  <p className="empty">
                    Todavía no existen
                    exámenes.
                  </p>
                )}

                {exams.map((exam) => (
                  <article
                    className="exam-card"
                    key={exam.id}
                  >
                    <div className="exam-id">
                      EXAMEN #{exam.id}
                    </div>

                    <h3>{exam.title}</h3>

                    <p>
                      {exam.description ||
                        "Sin descripción registrada."}
                    </p>

                    <span className="duration">
                      {exam.durationMinutes} minutos
                    </span>

                    <div className="actions">
                      <button
                        className="primary"
                        onClick={() =>
                          openQuestions(exam)
                        }
                      >
                        Preguntas
                      </button>

                      <button
                        className="danger"
                        onClick={() =>
                          deleteExam(exam.id)
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ================= PREGUNTAS ================= */}

        {view === "questions" &&
          selectedExam && (
            <>
              <header>
                <button
                  className="back"
                  onClick={() =>
                    setView("teacher")
                  }
                >
                  ← Volver
                </button>

                <h1>
                  {selectedExam.title}
                </h1>

                <p>
                  Banco de preguntas del
                  examen.
                </p>
              </header>

              <section className="panel">
                <h2>Agregar pregunta</h2>

                <form
                  onSubmit={createQuestion}
                  className="form"
                >
                  <label>
                    Pregunta

                    <textarea
                      value={questionText}
                      onChange={(e) =>
                        setQuestionText(
                          e.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Tipo

                    <select
                      value={questionType}
                      onChange={(e) =>
                        setQuestionType(
                          e.target.value
                        )
                      }
                    >
                      <option value="MultipleChoice">
                        Opción múltiple
                      </option>

                      <option value="TrueFalse">
                        Verdadero / Falso
                      </option>

                      <option value="Open">
                        Pregunta abierta
                      </option>
                    </select>
                  </label>

                  <label>
                    Puntos

                    <input
                      type="number"
                      min="1"
                      value={points}
                      onChange={(e) =>
                        setPoints(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />
                  </label>

                  <button
                    className="primary"
                    type="submit"
                  >
                    Agregar pregunta
                  </button>
                </form>
              </section>

              <section className="panel">
                <h2>Preguntas</h2>

                {questions.length === 0 && (
                  <p className="empty">
                    Todavía no existen
                    preguntas.
                  </p>
                )}

                {questions.map(
                  (question, index) => (
                    <div
                      className="question-admin"
                      key={question.id}
                    >
                      <div>
                        <span className="question-number">
                          Pregunta {index + 1}
                        </span>

                        <h3>
                          {question.text}
                        </h3>

                        <small>
                          {question.type} ·{" "}
                          {question.points}{" "}
                          punto(s)
                        </small>
                      </div>

                      {question.options &&
                        question.options.length >
                          0 && (
                          <ul>
                            {question.options.map(
                              (option) => (
                                <li
                                  key={
                                    option.id
                                  }
                                >
                                  {
                                    option.text
                                  }

                                  {option.isCorrect && (
                                    <strong>
                                      {" "}
                                      ✓ correcta
                                    </strong>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        )}

                      {question.type !==
                        "Open" && (
                        <div className="actions">
                          <button
                            onClick={() =>
                              addOption(
                                question.id,
                                false
                              )
                            }
                          >
                            + Opción
                          </button>

                          <button
                            className="success"
                            onClick={() =>
                              addOption(
                                question.id,
                                true
                              )
                            }
                          >
                            + Respuesta correcta
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </section>
            </>
          )}

        {/* ================= ESTUDIANTE ================= */}

        {view === "student" && (
          <>
            <header>
              <p className="eyebrow">
                ESTUDIANTE
              </p>

              <h1>
                Exámenes disponibles
              </h1>

              <p>
                Selecciona una evaluación
                para comenzar.
              </p>
            </header>

            <section className="exam-grid">
              {exams.length === 0 && (
                <p className="empty">
                  No existen exámenes
                  disponibles.
                </p>
              )}

              {exams.map((exam) => (
                <article
                  className="exam-card"
                  key={exam.id}
                >
                  <div className="exam-id">
                    EVALUACIÓN
                  </div>

                  <h3>{exam.title}</h3>

                  <p>
                    {exam.description ||
                      "Sin descripción."}
                  </p>

                  <span className="duration">
                    Tiempo:{" "}
                    {exam.durationMinutes} min
                  </span>

                  <button
                    className="primary full"
                    onClick={() =>
                      startExam(exam)
                    }
                  >
                    Iniciar examen
                  </button>
                </article>
              ))}
            </section>
          </>
        )}

        {/* ================= REALIZAR EXAMEN ================= */}

        {view === "take" &&
          selectedExam && (
            <>
              <header className="exam-header">
                <div>
                  <p className="eyebrow">
                    EXAMEN EN CURSO
                  </p>

                  <h1>
                    {selectedExam.title}
                  </h1>
                </div>

                <div className="timer">
                  <small>
                    Tiempo restante
                  </small>

                  <strong>
                    {formatTime(timeLeft)}
                  </strong>
                </div>
              </header>

              <section className="panel">
                {questions.length === 0 && (
                  <p>
                    Este examen todavía no
                    tiene preguntas.
                  </p>
                )}

                {questions.map(
                  (question, index) => (
                    <div
                      className="take-question"
                      key={question.id}
                    >
                      <span>
                        Pregunta {index + 1} ·{" "}
                        {question.points} pts
                      </span>

                      <h3>
                        {question.text}
                      </h3>

                      {question.type ===
                      "Open" ? (
                        <textarea
                          placeholder="Escribe tu respuesta..."
                          value={String(
                            answers[
                              question.id
                            ] ?? ""
                          )}
                          onChange={(e) =>
                            setAnswers(
                              (current) => ({
                                ...current,
                                [question.id]:
                                  e.target
                                    .value,
                              })
                            )
                          }
                        />
                      ) : (
                        <div className="options">
                          {question.options?.map(
                            (option) => (
                              <label
                                className="option"
                                key={
                                  option.id
                                }
                              >
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={
                                    option.id
                                  }
                                  checked={
                                    answers[
                                      question
                                        .id
                                    ] ===
                                    option.id
                                  }
                                  onChange={() =>
                                    setAnswers(
                                      (
                                        current
                                      ) => ({
                                        ...current,
                                        [question.id]:
                                          option.id,
                                      })
                                    )
                                  }
                                />

                                {option.text}
                              </label>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}

                {questions.length > 0 && (
                  <button
                    className="primary submit-exam"
                    onClick={finishExam}
                    disabled={submitting}
                  >
                    {submitting
                      ? "Enviando..."
                      : "Finalizar examen"}
                  </button>
                )}
              </section>
            </>
          )}

        {/* ================= USUARIOS ================= */}

        {view === "users" && (
          <>
            <header>
              <p className="eyebrow">
                ADMINISTRACIÓN
              </p>

              <h1>
                Usuarios registrados
              </h1>
            </header>

            <section className="panel">
              <div className="user-list">
                {users.length === 0 && (
                  <p className="empty">
                    No existen usuarios
                    registrados.
                  </p>
                )}

                {users.map((user) => (
                  <div
                    className="user-row"
                    key={user.id}
                  >
                    <div className="avatar">
                      {user.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {user.name}
                      </strong>

                      <span>
                        {user.email}
                      </span>
                    </div>

                    <span className="role">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);