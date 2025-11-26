package utils

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/models"
)

// RespondJSON sends a JSON response
func RespondJSON(w http.ResponseWriter, data interface{}, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			// If encoding fails, log but don't try to send another response
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

// RespondError sends an error response
func RespondError(w http.ResponseWriter, message string, statusCode int) {
	RespondJSON(w, models.ErrorResponse{
		Error: message,
	}, statusCode)
}

// RespondSuccess sends a success response
func RespondSuccess(w http.ResponseWriter, data map[string]interface{}, message string) {
	RespondJSON(w, models.SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	}, http.StatusOK)
}

// ParseJSON parses JSON request body
func ParseJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
