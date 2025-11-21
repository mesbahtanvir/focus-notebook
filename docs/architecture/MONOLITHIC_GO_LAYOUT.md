# Monolithic Go Service Layout for Focus Notebook

**Goal**: Single, well-organized Go backend service that handles all API logic

---

## Recommended Structure

```
focus-notebook/
│
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── hooks/
│   │   ├── package.json
│   │   └── next.config.mjs
│   │
│   ├── mobile/                       # Capacitor iOS
│   │   └── package.json
│   │
│   └── functions/                    # Firebase Cloud Functions (for triggers only)
│       ├── src/
│       │   ├── triggers/            # Firestore/Auth/Storage triggers
│       │   ├── scheduled/           # Cron jobs
│       │   └── index.ts
│       └── package.json
│
├── backend/                          # SINGLE MONOLITHIC GO SERVICE
│   ├── cmd/
│   │   └── server/
│   │       └── main.go              # Single entry point
│   │
│   ├── internal/                     # Private application code
│   │   │
│   │   ├── api/                     # HTTP layer
│   │   │   ├── handlers/            # HTTP handlers organized by domain
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login.go
│   │   │   │   │   ├── signup.go
│   │   │   │   │   └── refresh.go
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── create.go
│   │   │   │   │   ├── update.go
│   │   │   │   │   ├── list.go
│   │   │   │   │   └── delete.go
│   │   │   │   ├── thoughts/
│   │   │   │   ├── investments/
│   │   │   │   ├── spending/
│   │   │   │   ├── goals/
│   │   │   │   └── focus/
│   │   │   │
│   │   │   ├── middleware/          # HTTP middleware
│   │   │   │   ├── auth.go          # JWT authentication
│   │   │   │   ├── cors.go          # CORS handling
│   │   │   │   ├── logging.go       # Request logging
│   │   │   │   ├── ratelimit.go     # Rate limiting
│   │   │   │   └── recovery.go      # Panic recovery
│   │   │   │
│   │   │   ├── routes/              # Route definitions
│   │   │   │   ├── routes.go        # Main router setup
│   │   │   │   ├── auth.go          # Auth routes
│   │   │   │   ├── tasks.go         # Task routes
│   │   │   │   └── [domain routes]
│   │   │   │
│   │   │   └── dto/                 # Data Transfer Objects (API contracts)
│   │   │       ├── task.go
│   │   │       ├── thought.go
│   │   │       ├── investment.go
│   │   │       └── common.go
│   │   │
│   │   ├── domain/                  # Domain/Business Logic Layer
│   │   │   ├── tasks/
│   │   │   │   ├── service.go       # Task business logic
│   │   │   │   ├── repository.go    # Task repository interface
│   │   │   │   ├── model.go         # Task domain model
│   │   │   │   └── errors.go        # Domain-specific errors
│   │   │   ├── thoughts/
│   │   │   │   ├── service.go
│   │   │   │   ├── repository.go
│   │   │   │   ├── model.go
│   │   │   │   └── processor.go     # AI thought processing
│   │   │   ├── investments/
│   │   │   │   ├── service.go
│   │   │   │   ├── repository.go
│   │   │   │   ├── model.go
│   │   │   │   └── calculator.go    # Portfolio calculations
│   │   │   ├── spending/
│   │   │   ├── goals/
│   │   │   ├── focus/
│   │   │   ├── auth/
│   │   │   └── shared/              # Shared domain logic
│   │   │       ├── entitygraph.go
│   │   │       └── events.go
│   │   │
│   │   ├── infrastructure/          # Infrastructure Layer
│   │   │   ├── firestore/           # Firestore implementations
│   │   │   │   ├── client.go        # Firestore client setup
│   │   │   │   ├── tasks.go         # Task repository impl
│   │   │   │   ├── thoughts.go
│   │   │   │   ├── investments.go
│   │   │   │   ├── users.go
│   │   │   │   └── transaction.go   # Transaction helper
│   │   │   │
│   │   │   ├── firebase/            # Firebase services
│   │   │   │   ├── auth.go          # Firebase Auth
│   │   │   │   └── storage.go       # Firebase Storage
│   │   │   │
│   │   │   ├── cache/               # Caching layer
│   │   │   │   ├── redis.go         # Redis client (optional)
│   │   │   │   └── memory.go        # In-memory cache
│   │   │   │
│   │   │   ├── ai/                  # AI service integrations
│   │   │   │   ├── openai.go        # OpenAI client
│   │   │   │   └── anthropic.go     # Anthropic client
│   │   │   │
│   │   │   ├── external/            # External API clients
│   │   │   │   ├── plaid.go         # Plaid integration
│   │   │   │   ├── stripe.go        # Stripe integration
│   │   │   │   └── alphavantage.go  # Stock data
│   │   │   │
│   │   │   └── queue/               # Background job queue
│   │   │       ├── worker.go
│   │   │       └── jobs.go
│   │   │
│   │   ├── config/                  # Configuration
│   │   │   ├── config.go            # Config struct
│   │   │   ├── env.go               # Environment loading
│   │   │   └── firebase.go          # Firebase config
│   │   │
│   │   └── platform/                # Platform utilities
│   │       ├── logger/              # Structured logging
│   │       │   └── logger.go
│   │       ├── errors/              # Error handling
│   │       │   ├── errors.go
│   │       │   └── codes.go
│   │       ├── validator/           # Input validation
│   │       │   └── validator.go
│   │       ├── crypto/              # Encryption utilities
│   │       │   └── crypto.go
│   │       └── utils/               # Common utilities
│   │           ├── time.go
│   │           ├── strings.go
│   │           └── pagination.go
│   │
│   ├── pkg/                         # Public libraries (can be imported by other projects)
│   │   ├── httpclient/              # Reusable HTTP client
│   │   ├── jsonutil/                # JSON utilities
│   │   └── testutil/                # Testing utilities
│   │
│   ├── migrations/                  # Database migrations (if needed)
│   │   └── firestore/
│   │
│   ├── scripts/                     # Build/deploy scripts
│   │   ├── build.sh
│   │   ├── deploy.sh
│   │   └── generate-types.sh        # Generate types from TypeScript
│   │
│   ├── deployments/                 # Deployment configs
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── k8s/                     # Kubernetes manifests (if needed)
│   │
│   ├── api/                         # API documentation
│   │   └── openapi.yaml             # OpenAPI/Swagger spec
│   │
│   ├── tests/                       # Integration/E2E tests
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── go.mod                       # Go module definition
│   ├── go.sum                       # Dependency lock file
│   ├── Makefile                     # Build commands
│   ├── .env.example                 # Environment template
│   └── README.md
│
├── packages/                        # Shared packages (TypeScript + Go types)
│   └── shared-types/
│       ├── typescript/              # TypeScript definitions
│       │   └── src/
│       └── golang/                  # Generated Go types
│           └── types/
│
├── docs/                            # Documentation
├── scripts/                         # Shared scripts
└── package.json                     # Root workspace
```

