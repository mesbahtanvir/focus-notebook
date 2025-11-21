package middleware

import (
	"net/http"
	"runtime/debug"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/utils"
)

// Recovery middleware recovers from panics
func Recovery(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("path", r.URL.Path),
						zap.String("method", r.Method),
						zap.String("stack", string(debug.Stack())),
					)

					// Respond with 500
					utils.RespondError(w, "Internal server error", http.StatusInternalServerError)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
