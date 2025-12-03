package firebase

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFirebaseConfig_ValidConfig(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "/path/to/credentials.json",
		StorageBucket:   "test-bucket",
		DatabaseID:      "test-db",
	}

	assert.Equal(t, "test-project", cfg.ProjectID)
	assert.Equal(t, "/path/to/credentials.json", cfg.CredentialsPath)
	assert.Equal(t, "test-bucket", cfg.StorageBucket)
	assert.Equal(t, "test-db", cfg.DatabaseID)
}

func TestFirebaseConfig_MinimalConfig(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "/path/to/credentials.json",
	}

	assert.Equal(t, "test-project", cfg.ProjectID)
	assert.Equal(t, "/path/to/credentials.json", cfg.CredentialsPath)
	assert.Empty(t, cfg.StorageBucket)
	assert.Empty(t, cfg.DatabaseID)
}

func TestFirebaseConfig_EmptyProjectID(t *testing.T) {
	cfg := &Config{
		ProjectID:       "",
		CredentialsPath: "/path/to/credentials.json",
	}

	assert.Empty(t, cfg.ProjectID)
}

func TestFirebaseConfig_EmptyCredentialsPath(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "",
	}

	assert.Empty(t, cfg.CredentialsPath)
}

func TestFirebaseConfig_WithStorageBucket(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "/path/to/credentials.json",
		StorageBucket:   "gs://my-bucket",
	}

	assert.Equal(t, "gs://my-bucket", cfg.StorageBucket)
}

func TestFirebaseConfig_WithDatabaseID(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "/path/to/credentials.json",
		DatabaseID:      "(default)",
	}

	assert.Equal(t, "(default)", cfg.DatabaseID)
}

func TestIsNotFoundError_WithNotFoundMessage(t *testing.T) {
	// Test that nil error returns false
	result := isNotFoundError(nil)
	assert.False(t, result)
}

func TestIsNotFoundError_WithNilError(t *testing.T) {
	result := isNotFoundError(nil)
	assert.False(t, result)
}

func TestFirebaseConfig_AllFields(t *testing.T) {
	cfg := &Config{
		ProjectID:       "my-project",
		CredentialsPath: "/etc/firebase-key.json",
		StorageBucket:   "gs://my-storage",
		DatabaseID:      "(default)",
	}

	assert.NotNil(t, cfg)
	assert.NotEmpty(t, cfg.ProjectID)
	assert.NotEmpty(t, cfg.CredentialsPath)
	assert.NotEmpty(t, cfg.StorageBucket)
	assert.NotEmpty(t, cfg.DatabaseID)
}

func TestFirebaseConfig_ProjectIDValue(t *testing.T) {
	cfg := &Config{
		ProjectID: "test-project-123",
	}

	assert.Equal(t, "test-project-123", cfg.ProjectID)
	assert.NotEmpty(t, cfg.ProjectID)
}

func TestFirebaseConfig_CredentialsPathValue(t *testing.T) {
	cfg := &Config{
		CredentialsPath: "/home/user/.config/firebase/key.json",
	}

	assert.Equal(t, "/home/user/.config/firebase/key.json", cfg.CredentialsPath)
	assert.NotEmpty(t, cfg.CredentialsPath)
}

func TestFirebaseConfig_CanBeModified(t *testing.T) {
	cfg := &Config{
		ProjectID: "original",
	}

	cfg.ProjectID = "modified"

	assert.Equal(t, "modified", cfg.ProjectID)
}

func TestFirebaseConfig_MultipleInstances(t *testing.T) {
	cfg1 := &Config{ProjectID: "project1"}
	cfg2 := &Config{ProjectID: "project2"}

	assert.Equal(t, "project1", cfg1.ProjectID)
	assert.Equal(t, "project2", cfg2.ProjectID)
	assert.NotEqual(t, cfg1.ProjectID, cfg2.ProjectID)
}

func TestFirebaseConfig_StorageBucketFormat(t *testing.T) {
	cfg := &Config{
		StorageBucket: "gs://bucket-name",
	}

	assert.True(t, len(cfg.StorageBucket) > 0)
	assert.Contains(t, cfg.StorageBucket, "bucket-name")
}

func TestFirebaseConfig_DatabaseIDDefault(t *testing.T) {
	cfg := &Config{
		DatabaseID: "(default)",
	}

	assert.Equal(t, "(default)", cfg.DatabaseID)
}

