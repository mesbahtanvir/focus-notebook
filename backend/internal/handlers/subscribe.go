package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/utils"
)

// SubscribeHandler handles Server-Sent Events (SSE) for real-time updates
type SubscribeHandler struct {
	repo    *repository.FirestoreRepository
	configs map[string]CollectionConfig
	logger  *zap.Logger

	// Track active connections for graceful shutdown
	connections sync.Map
	mu          sync.RWMutex
}

// NewSubscribeHandler creates a new SSE subscription handler
func NewSubscribeHandler(repo *repository.FirestoreRepository, configs map[string]CollectionConfig, logger *zap.Logger) *SubscribeHandler {
	return &SubscribeHandler{
		repo:    repo,
		configs: configs,
		logger:  logger,
	}
}

// ChangeEvent represents a document change event
type ChangeEvent struct {
	Type      string                 `json:"type"`      // "added", "modified", "removed"
	DocID     string                 `json:"docId"`     // Document ID
	Data      map[string]interface{} `json:"data"`      // Document data (nil for removed)
	Timestamp int64                  `json:"timestamp"` // Event timestamp in milliseconds
}

// Subscribe handles GET /api/subscribe/{collection}
// Streams document changes via Server-Sent Events
func (h *SubscribeHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)
	vars := mux.Vars(r)
	collection := vars["collection"]

	// Validate collection exists and is user-scoped
	config, exists := h.configs[collection]
	if !exists {
		utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
		return
	}
	if !config.UserScoped {
		utils.RespondError(w, "Subscription not available for this collection", http.StatusForbidden)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	// Get flusher
	flusher, ok := w.(http.Flusher)
	if !ok {
		utils.RespondError(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Create cancellable context
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Track connection
	connID := fmt.Sprintf("%s-%s-%d", uid, collection, time.Now().UnixNano())
	h.connections.Store(connID, cancel)
	defer h.connections.Delete(connID)

	h.logger.Info("SSE subscription started",
		zap.String("collection", collection),
		zap.String("uid", uid),
		zap.String("connId", connID),
	)

	// Build collection path
	collectionPath := fmt.Sprintf("users/%s/%s", uid, collection)

	// Create query with ordering
	query := h.repo.Collection(collectionPath).Query
	if config.DefaultOrderBy != "" {
		query = query.OrderBy(config.DefaultOrderBy, config.DefaultOrderDir)
	}

	// Start listening for changes
	snapIter := query.Snapshots(ctx)
	defer snapIter.Stop()

	// Send initial connected event
	h.sendEvent(w, flusher, "connected", map[string]interface{}{
		"collection": collection,
		"timestamp":  time.Now().UnixMilli(),
	})

	// Heartbeat ticker to keep connection alive
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	// Channel for snapshot changes
	changes := make(chan []*firestore.DocumentChange, 10)
	errors := make(chan error, 1)

	// Start snapshot listener in goroutine
	go func() {
		for {
			snap, err := snapIter.Next()
			if err != nil {
				if status.Code(err) == codes.Canceled {
					return
				}
				errors <- err
				return
			}

			// Send changes
			if len(snap.Changes) > 0 {
				select {
				case changes <- snap.Changes:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	// Main event loop
	for {
		select {
		case <-ctx.Done():
			h.logger.Info("SSE subscription ended (context done)",
				zap.String("collection", collection),
				zap.String("uid", uid),
			)
			return

		case err := <-errors:
			h.logger.Error("SSE subscription error",
				zap.Error(err),
				zap.String("collection", collection),
				zap.String("uid", uid),
			)
			h.sendEvent(w, flusher, "error", map[string]interface{}{
				"message": "Subscription error",
			})
			return

		case docChanges := <-changes:
			for _, change := range docChanges {
				event := ChangeEvent{
					DocID:     change.Doc.Ref.ID,
					Timestamp: time.Now().UnixMilli(),
				}

				switch change.Kind {
				case firestore.DocumentAdded:
					event.Type = "added"
					event.Data = change.Doc.Data()
					event.Data["id"] = change.Doc.Ref.ID
				case firestore.DocumentModified:
					event.Type = "modified"
					event.Data = change.Doc.Data()
					event.Data["id"] = change.Doc.Ref.ID
				case firestore.DocumentRemoved:
					event.Type = "removed"
				}

				h.sendEvent(w, flusher, "change", event)
			}

		case <-heartbeat.C:
			h.sendEvent(w, flusher, "heartbeat", map[string]interface{}{
				"timestamp": time.Now().UnixMilli(),
			})
		}
	}
}

// sendEvent sends an SSE event
func (h *SubscribeHandler) sendEvent(w http.ResponseWriter, flusher http.Flusher, eventType string, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		h.logger.Error("Failed to marshal SSE event", zap.Error(err))
		return
	}

	fmt.Fprintf(w, "event: %s\n", eventType)
	fmt.Fprintf(w, "data: %s\n\n", jsonData)
	flusher.Flush()
}

// SubscribeMultiple handles GET /api/subscribe
// Streams changes from multiple collections via SSE
func (h *SubscribeHandler) SubscribeMultiple(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := ctx.Value("uid").(string)

	// Get collections from query params
	collectionsStr := r.URL.Query().Get("collections")
	if collectionsStr == "" {
		utils.RespondError(w, "collections query parameter is required", http.StatusBadRequest)
		return
	}

	// Parse collections
	var collections []string
	if err := json.Unmarshal([]byte(collectionsStr), &collections); err != nil {
		// Try comma-separated format
		collections = splitAndTrim(collectionsStr, ",")
	}

	if len(collections) == 0 {
		utils.RespondError(w, "No collections specified", http.StatusBadRequest)
		return
	}

	// Validate all collections
	for _, collection := range collections {
		config, exists := h.configs[collection]
		if !exists {
			utils.RespondError(w, fmt.Sprintf("Unknown collection: %s", collection), http.StatusNotFound)
			return
		}
		if !config.UserScoped {
			utils.RespondError(w, fmt.Sprintf("Subscription not available for collection: %s", collection), http.StatusForbidden)
			return
		}
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		utils.RespondError(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Create cancellable context
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Track connection
	connID := fmt.Sprintf("%s-multi-%d", uid, time.Now().UnixNano())
	h.connections.Store(connID, cancel)
	defer h.connections.Delete(connID)

	h.logger.Info("Multi-collection SSE subscription started",
		zap.Strings("collections", collections),
		zap.String("uid", uid),
		zap.String("connId", connID),
	)

	// Channel for all changes
	type collectionChange struct {
		Collection string
		Changes    []*firestore.DocumentChange
	}
	changes := make(chan collectionChange, 10*len(collections))
	errors := make(chan error, len(collections))

	// Start listeners for each collection
	var wg sync.WaitGroup
	for _, collection := range collections {
		wg.Add(1)
		go func(coll string) {
			defer wg.Done()

			config := h.configs[coll]
			collectionPath := fmt.Sprintf("users/%s/%s", uid, coll)

			query := h.repo.Collection(collectionPath).Query
			if config.DefaultOrderBy != "" {
				query = query.OrderBy(config.DefaultOrderBy, config.DefaultOrderDir)
			}

			snapIter := query.Snapshots(ctx)
			defer snapIter.Stop()

			for {
				snap, err := snapIter.Next()
				if err != nil {
					if status.Code(err) == codes.Canceled {
						return
					}
					select {
					case errors <- fmt.Errorf("%s: %w", coll, err):
					case <-ctx.Done():
					}
					return
				}

				if len(snap.Changes) > 0 {
					select {
					case changes <- collectionChange{Collection: coll, Changes: snap.Changes}:
					case <-ctx.Done():
						return
					}
				}
			}
		}(collection)
	}

	// Send initial connected event
	h.sendEvent(w, flusher, "connected", map[string]interface{}{
		"collections": collections,
		"timestamp":   time.Now().UnixMilli(),
	})

	// Heartbeat ticker
	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	// Main event loop
	for {
		select {
		case <-ctx.Done():
			h.logger.Info("Multi-collection SSE subscription ended",
				zap.Strings("collections", collections),
				zap.String("uid", uid),
			)
			return

		case err := <-errors:
			h.logger.Error("Multi-collection SSE subscription error",
				zap.Error(err),
				zap.String("uid", uid),
			)
			h.sendEvent(w, flusher, "error", map[string]interface{}{
				"message": err.Error(),
			})
			return

		case cc := <-changes:
			for _, change := range cc.Changes {
				event := struct {
					Collection string                 `json:"collection"`
					Type       string                 `json:"type"`
					DocID      string                 `json:"docId"`
					Data       map[string]interface{} `json:"data"`
					Timestamp  int64                  `json:"timestamp"`
				}{
					Collection: cc.Collection,
					DocID:      change.Doc.Ref.ID,
					Timestamp:  time.Now().UnixMilli(),
				}

				switch change.Kind {
				case firestore.DocumentAdded:
					event.Type = "added"
					event.Data = change.Doc.Data()
					event.Data["id"] = change.Doc.Ref.ID
				case firestore.DocumentModified:
					event.Type = "modified"
					event.Data = change.Doc.Data()
					event.Data["id"] = change.Doc.Ref.ID
				case firestore.DocumentRemoved:
					event.Type = "removed"
				}

				h.sendEvent(w, flusher, "change", event)
			}

		case <-heartbeat.C:
			h.sendEvent(w, flusher, "heartbeat", map[string]interface{}{
				"timestamp": time.Now().UnixMilli(),
			})
		}
	}
}

// CloseAllConnections closes all active SSE connections
func (h *SubscribeHandler) CloseAllConnections() {
	h.connections.Range(func(key, value interface{}) bool {
		if cancel, ok := value.(context.CancelFunc); ok {
			cancel()
		}
		return true
	})
}

// GetActiveConnectionCount returns the number of active SSE connections
func (h *SubscribeHandler) GetActiveConnectionCount() int {
	count := 0
	h.connections.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}

// splitAndTrim splits a string and trims whitespace from each part
func splitAndTrim(s string, sep string) []string {
	parts := make([]string, 0)
	for _, part := range splitString(s, sep) {
		trimmed := trimString(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

// splitString splits a string by separator
func splitString(s string, sep string) []string {
	if s == "" {
		return nil
	}
	result := make([]string, 0)
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

// trimString trims whitespace from a string
func trimString(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