---

## Key Design Principles

### 1. **Layered Architecture (Clean Architecture)**

```
┌─────────────────────────────────────────┐
│   API Layer (handlers, middleware)      │  ← HTTP/REST interface
├─────────────────────────────────────────┤
│   Domain Layer (business logic)         │  ← Core business rules
├─────────────────────────────────────────┤
│   Infrastructure Layer (repositories)   │  ← Firestore, external APIs
└─────────────────────────────────────────┘
```

**Benefits**:
- Clean separation of concerns
- Easy to test (mock infrastructure)
- Business logic independent of database
- Can swap Firestore for Postgres later if needed

---

### 2. **Domain-Driven Design (DDD)**

Each domain (`tasks`, `thoughts`, `investments`, etc.) has:

```
domain/tasks/
├── service.go        # Business logic
├── repository.go     # Interface (what we need)
├── model.go          # Domain model (Task struct)
└── errors.go         # Domain errors
```

**Repository Interface** (domain layer):
```go
// internal/domain/tasks/repository.go
package tasks

type Repository interface {
    Create(ctx context.Context, task *Task) error
    GetByID(ctx context.Context, id string) (*Task, error)
    List(ctx context.Context, userID string, filter Filter) ([]*Task, error)
    Update(ctx context.Context, task *Task) error
    Delete(ctx context.Context, id string) error
}
```

**Repository Implementation** (infrastructure layer):
```go
// internal/infrastructure/firestore/tasks.go
package firestore

type TaskRepository struct {
    client *firestore.Client
}

func (r *TaskRepository) Create(ctx context.Context, task *tasks.Task) error {
    // Firestore-specific implementation
}
```

---

### 3. **HTTP Handlers are Thin**

Handlers only:
1. Parse request
2. Validate input
3. Call domain service
4. Return response

```go
// internal/api/handlers/tasks/create.go
package tasks

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
    // 1. Parse request
    var req dto.CreateTaskRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, errors.ErrInvalidInput)
        return
    }

    // 2. Validate
    if err := h.validator.Validate(req); err != nil {
        respondError(w, err)
        return
    }

    // 3. Get user from context
    userID := middleware.GetUserID(r.Context())

    // 4. Call domain service
    task, err := h.taskService.CreateTask(r.Context(), userID, req)
    if err != nil {
        respondError(w, err)
        return
    }

    // 5. Return response
    respondJSON(w, http.StatusCreated, task)
}
```

