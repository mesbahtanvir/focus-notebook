package utils

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
)

func TestRespondJSON_WithData(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]interface{}{
		"key": "value",
		"num": 42,
	}

	RespondJSON(w, data, http.StatusOK)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "key")
	assert.Contains(t, w.Body.String(), "value")
}

func TestRespondJSON_WithNilData(t *testing.T) {
	w := httptest.NewRecorder()

	RespondJSON(w, nil, http.StatusNoContent)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
}

func TestRespondJSON_VariousStatusCodes(t *testing.T) {
	codes := []int{
		http.StatusOK,
		http.StatusCreated,
		http.StatusBadRequest,
		http.StatusUnauthorized,
		http.StatusNotFound,
		http.StatusInternalServerError,
	}

	for _, code := range codes {
		t.Run(http.StatusText(code), func(t *testing.T) {
			w := httptest.NewRecorder()
			RespondJSON(w, map[string]string{"test": "data"}, code)
			assert.Equal(t, code, w.Code)
		})
	}
}

func TestWriteJSON_IsAlias(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"test": "data"}

	WriteJSON(w, data, http.StatusOK)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "test")
}

func TestRespondError(t *testing.T) {
	w := httptest.NewRecorder()
	errorMsg := "Something went wrong"

	RespondError(w, errorMsg, http.StatusInternalServerError)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), errorMsg)
	assert.Contains(t, w.Body.String(), "error")
}

func TestRespondError_VariousStatuses(t *testing.T) {
	cases := []struct {
		name       string
		message    string
		statusCode int
	}{
		{"BadRequest", "Invalid input", http.StatusBadRequest},
		{"Unauthorized", "Unauthorized", http.StatusUnauthorized},
		{"NotFound", "Resource not found", http.StatusNotFound},
		{"ServerError", "Internal server error", http.StatusInternalServerError},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			RespondError(w, tc.message, tc.statusCode)
			assert.Equal(t, tc.statusCode, w.Code)
			assert.Contains(t, w.Body.String(), tc.message)
		})
	}
}

func TestWriteError_IsAlias(t *testing.T) {
	w := httptest.NewRecorder()

	WriteError(w, "Test error", http.StatusBadRequest)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Test error")
}

func TestRespondSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]interface{}{
		"id":   "123",
		"name": "Test",
	}

	RespondSuccess(w, data, "Success message")

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "success")
	assert.Contains(t, w.Body.String(), "Success message")
}

func TestRespondSuccess_WithNilData(t *testing.T) {
	w := httptest.NewRecorder()

	RespondSuccess(w, nil, "Completed successfully")

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "success")
}

func TestParseJSON_ValidInput(t *testing.T) {
	jsonBody := `{"name": "test", "value": 42}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonBody))

	var result map[string]interface{}
	err := ParseJSON(req, &result)

	require.NoError(t, err)
	assert.Equal(t, "test", result["name"])
	assert.Equal(t, float64(42), result["value"])
}

func TestParseJSON_StructInput(t *testing.T) {
	type TestData struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}

	jsonBody := `{"id": 1, "name": "test"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonBody))

	var result TestData
	err := ParseJSON(req, &result)

	require.NoError(t, err)
	assert.Equal(t, 1, result.ID)
	assert.Equal(t, "test", result.Name)
}

func TestParseJSON_InvalidJSON(t *testing.T) {
	jsonBody := `{invalid json}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonBody))

	var result map[string]interface{}
	err := ParseJSON(req, &result)

	assert.Error(t, err)
}

func TestParseJSON_EmptyBody(t *testing.T) {
	req := httptest.NewRequest("POST", "/test", strings.NewReader(""))

	var result map[string]interface{}
	err := ParseJSON(req, &result)

	assert.Error(t, err)
}

func TestParseJSON_WrongType(t *testing.T) {
	jsonBody := `{"key": "value"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonBody))

	var result []string
	err := ParseJSON(req, &result)

	assert.Error(t, err)
}

func TestParseJSON_ComplexStructure(t *testing.T) {
	type Address struct {
		Street string `json:"street"`
		City   string `json:"city"`
	}

	type Person struct {
		Name    string  `json:"name"`
		Age     int     `json:"age"`
		Address Address `json:"address"`
	}

	jsonBody := `{
		"name": "John",
		"age": 30,
		"address": {
			"street": "123 Main St",
			"city": "New York"
		}
	}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(jsonBody))

	var result Person
	err := ParseJSON(req, &result)

	require.NoError(t, err)
	assert.Equal(t, "John", result.Name)
	assert.Equal(t, 30, result.Age)
	assert.Equal(t, "123 Main St", result.Address.Street)
}

func TestErrorResponseStructure(t *testing.T) {
	w := httptest.NewRecorder()
	RespondError(w, "test error", http.StatusBadRequest)

	body := w.Body.String()
	assert.Contains(t, body, "error")
	assert.Contains(t, body, "test error")
}

func TestSuccessResponseStructure(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"key": "value"}

	RespondSuccess(w, data, "test message")

	body := w.Body.String()
	assert.Contains(t, body, "success")
	assert.Contains(t, body, "true")
	assert.Contains(t, body, "data")
}

func TestParseJSON_ClosesRequestBody(t *testing.T) {
	jsonBody := `{"test": "data"}`
	body := io.NopCloser(bytes.NewReader([]byte(jsonBody)))
	req := &http.Request{Body: body}

	var result map[string]interface{}
	_ = ParseJSON(req, &result)

	// Body should be closed after ParseJSON
	_, err := body.Read(make([]byte, 1))
	assert.Error(t, err)
}

func TestRespondJSON_CreatedStatus(t *testing.T) {
	w := httptest.NewRecorder()
	data := models.SuccessResponse{
		Success: true,
		Data:    map[string]string{"id": "123"},
	}

	RespondJSON(w, data, http.StatusCreated)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), "123")
}
