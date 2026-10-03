using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// SERVICIOS
// ======================================================

builder.Services.AddDbContext<AppDb>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ======================================================
// MIDDLEWARE
// ======================================================

app.UseCors();

app.UseSwagger();
app.UseSwaggerUI();

// ======================================================
// HEALTH
// ======================================================

app.MapGet("/health", () =>
    Results.Ok(new
    {
        status = "ok",
        application = "Online Exams API"
    }));

// ======================================================
// USUARIOS
// ======================================================

app.MapGet("/api/users", async (AppDb db) =>
{
    var users = await db.Users
        .AsNoTracking()
        .OrderBy(x => x.Id)
        .ToListAsync();

    return Results.Ok(users);
});

app.MapGet("/api/users/{id:int}", async (int id, AppDb db) =>
{
    var user = await db.Users
        .AsNoTracking()
        .FirstOrDefaultAsync(x => x.Id == id);

    return user is null
        ? Results.NotFound()
        : Results.Ok(user);
});

app.MapPost("/api/users", async (User user, AppDb db) =>
{
    if (string.IsNullOrWhiteSpace(user.Name))
        return Results.BadRequest("El nombre es obligatorio.");

    if (string.IsNullOrWhiteSpace(user.Email))
        return Results.BadRequest("El correo es obligatorio.");

    if (user.Role != "Teacher" && user.Role != "Student")
        return Results.BadRequest(
            "El rol debe ser Teacher o Student."
        );

    var emailExists = await db.Users
        .AnyAsync(x => x.Email == user.Email);

    if (emailExists)
        return Results.BadRequest(
            "Ya existe un usuario con ese correo."
        );

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/users/{user.Id}",
        user
    );
});

// ======================================================
// EXÁMENES
// ======================================================

app.MapGet("/api/exams", async (AppDb db) =>
{
    var exams = await db.Exams
        .AsNoTracking()
        .OrderBy(x => x.Id)
        .ToListAsync();

    return Results.Ok(exams);
});

app.MapGet("/api/exams/{id:int}", async (int id, AppDb db) =>
{
    var exam = await db.Exams
        .AsNoTracking()
        .Include(x => x.Questions)
            .ThenInclude(x => x.Options)
        .FirstOrDefaultAsync(x => x.Id == id);

    return exam is null
        ? Results.NotFound()
        : Results.Ok(exam);
});

app.MapPost("/api/exams", async (Exam exam, AppDb db) =>
{
    if (string.IsNullOrWhiteSpace(exam.Title))
        return Results.BadRequest(
            "El título es obligatorio."
        );

    if (exam.DurationMinutes <= 0)
        return Results.BadRequest(
            "La duración debe ser mayor que cero."
        );

    db.Exams.Add(exam);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/exams/{exam.Id}",
        exam
    );
});

app.MapPut("/api/exams/{id:int}", async (
    int id,
    Exam request,
    AppDb db) =>
{
    var exam = await db.Exams.FindAsync(id);

    if (exam is null)
        return Results.NotFound();

    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(
            "El título es obligatorio."
        );

    if (request.DurationMinutes <= 0)
        return Results.BadRequest(
            "La duración debe ser mayor que cero."
        );

    exam.Title = request.Title;
    exam.Description = request.Description;
    exam.DurationMinutes = request.DurationMinutes;

    await db.SaveChangesAsync();

    return Results.Ok(exam);
});

app.MapDelete("/api/exams/{id:int}", async (
    int id,
    AppDb db) =>
{
    var exam = await db.Exams.FindAsync(id);

    if (exam is null)
        return Results.NotFound();

    db.Exams.Remove(exam);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

// ======================================================
// PREGUNTAS
// ======================================================

app.MapPost("/api/questions", async (
    Question question,
    AppDb db) =>
{
    var examExists = await db.Exams
        .AnyAsync(x => x.Id == question.ExamId);

    if (!examExists)
        return Results.BadRequest(
            "El examen indicado no existe."
        );

    if (string.IsNullOrWhiteSpace(question.Text))
        return Results.BadRequest(
            "El texto de la pregunta es obligatorio."
        );

    var validTypes = new[]
    {
        "MultipleChoice",
        "TrueFalse",
        "Open"
    };

    if (!validTypes.Contains(question.Type))
        return Results.BadRequest(
            "Tipo válido: MultipleChoice, TrueFalse u Open."
        );

    if (question.Points <= 0)
        return Results.BadRequest(
            "Los puntos deben ser mayores que cero."
        );

    db.Questions.Add(question);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/questions/{question.Id}",
        question
    );
});

app.MapGet("/api/questions/{examId:int}", async (
    int examId,
    AppDb db) =>
{
    var questions = await db.Questions
        .Where(x => x.ExamId == examId)
        .Include(x => x.Options)
        .AsNoTracking()
        .OrderBy(x => x.Id)
        .ToListAsync();

    return Results.Ok(questions);
});

// ======================================================
// OPCIONES DE PREGUNTA
// ======================================================

app.MapPost("/api/question-options", async (
    QuestionOption option,
    AppDb db) =>
{
    var question = await db.Questions
        .FindAsync(option.QuestionId);

    if (question is null)
        return Results.BadRequest(
            "La pregunta indicada no existe."
        );

    if (question.Type == "Open")
        return Results.BadRequest(
            "Las preguntas abiertas no tienen opciones."
        );

    if (string.IsNullOrWhiteSpace(option.Text))
        return Results.BadRequest(
            "El texto de la opción es obligatorio."
        );

    db.QuestionOptions.Add(option);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/question-options/{option.Id}",
        option
    );
});