---

### 4. **Service Layer Contains Business Logic**

```go
// internal/domain/tasks/service.go
package tasks

type Service struct {
    repo           Repository
    entityGraph    entitygraph.Service
    notifications  notifications.Service
    logger         logger.Logger
}

func (s *Service) CreateTask(ctx context.Context, userID string, req dto.CreateTaskRequest) (*Task, error) {
    // Business logic here
    task := &Task{
        ID:          generateID(),
        UserID:      userID,
        Title:       req.Title,
        Status:      StatusPending,
        Priority:    req.Priority,
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    // Validate business rules
    if err := s.validateTask(task); err != nil {
        return nil, err
    }

    // Save to database
    if err := s.repo.Create(ctx, task); err != nil {
        s.logger.Error("failed to create task", "error", err)
        return nil, err
    }

    // Create entity graph relationship (if linked)
    if req.LinkedGoalID != "" {
        s.entityGraph.Link(ctx, task.ID, req.LinkedGoalID, "linked-to")
    }

    // Send notification (async)
    go s.notifications.TaskCreated(userID, task)

    return task, nil
}
```

---

## Detailed Example: Tasks Domain

### Domain Model (`internal/domain/tasks/model.go`)

```go
package tasks

import "time"

type Task struct {
    ID          string
    UserID      string
    Title       string
    Description string
    Status      TaskStatus
    Priority    Priority
    DueDate     *time.Time
    Tags        []string
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

type TaskStatus string

const (
    StatusPending    TaskStatus = "pending"
    StatusInProgress TaskStatus = "in_progress"
    StatusCompleted  TaskStatus = "completed"
    StatusCancelled  TaskStatus = "cancelled"
)

type Priority string

const (
    PriorityLow    Priority = "low"
    PriorityMedium Priority = "medium"
    PriorityHigh   Priority = "high"
)
```

### Repository Interface (`internal/domain/tasks/repository.go`)

```go
package tasks

import "context"

type Repository interface {
    Create(ctx context.Context, task *Task) error
    GetByID(ctx context.Context, id string) (*Task, error)
    List(ctx context.Context, userID string, filter Filter) ([]*Task, error)
    Update(ctx context.Context, task *Task) error
    Delete(ctx context.Context, id string) error

    // Complex queries
    GetOverdueTasks(ctx context.Context, userID string) ([]*Task, error)
    GetTasksByTag(ctx context.Context, userID string, tag string) ([]*Task, error)
}

type Filter struct {
    Status   *TaskStatus
    Priority *Priority
    Tags     []string
    Limit    int
    Offset   int
}
```

### Service (`internal/domain/tasks/service.go`)

```go
package tasks

type Service struct {
    repo Repository
    // Other dependencies
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) CreateTask(ctx context.Context, userID string, title string) (*Task, error) {
    task := &Task{
        ID:        generateID(),
        UserID:    userID,
        Title:     title,
        Status:    StatusPending,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }

    return task, s.repo.Create(ctx, task)
}

func (s *Service) CompleteTask(ctx context.Context, taskID string) error {
    task, err := s.repo.GetByID(ctx, taskID)
    if err != nil {
        return err
    }

    task.Status = StatusCompleted
    task.UpdatedAt = time.Now()

    return s.repo.Update(ctx, task)
}
```

### Firestore Repository (`internal/infrastructure/firestore/tasks.go`)

```go
package firestore

import (
    "context"
    "cloud.google.com/go/firestore"
    "focus-notebook/internal/domain/tasks"
)

type TaskRepository struct {
    client *firestore.Client
}

func NewTaskRepository(client *firestore.Client) *TaskRepository {
    return &TaskRepository{client: client}
}

func (r *TaskRepository) Create(ctx context.Context, task *tasks.Task) error {
    _, err := r.client.Collection("tasks").Doc(task.ID).Set(ctx, task)
    return err
}

func (r *TaskRepository) GetByID(ctx context.Context, id string) (*tasks.Task, error) {
    doc, err := r.client.Collection("tasks").Doc(id).Get(ctx)
    if err != nil {
        return nil, err
    }

    var task tasks.Task
    if err := doc.DataTo(&task); err != nil {
        return nil, err
    }

    return &task, nil
}

func (r *TaskRepository) List(ctx context.Context, userID string, filter tasks.Filter) ([]*tasks.Task, error) {
    query := r.client.Collection("tasks").Where("UserID", "==", userID)

    if filter.Status != nil {
        query = query.Where("Status", "==", *filter.Status)
    }

    if filter.Limit > 0 {
        query = query.Limit(filter.Limit)
    }

    docs, err := query.Documents(ctx).GetAll()
    if err != nil {
        return nil, err
    }

    result := make([]*tasks.Task, len(docs))
    for i, doc := range docs {
        var task tasks.Task
        doc.DataTo(&task)
        result[i] = &task
    }

    return result, nil
}
```

