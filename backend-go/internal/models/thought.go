package models

import (
	"time"
)

// Thought represents a user's thought document
type Thought struct {
	BaseModel
	Text               string                 `firestore:"text" json:"text"`
	Type               string                 `firestore:"type,omitempty" json:"type,omitempty"` // neutral, negative, positive
	Tags               []string               `firestore:"tags,omitempty" json:"tags,omitempty"`
	AiProcessingStatus string                 `firestore:"aiProcessingStatus,omitempty" json:"aiProcessingStatus,omitempty"` // pending, processing, completed, failed
	ProcessedAt        *time.Time             `firestore:"processedAt,omitempty" json:"processedAt,omitempty"`
	ToolSpecIds        []string               `firestore:"toolSpecIds,omitempty" json:"toolSpecIds,omitempty"`
	AIMetadata         map[string]interface{} `firestore:"aiMetadata,omitempty" json:"aiMetadata,omitempty"`
}

// ThoughtProcessingRequest represents a request to process a thought
type ThoughtProcessingRequest struct {
	ThoughtID   string                 `json:"thoughtId"`
	Thought     map[string]interface{} `json:"thought"`
	Model       string                 `json:"model,omitempty"`
	Context     *UserContext           `json:"context,omitempty"`
	ToolSpecIds []string               `json:"toolSpecIds,omitempty"`
}

// ThoughtProcessingResponse represents the AI response
type ThoughtProcessingResponse struct {
	Actions []AIAction `json:"actions"`
}

// AIAction represents an action suggested by AI
type AIAction struct {
	Type       string                 `json:"type"` // createTask, createProject, createMood, createRelationship, etc.
	Confidence int                    `json:"confidence"` // 0-100
	Data       map[string]interface{} `json:"data"`
	Reasoning  string                 `json:"reasoning"`
}

// ThoughtProcessingJob represents a queued thought processing job
type ThoughtProcessingJob struct {
	BaseModel
	ThoughtID   string   `firestore:"thoughtId" json:"thoughtId"`
	Trigger     string   `firestore:"trigger" json:"trigger"` // auto, manual, reprocess
	Status      string   `firestore:"status" json:"status"` // queued, processing, completed, failed, rate_limited
	RequestedAt time.Time `firestore:"requestedAt" json:"requestedAt"`
	RequestedBy string   `firestore:"requestedBy,omitempty" json:"requestedBy,omitempty"`
	ToolSpecIds []string `firestore:"toolSpecIds,omitempty" json:"toolSpecIds,omitempty"`
	Attempts    int      `firestore:"attempts" json:"attempts"`
	Error       string   `firestore:"error,omitempty" json:"error,omitempty"`
}