// ======================================================
// ASIGNACIÓN DE EXÁMENES
// ======================================================

app.MapPost("/api/exam-assignments", async (
    ExamAssignment assignment,
    AppDb db) =>
{
    var examExists = await db.Exams
        .AnyAsync(x => x.Id == assignment.ExamId);

    if (!examExists)
        return Results.BadRequest(
            "El examen no existe."
        );

    var student = await db.Users
        .FirstOrDefaultAsync(
            x => x.Id == assignment.UserId
        );

    if (student is null)
        return Results.BadRequest(
            "El usuario no existe."
        );

    if (student.Role != "Student")
        return Results.BadRequest(
            "El examen solo puede asignarse a estudiantes."
        );

    var alreadyAssigned =
        await db.ExamAssignments.AnyAsync(x =>
            x.ExamId == assignment.ExamId &&
            x.UserId == assignment.UserId);

    if (alreadyAssigned)
        return Results.BadRequest(
            "El examen ya está asignado al estudiante."
        );

    assignment.AssignedAt = DateTime.UtcNow;

    db.ExamAssignments.Add(assignment);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/exam-assignments/{assignment.Id}",
        assignment
    );
});

app.MapGet("/api/exam-assignments/user/{userId:int}",
    async (int userId, AppDb db) =>
{
    var assignments = await db.ExamAssignments
        .Where(x => x.UserId == userId)
        .Include(x => x.Exam)
        .AsNoTracking()
        .ToListAsync();

    return Results.Ok(assignments);
});

// ======================================================
// ENVÍO DE EXAMEN
// ======================================================

app.MapPost("/api/submissions", async (
    Submission submission,
    AppDb db) =>
{
    var examExists = await db.Exams
        .AnyAsync(x => x.Id == submission.ExamId);

    if (!examExists)
        return Results.BadRequest(
            "El examen no existe."
        );

    var userExists = await db.Users
        .AnyAsync(x => x.Id == submission.UserId);

    if (!userExists)
        return Results.BadRequest(
            "El usuario no existe."
        );

    submission.SubmittedAt = DateTime.UtcNow;

    db.Submissions.Add(submission);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/submissions/{submission.Id}",
        submission
    );
});

// ======================================================
// RESPUESTAS
// ======================================================

app.MapPost("/api/answers", async (
    Answer answer,
    AppDb db) =>
{
    var submissionExists = await db.Submissions
        .AnyAsync(x => x.Id == answer.SubmissionId);

    if (!submissionExists)
        return Results.BadRequest(
            "El envío indicado no existe."
        );

    var questionExists = await db.Questions
        .AnyAsync(x => x.Id == answer.QuestionId);

    if (!questionExists)
        return Results.BadRequest(
            "La pregunta indicada no existe."
        );

    db.Answers.Add(answer);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/answers/{answer.Id}",
        answer
    );
});

// ======================================================
// RESULTADOS
// ======================================================

app.MapGet("/api/results/{userId:int}", async (
    int userId,
    AppDb db) =>
{
    var results = await db.Submissions
        .Where(x => x.UserId == userId)
        .Include(x => x.Exam)
        .Include(x => x.Answers)
        .AsNoTracking()
        .OrderByDescending(x => x.SubmittedAt)
        .ToListAsync();

    return Results.Ok(results);
});

app.Run();

// ======================================================
// DATABASE CONTEXT
// ======================================================

