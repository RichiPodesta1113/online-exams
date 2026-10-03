# Diagrama de clases
```mermaid
classDiagram
class Exam
class Question
class Submission
Exam "1" --> "*" Question
Exam "1" --> "*" Submission
```