### HTTP Handler (`internal/api/handlers/tasks/handler.go`)

```go
package tasks

import (
    "encoding/json"
    "net/http"
    "focus-notebook/internal/api/dto"
    "focus-notebook/internal/domain/tasks"
)

type Handler struct {
    service *tasks.Service
}

func NewHandler(service *tasks.Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
    var req dto.CreateTaskRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    userID := r.Context().Value("userID").(string)

    task, err := h.service.CreateTask(r.Context(), userID, req.Title)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteStatus(http.StatusCreated)
    json.NewEncoder(w).Encode(task)
}

func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

---

## Main Entry Point

### `cmd/server/main.go`

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    firebase "firebase.google.com/go/v4"
    "focus-notebook/internal/api/routes"
    "focus-notebook/internal/config"
    "focus-notebook/internal/domain/tasks"
    "focus-notebook/internal/infrastructure/firestore"
    "focus-notebook/internal/platform/logger"
)

func main() {
    // Load configuration
    cfg := config.Load()

    // Initialize logger
    log := logger.New(cfg.Environment)

    // Initialize Firebase
    ctx := context.Background()
    app, err := firebase.NewApp(ctx, &firebase.Config{
        ProjectID: cfg.Firebase.ProjectID,
    })
    if err != nil {
        log.Fatal("failed to initialize firebase", "error", err)
    }

    // Initialize Firestore
    firestoreClient, err := app.Firestore(ctx)
    if err != nil {
        log.Fatal("failed to initialize firestore", "error", err)
    }
    defer firestoreClient.Close()

    // Initialize repositories
    taskRepo := firestore.NewTaskRepository(firestoreClient)
    // ... other repositories

    // Initialize services
    taskService := tasks.NewService(taskRepo)
    // ... other services

    // Initialize router
    router := routes.NewRouter(
        taskService,
        // ... other services
    )

    // Create HTTP server
    srv := &http.Server{
        Addr:         ":" + cfg.Port,
        Handler:      router,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server
    go func() {
        log.Info("server starting", "port", cfg.Port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("server failed", "error", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Info("server shutting down")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("server forced to shutdown", "error", err)
    }

    log.Info("server exited")
}
```

---

## Router Setup

### `internal/api/routes/routes.go`

```go
package routes

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    chimiddleware "github.com/go-chi/chi/v5/middleware"

    "focus-notebook/internal/api/handlers/tasks"
    "focus-notebook/internal/api/handlers/thoughts"
    "focus-notebook/internal/api/handlers/investments"
    "focus-notebook/internal/api/middleware"
    tasksDomain "focus-notebook/internal/domain/tasks"
)

func NewRouter(
    taskService *tasksDomain.Service,
    // ... other services
) http.Handler {
    r := chi.NewRouter()

    // Global middleware
    r.Use(chimiddleware.RequestID)
    r.Use(chimiddleware.RealIP)
    r.Use(chimiddleware.Logger)
    r.Use(chimiddleware.Recoverer)
    r.Use(middleware.CORS)

    // Health check
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // API routes
    r.Route("/api", func(r chi.Router) {
        // Public routes
        r.Group(func(r chi.Router) {
            r.Post("/auth/login", authHandler.Login)
            r.Post("/auth/signup", authHandler.Signup)
        })

        // Protected routes
        r.Group(func(r chi.Router) {
            r.Use(middleware.Authenticate)

            // Tasks
            taskHandler := tasks.NewHandler(taskService)
            r.Route("/tasks", func(r chi.Router) {
                r.Get("/", taskHandler.ListTasks)
                r.Post("/", taskHandler.CreateTask)
                r.Get("/{id}", taskHandler.GetTask)
                r.Put("/{id}", taskHandler.UpdateTask)
                r.Delete("/{id}", taskHandler.DeleteTask)
            })

            // Thoughts
            r.Route("/thoughts", func(r chi.Router) {
                // ...
            })

            // Investments
            r.Route("/investments", func(r chi.Router) {
                // ...
            })

            // Spending
            r.Route("/spending", func(r chi.Router) {
                // ...
            })

            // Goals
            r.Route("/goals", func(r chi.Router) {
                // ...
            })

            // Focus sessions
            r.Route("/focus", func(r chi.Router) {
                // ...
            })
        })
    })

    return r
}
```

