# Diccionario de datos

## Users

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador del usuario |
| Name | string | Nombre completo |
| Email | string | Correo electrónico único |
| Role | string | Teacher o Student |

## Exams

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador del examen |
| Title | string | Título |
| Description | string | Descripción |
| DurationMinutes | int | Duración máxima en minutos |

## Questions

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador |
| ExamId | int | Examen asociado |
| Text | string | Texto de la pregunta |
| Type | string | MultipleChoice, TrueFalse u Open |
| Points | decimal | Puntaje máximo |

## QuestionOptions

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador |
| QuestionId | int | Pregunta asociada |
| Text | string | Texto de la opción |
| IsCorrect | bool | Indica si es correcta |

## ExamAssignments

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador |
| ExamId | int | Examen asignado |
| UserId | int | Estudiante asignado |
| AssignedAt | datetime | Fecha de asignación |

## Submissions

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador del intento |
| ExamId | int | Examen realizado |
| UserId | int | Estudiante |
| StartedAt | datetime | Inicio del examen |
| SubmittedAt | datetime | Entrega del examen |
| Score | decimal | Puntaje obtenido |

## Answers

| Campo | Tipo | Descripción |
|---|---|---|
| Id | int | Identificador |
| SubmissionId | int | Intento asociado |
| QuestionId | int | Pregunta respondida |
| SelectedOptionId | int nullable | Opción seleccionada |
| TextAnswer | string nullable | Respuesta abierta |
| Score | decimal | Puntaje obtenido |