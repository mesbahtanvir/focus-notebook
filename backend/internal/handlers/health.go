package handlers

import (
	"net/http"
	"time"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
	"github.com/mesbahtanvir/focus-notebook/backend/pkg/firebase"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	firebase  *firebase.Admin
	startTime time.Time
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(fb *firebase.Admin) *HealthHandler {
	return &HealthHandler{
		firebase:  fb,
		startTime: time.Now(),
	}
}

// Handle processes health check requests
func (h *HealthHandler) Handle(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	details := make(map[string]interface{})

	// Check Firebase connectivity
	if err := h.firebase.HealthCheck(r.Context()); err != nil {
		status = "degraded"
		details["firebase"] = "error"
		details["firebase_error"] = err.Error()
	} else {
		details["firebase"] = "connected"
	}

	// Add uptime
	uptime := time.Since(h.startTime)
	details["uptime_seconds"] = int64(uptime.Seconds())

	// Add version
	details["version"] = "1.0.0"

	// Overall status
	details["status"] = status

	statusCode := http.StatusOK
	if status != "ok" {
		statusCode = http.StatusServiceUnavailable
	}

	utils.RespondJSON(w, details, statusCode)
}