---

## Why Monolith for Your Use Case?

### ✅ **Advantages**

1. **Simpler Deployment**
   - Single binary to deploy
   - One server to manage
   - Easier rollbacks

2. **Better Performance**
   - No network calls between services
   - Shared memory/cache
   - Database transactions across domains

3. **Easier Development**
   - Single codebase to navigate
   - Refactoring is easier
   - Shared code is trivial

4. **Lower Costs**
   - One server instance
   - Less infrastructure complexity
   - Simpler monitoring

5. **Your Scale**
   - You're not Netflix
   - Monolith can handle millions of requests
   - Can always split later if needed

### 🎯 **When to Consider Microservices**

- Different teams owning different services
- Need independent scaling (e.g., AI processing needs 10x resources)
- Different deployment schedules
- **Not your case right now!**

---

## Communication: Frontend ↔ Backend

### Frontend calls Go backend directly

```typescript
// apps/web/src/lib/api/tasks.ts
export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const response = await fetch('http://localhost:8080/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }

  return response.json();
}
```

### Firebase Functions for Triggers Only

```typescript
// apps/functions/src/triggers/firestore.ts

// Use functions for database triggers that Go can't handle
export const onTaskCreated = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, context) => {
    // Send push notification
    // Update analytics
    // Trigger webhooks
  });

// Use functions for scheduled jobs
export const dailyPortfolioSnapshot = functions.pubsub
  .schedule('0 0 * * *')
  .onRun(async (context) => {
    // Call Go backend API
    await fetch('http://your-go-backend/api/internal/snapshots', {
      method: 'POST',
    });
  });
```

---

## Build & Deploy

### Makefile

```makefile
.PHONY: build run test docker-build

build:
	go build -o bin/server cmd/server/main.go

run:
	go run cmd/server/main.go

test:
	go test ./...

test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

lint:
	golangci-lint run

docker-build:
	docker build -t focus-notebook-backend .

docker-run:
	docker run -p 8080:8080 focus-notebook-backend

deploy:
	# Deploy to Cloud Run, App Engine, or your server
	gcloud run deploy focus-notebook-api --source .
```

### Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/.env.production .env

EXPOSE 8080

CMD ["./server"]
```

---

## Development Workflow

```bash
# Terminal 1: Go backend
cd backend
make run

# Terminal 2: Next.js frontend
cd apps/web
npm run dev

# Terminal 3: Firebase functions (for triggers)
cd apps/functions
npm run serve
```

---

## Type Sharing (TypeScript ↔ Go)

### Option 1: Manual (Simple, what you have now)
- Define types in both places
- Keep them in sync manually

### Option 2: Generate Go from TypeScript
```bash
# Use quicktype
quicktype -s schema packages/shared-types/typescript/task.ts -o backend/internal/api/dto/task.go
```

### Option 3: Generate TypeScript from Go (Recommended)
```go
// Use go-swagger or swaggo
// Generate OpenAPI spec from Go
// Generate TypeScript client from OpenAPI
```

---

## Summary: Your Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)               │
│              apps/web/ - React/TypeScript           │
└────────────────────┬────────────────────────────────┘
                     │ HTTP REST API
                     ↓
┌─────────────────────────────────────────────────────┐
│              Backend (Monolithic Go)                │
│                    backend/                         │
│  ┌─────────────────────────────────────────────┐   │
│  │  API Layer (handlers, middleware, routes)   │   │
│  ├─────────────────────────────────────────────┤   │
│  │  Domain Layer (business logic services)     │   │
│  ├─────────────────────────────────────────────┤   │
│  │  Infrastructure (Firestore, external APIs)  │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│            Firebase (Auth, Firestore, Storage)      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         Firebase Functions (Triggers only)          │
│         apps/functions/ - TypeScript                │
│  - Firestore triggers                               │
│  - Scheduled jobs                                   │
│  - Auth triggers                                    │
└─────────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ Single Go monolith handles all API logic
- ✅ Frontend calls Go backend directly
- ✅ Firebase Functions only for triggers/scheduled jobs
- ✅ Clean architecture within the monolith
- ✅ Domain-driven design for organization

---

## Next Steps

1. **Reorganize existing Go code** to this structure
2. **Define domain boundaries** (tasks, thoughts, investments, etc.)
3. **Implement one domain fully** as a template
4. **Migrate other domains** following the pattern
5. **Update frontend** to call Go backend

**Want me to help implement this?**