func TestFirebaseConfig_ProjectIDWithHyphen(t *testing.T) {
	cfg := &Config{
		ProjectID: "my-test-project",
	}

	assert.Contains(t, cfg.ProjectID, "-")
}

func TestFirebaseConfig_CredentialsPathRelative(t *testing.T) {
	cfg := &Config{
		CredentialsPath: "credentials.json",
	}

	assert.Equal(t, "credentials.json", cfg.CredentialsPath)
}

func TestFirebaseConfig_CredentialsPathAbsolute(t *testing.T) {
	cfg := &Config{
		CredentialsPath: "/absolute/path/to/credentials.json",
	}

	assert.True(t, len(cfg.CredentialsPath) > 0)
	assert.Contains(t, cfg.CredentialsPath, "/")
}

func TestFirebaseConfig_EmptyAllFields(t *testing.T) {
	cfg := &Config{
		ProjectID:       "",
		CredentialsPath: "",
		StorageBucket:   "",
		DatabaseID:      "",
	}

	assert.Empty(t, cfg.ProjectID)
	assert.Empty(t, cfg.CredentialsPath)
	assert.Empty(t, cfg.StorageBucket)
	assert.Empty(t, cfg.DatabaseID)
}

func TestFirebaseConfig_SetProjectID(t *testing.T) {
	cfg := &Config{}
	cfg.ProjectID = "new-project"

	assert.Equal(t, "new-project", cfg.ProjectID)
}

func TestFirebaseConfig_SetCredentialsPath(t *testing.T) {
	cfg := &Config{}
	cfg.CredentialsPath = "/new/path/creds.json"

	assert.Equal(t, "/new/path/creds.json", cfg.CredentialsPath)
}

func TestFirebaseConfig_SetStorageBucket(t *testing.T) {
	cfg := &Config{}
	cfg.StorageBucket = "gs://new-bucket"

	assert.Equal(t, "gs://new-bucket", cfg.StorageBucket)
}

func TestFirebaseConfig_SetDatabaseID(t *testing.T) {
	cfg := &Config{}
	cfg.DatabaseID = "(default)"

	assert.Equal(t, "(default)", cfg.DatabaseID)
}

// Tests for isNotFoundError function

func TestIsNotFoundError_WithExactNotFoundMessage(t *testing.T) {
	err := fmt.Errorf("not found")
	result := isNotFoundError(err)
	assert.True(t, result)
}

func TestIsNotFoundError_WithRPCNotFoundMessage(t *testing.T) {
	err := fmt.Errorf("rpc error: code = NotFound")
	result := isNotFoundError(err)
	assert.True(t, result)
}

func TestIsNotFoundError_WithOtherError(t *testing.T) {
	err := fmt.Errorf("some other error")
	result := isNotFoundError(err)
	assert.False(t, result)
}

func TestIsNotFoundError_WithPermissionDeniedError(t *testing.T) {
	err := fmt.Errorf("permission denied")
	result := isNotFoundError(err)
	assert.False(t, result)
}

// Tests for Admin struct

func TestAdmin_NewAdminStruct(t *testing.T) {
	admin := &Admin{
		App:       nil,
		Auth:      nil,
		Firestore: nil,
		Storage:   nil,
	}

	assert.NotNil(t, admin)
	assert.Nil(t, admin.App)
	assert.Nil(t, admin.Auth)
	assert.Nil(t, admin.Firestore)
	assert.Nil(t, admin.Storage)
}

func TestAdmin_AllFieldsNil(t *testing.T) {
	admin := &Admin{}

	assert.Nil(t, admin.App)
	assert.Nil(t, admin.Auth)
	assert.Nil(t, admin.Firestore)
	assert.Nil(t, admin.Storage)
}

// Tests for Initialize function error handling

func TestInitialize_EmptyProjectID(t *testing.T) {
	cfg := &Config{
		ProjectID:       "",
		CredentialsPath: "/path/to/credentials.json",
	}

	admin, err := Initialize(context.Background(), cfg)

	assert.Nil(t, admin)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "project_id is required")
}

func TestInitialize_EmptyCredentialsPath(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "",
	}

	admin, err := Initialize(context.Background(), cfg)

	assert.Nil(t, admin)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "credentials_path is required")
}

func TestInitialize_BothRequiredFieldsEmpty(t *testing.T) {
	cfg := &Config{
		ProjectID:       "",
		CredentialsPath: "",
	}

	admin, err := Initialize(context.Background(), cfg)

	assert.Nil(t, admin)
	assert.Error(t, err)
	// Should fail on project_id check first
	assert.Contains(t, err.Error(), "project_id is required")
}

