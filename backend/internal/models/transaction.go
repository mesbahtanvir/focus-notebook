package models

import "time"

// Transaction represents a financial transaction
type Transaction struct {
	ID              string    `firestore:"id" json:"id"`
	AccountID       string    `firestore:"accountId" json:"accountId"`
	CSVFileName     string    `firestore:"csvFileName,omitempty" json:"csvFileName,omitempty"`
	Date            string    `firestore:"date" json:"date"`
	Description     string    `firestore:"description" json:"description"`
	Merchant        string    `firestore:"merchant,omitempty" json:"merchant,omitempty"`
	Amount          float64   `firestore:"amount" json:"amount"`
	Category        string    `firestore:"category,omitempty" json:"category,omitempty"`
	Tags            []string  `firestore:"tags,omitempty" json:"tags,omitempty"`
	Notes           string    `firestore:"notes,omitempty" json:"notes,omitempty"`
	Source          string    `firestore:"source" json:"source"` // csv-upload, plaid, manual
	Enhanced        bool      `firestore:"enhanced" json:"enhanced"`
	CreatedAt       time.Time `firestore:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time `firestore:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	TripID          string    `firestore:"tripId,omitempty" json:"tripId,omitempty"`
	TripSuggestion  *string   `firestore:"tripSuggestion,omitempty" json:"tripSuggestion,omitempty"`
	SuggestionScore *float64  `firestore:"suggestionScore,omitempty" json:"suggestionScore,omitempty"`
}

// CSVTransaction represents a raw transaction from CSV
type CSVTransaction struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
}

// EnhancedTransaction represents an AI-enhanced transaction
type EnhancedTransaction struct {
	OriginalDescription string `json:"originalDescription"`
	MerchantName        string `json:"merchantName"`
	Category            string `json:"category"`
	IsSubscription      bool   `json:"isSubscription"`
	Notes               string `json:"notes"`
}

// EnhancementResult represents the result of AI enhancement
type EnhancementResult struct {
	Transactions []EnhancedTransaction `json:"transactions"`
	Summary      EnhancementSummary    `json:"summary"`
}

// EnhancementSummary provides statistics about the enhancement
type EnhancementSummary struct {
	TotalProcessed        int      `json:"totalProcessed"`
	CategoriesUsed        []string `json:"categoriesUsed"`
	SubscriptionsDetected int      `json:"subscriptionsDetected"`
}

// CSVProcessingStatus tracks CSV processing progress
type CSVProcessingStatus struct {
	Status           string    `firestore:"status" json:"status"` // processing, completed, error
	FileName         string    `firestore:"fileName" json:"fileName"`
	StoragePath      string    `firestore:"storagePath,omitempty" json:"storagePath,omitempty"`
	ProcessedCount   int       `firestore:"processedCount,omitempty" json:"processedCount,omitempty"`
	ProcessedBatches int       `firestore:"processedBatches,omitempty" json:"processedBatches,omitempty"`
	TotalBatches     int       `firestore:"totalBatches,omitempty" json:"totalBatches,omitempty"`
	Error            string    `firestore:"error,omitempty" json:"error,omitempty"`
	CreatedAt        time.Time `firestore:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time `firestore:"updatedAt" json:"updatedAt"`
}

// Statement represents a CSV statement record
type Statement struct {
	ID               string    `firestore:"id" json:"id"`
	FileName         string    `firestore:"fileName" json:"fileName"`
	StoragePath      string    `firestore:"storagePath" json:"storagePath"`
	Status           string    `firestore:"status" json:"status"` // processing, completed, error
	Source           string    `firestore:"source" json:"source"`
	ProcessedCount   int       `firestore:"processedCount" json:"processedCount"`
	Error            string    `firestore:"error,omitempty" json:"error,omitempty"`
	TotalBatches     int       `firestore:"totalBatches,omitempty" json:"totalBatches,omitempty"`
	ProcessedBatches int       `firestore:"processedBatches,omitempty" json:"processedBatches,omitempty"`
	UploadedAt       time.Time `firestore:"uploadedAt" json:"uploadedAt"`
	UpdatedAt        time.Time `firestore:"updatedAt" json:"updatedAt"`
}
