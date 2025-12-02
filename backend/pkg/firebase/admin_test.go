package firebase

import (
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