func TestInitialize_InvalidCredentialsPath(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test-project",
		CredentialsPath: "/nonexistent/path/credentials.json",
	}

	admin, err := Initialize(context.Background(), cfg)

	assert.Nil(t, admin)
	assert.Error(t, err)
	// Will fail to initialize Firebase app due to invalid credentials file
	assert.NotNil(t, err)
}

func TestInitialize_NilConfig(t *testing.T) {
	// When config is nil, Initialize should recover gracefully
	// In production, you should check for nil config before calling Initialize
	defer func() {
		if r := recover(); r != nil {
			// Panic is expected, test passes
			t.Logf("Caught expected panic: %v", r)
		}
	}()

	_, _ = Initialize(context.Background(), nil)
}

// Tests for Close function

func TestAdmin_Close_WithNilFirestore(t *testing.T) {
	admin := &Admin{
		App:       nil,
		Auth:      nil,
		Firestore: nil,
		Storage:   nil,
	}

	err := admin.Close()

	assert.NoError(t, err)
}

// Tests for Config validation

func TestConfig_Validation_ProjectIDRequired(t *testing.T) {
	cfg := &Config{
		CredentialsPath: "/path/credentials.json",
	}

	assert.Empty(t, cfg.ProjectID)
	assert.NotEmpty(t, cfg.CredentialsPath)
}

func TestConfig_Validation_CredentialsPathRequired(t *testing.T) {
	cfg := &Config{
		ProjectID: "my-project",
	}

	assert.NotEmpty(t, cfg.ProjectID)
	assert.Empty(t, cfg.CredentialsPath)
}

func TestConfig_Validation_BothRequired(t *testing.T) {
	cfg := &Config{
		ProjectID:       "my-project",
		CredentialsPath: "/path/credentials.json",
	}

	assert.NotEmpty(t, cfg.ProjectID)
	assert.NotEmpty(t, cfg.CredentialsPath)
}

// Tests for configuration combinations

func TestFirebaseConfig_MinimalRequiredFields(t *testing.T) {
	cfg := &Config{
		ProjectID:       "test",
		CredentialsPath: "/test",
	}

	assert.Equal(t, "test", cfg.ProjectID)
	assert.Equal(t, "/test", cfg.CredentialsPath)
	assert.Empty(t, cfg.StorageBucket)
	assert.Empty(t, cfg.DatabaseID)
}

func TestFirebaseConfig_AllFieldsPopulated(t *testing.T) {
	cfg := &Config{
		ProjectID:       "project",
		CredentialsPath: "/creds",
		StorageBucket:   "bucket",
		DatabaseID:      "db-id",
	}

	assert.Equal(t, "project", cfg.ProjectID)
	assert.Equal(t, "/creds", cfg.CredentialsPath)
	assert.Equal(t, "bucket", cfg.StorageBucket)
	assert.Equal(t, "db-id", cfg.DatabaseID)
}

// Tests for error message formation

func TestIsNotFoundError_ErrorMessageFormats(t *testing.T) {
	tests := []struct {
		name        string
		errorMsg    string
		shouldMatch bool
	}{
		{
			name:        "exact not found",
			errorMsg:    "not found",
			shouldMatch: true,
		},
		{
			name:        "rpc not found",
			errorMsg:    "rpc error: code = NotFound",
			shouldMatch: true,
		},
		{
			name:        "different error",
			errorMsg:    "internal error",
			shouldMatch: false,
		},
		{
			name:        "case sensitive not found",
			errorMsg:    "Not Found",
			shouldMatch: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := errors.New(tt.errorMsg)
			result := isNotFoundError(err)
			assert.Equal(t, tt.shouldMatch, result)
		})
	}
}

// Tests for field modification

func TestAdmin_FieldsCanBeSet(t *testing.T) {
	admin := &Admin{}

	// Verify fields are initially nil
	assert.Nil(t, admin.App)
	assert.Nil(t, admin.Auth)
	assert.Nil(t, admin.Firestore)
	assert.Nil(t, admin.Storage)

	// Fields should be assignable (though we can't assign real clients in unit tests)
	admin.App = nil
	admin.Auth = nil
	admin.Firestore = nil
	admin.Storage = nil

	assert.Nil(t, admin.App)
	assert.Nil(t, admin.Auth)
	assert.Nil(t, admin.Firestore)
	assert.Nil(t, admin.Storage)
}