class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<Question> Questions => Set<Question>();

    public DbSet<QuestionOption> QuestionOptions =>
        Set<QuestionOption>();

    public DbSet<ExamAssignment> ExamAssignments =>
        Set<ExamAssignment>();

    public DbSet<Submission> Submissions =>
        Set<Submission>();

    public DbSet<Answer> Answers => Set<Answer>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        // Usuario
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email)
            .IsUnique();

        // Exam -> Questions
        modelBuilder.Entity<Question>()
            .HasOne(x => x.Exam)
            .WithMany(x => x.Questions)
            .HasForeignKey(x => x.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        // Question -> Options
        modelBuilder.Entity<QuestionOption>()
            .HasOne(x => x.Question)
            .WithMany(x => x.Options)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // ExamAssignment -> Exam
        modelBuilder.Entity<ExamAssignment>()
            .HasOne(x => x.Exam)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        // ExamAssignment -> User
        modelBuilder.Entity<ExamAssignment>()
            .HasOne(x => x.User)
            .WithMany(x => x.ExamAssignments)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Evita asignaciones duplicadas
        modelBuilder.Entity<ExamAssignment>()
            .HasIndex(x => new
            {
                x.ExamId,
                x.UserId
            })
            .IsUnique();

        // Submission -> Exam
        modelBuilder.Entity<Submission>()
            .HasOne(x => x.Exam)
            .WithMany(x => x.Submissions)
            .HasForeignKey(x => x.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        // Submission -> User
        modelBuilder.Entity<Submission>()
            .HasOne(x => x.User)
            .WithMany(x => x.Submissions)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Answer -> Submission
        modelBuilder.Entity<Answer>()
            .HasOne(x => x.Submission)
            .WithMany(x => x.Answers)
            .HasForeignKey(x => x.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Answer -> Question
        modelBuilder.Entity<Answer>()
            .HasOne(x => x.Question)
            .WithMany(x => x.Answers)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Answer -> SelectedOption
        modelBuilder.Entity<Answer>()
            .HasOne(x => x.SelectedOption)
            .WithMany()
            .HasForeignKey(x => x.SelectedOptionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

// ======================================================
// MODELOS
// ======================================================

class User
{
    public int Id { get; set; }

    public string Name { get; set; } = "";

    public string Email { get; set; } = "";

    public string Role { get; set; } = "Student";

    public List<ExamAssignment> ExamAssignments { get; set; }
        = new();

    public List<Submission> Submissions { get; set; }
        = new();
}

class Exam
{
    public int Id { get; set; }

    public string Title { get; set; } = "";

    public string Description { get; set; } = "";

    public int DurationMinutes { get; set; } = 60;

    public List<Question> Questions { get; set; }
        = new();

    public List<ExamAssignment> Assignments { get; set; }
        = new();

    public List<Submission> Submissions { get; set; }
        = new();
}

class Question
{
    public int Id { get; set; }

    public int ExamId { get; set; }

    public string Text { get; set; } = "";

    public string Type { get; set; } = "MultipleChoice";

    public decimal Points { get; set; } = 1;

    public Exam? Exam { get; set; }

    public List<QuestionOption> Options { get; set; }
        = new();

    public List<Answer> Answers { get; set; }
        = new();
}

class QuestionOption
{
    public int Id { get; set; }

    public int QuestionId { get; set; }

    public string Text { get; set; } = "";

    public bool IsCorrect { get; set; }

    public Question? Question { get; set; }
}

class ExamAssignment
{
    public int Id { get; set; }

    public int ExamId { get; set; }

    public int UserId { get; set; }

    public DateTime AssignedAt { get; set; }
        = DateTime.UtcNow;

    public Exam? Exam { get; set; }

    public User? User { get; set; }
}

class Submission
{
    public int Id { get; set; }

    public int ExamId { get; set; }

    public int UserId { get; set; }

    public DateTime StartedAt { get; set; }
        = DateTime.UtcNow;

    public DateTime SubmittedAt { get; set; }

    public decimal Score { get; set; }

    public Exam? Exam { get; set; }

    public User? User { get; set; }

    public List<Answer> Answers { get; set; }
        = new();
}

class Answer
{
    public int Id { get; set; }

    public int SubmissionId { get; set; }

    public int QuestionId { get; set; }

    public int? SelectedOptionId { get; set; }

    public string? TextAnswer { get; set; }

    public decimal Score { get; set; }

    public Submission? Submission { get; set; }

    public Question? Question { get; set; }

    public QuestionOption? SelectedOption { get; set; }
}