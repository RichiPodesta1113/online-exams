using Microsoft.EntityFrameworkCore;
var builder=WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDb>(o=>o.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddCors(o=>o.AddDefaultPolicy(p=>p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddEndpointsApiExplorer(); builder.Services.AddSwaggerGen();
var app=builder.Build(); app.UseCors(); app.UseSwagger(); app.UseSwaggerUI();
app.MapGet("/api/exams", async(AppDb db)=>await db.Exams.AsNoTracking().ToListAsync());
app.MapGet("/api/exams/{id:int}", async(int id,AppDb db)=>await db.Exams.FindAsync(id) is Exam e?Results.Ok(e):Results.NotFound());
app.MapPost("/api/exams", async(Exam e,AppDb db)=>{if(string.IsNullOrWhiteSpace(e.Title)||e.DurationMinutes<=0)return Results.BadRequest("Título y duración son obligatorios.");db.Exams.Add(e);await db.SaveChangesAsync();return Results.Created($"/api/exams/{e.Id}",e);});
app.MapPost("/api/questions",async(Question q,AppDb db)=>{db.Questions.Add(q);await db.SaveChangesAsync();return Results.Created($"/api/questions/{q.Id}",q);});
app.MapGet("/api/questions/{examId:int}",async(int examId,AppDb db)=>await db.Questions.Where(x=>x.ExamId==examId).AsNoTracking().ToListAsync());
app.MapPost("/api/submissions",async(Submission s,AppDb db)=>{s.SubmittedAt=DateTime.UtcNow;db.Submissions.Add(s);await db.SaveChangesAsync();return Results.Ok(s);});
app.MapGet("/api/results/{userId}",async(string userId,AppDb db)=>await db.Submissions.Where(x=>x.UserId==userId).AsNoTracking().ToListAsync());
app.MapGet("/health",()=>Results.Ok(new{status="ok"})); app.Run();
class AppDb(DbContextOptions<AppDb> o):DbContext(o){public DbSet<Exam> Exams=>Set<Exam>();public DbSet<Question> Questions=>Set<Question>();public DbSet<Submission> Submissions=>Set<Submission>();}
class Exam{public int Id{get;set;}public string Title{get;set;}="";public string Description{get;set;}="";public int DurationMinutes{get;set;}=60;}
class Question{public int Id{get;set;}public int ExamId{get;set;}public string Text{get;set;}="";public string Type{get;set;}="MultipleChoice";public decimal Points{get;set;}=1;public string? OptionsJson{get;set;}public string? CorrectAnswer{get;set;}}
class Submission{public int Id{get;set;}public int ExamId{get;set;}public string UserId{get;set;}="";public decimal Score{get;set;}public DateTime SubmittedAt{get;set;}}
