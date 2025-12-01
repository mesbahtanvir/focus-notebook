package firebase

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/storage"
	"google.golang.org/api/option"
)

// Admin wraps Firebase Admin SDK clients
type Admin struct {
	App       *firebase.App
	Auth      *auth.Client
	Firestore *firestore.Client
	Storage   *storage.Client
}

// Config holds Firebase initialization configuration
type Config struct {
	ProjectID       string
	CredentialsPath string
	StorageBucket   string
	DatabaseID      string
}

// Initialize creates and initializes Firebase Admin SDK clients
func Initialize(ctx context.Context, cfg *Config) (*Admin, error) {
	// Validate config
	if cfg.ProjectID == "" {
		return nil, fmt.Errorf("project_id is required")
	}
	if cfg.CredentialsPath == "" {
		return nil, fmt.Errorf("credentials_path is required")
	}

	// Initialize Firebase App
	conf := &firebase.Config{
		ProjectID:     cfg.ProjectID,
		StorageBucket: cfg.StorageBucket,
	}

	opt := option.WithCredentialsFile(cfg.CredentialsPath)
	app, err := firebase.NewApp(ctx, conf, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	// Initialize Auth client
	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Auth client: %w", err)
	}

	// Initialize Firestore client
	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firestore client: %w", err)
	}

	// Initialize Storage client
	storageClient, err := app.Storage(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Storage client: %w", err)
	}

	return &Admin{
		App:       app,
		Auth:      authClient,
		Firestore: firestoreClient,
		Storage:   storageClient,
	}, nil
}

// Close closes all Firebase clients
func (a *Admin) Close() error {
	if a.Firestore != nil {
		if err := a.Firestore.Close(); err != nil {
			return fmt.Errorf("failed to close Firestore client: %w", err)
		}
	}
	return nil
}

// HealthCheck verifies Firebase connectivity
func (a *Admin) HealthCheck(ctx context.Context) error {
	// Try to access Firestore
	_, err := a.Firestore.Collection("_health").Doc("_check").Get(ctx)
	if err != nil && !isNotFoundError(err) {
		return fmt.Errorf("firestore health check failed: %w", err)
	}
	return nil
}

func isNotFoundError(err error) bool {
	// Check if error is "not found" (which is acceptable for health check)
	return err != nil && (err.Error() == "not found" || err.Error() == "rpc error: code = NotFound")
}
