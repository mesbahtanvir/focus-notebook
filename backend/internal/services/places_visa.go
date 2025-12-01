package services

import (
	"context"
	"encoding/json"
	"fmt"

	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/clients"
	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/interfaces"
)

// PlaceInsightsService handles place insights generation
type PlaceInsightsService struct {
	openaiClient *clients.OpenAIClient
	logger       *zap.Logger
}

// NewPlaceInsightsService creates a new place insights service
func NewPlaceInsightsService(
	openaiClient *clients.OpenAIClient,
	logger *zap.Logger,
) *PlaceInsightsService {
	return &PlaceInsightsService{
		openaiClient: openaiClient,
		logger:       logger,
	}
}

// PlaceInsights represents the AI-generated insights for a destination
type PlaceInsights struct {
	Destination    string                 `json:"destination"`
	Overview       string                 `json:"overview,omitempty"`
	BestTimeToGo   string                 `json:"bestTimeToGo,omitempty"`
	MustSeePlaces  []string               `json:"mustSeePlaces,omitempty"`
	LocalCuisine   []string               `json:"localCuisine,omitempty"`
	CulturalTips   []string               `json:"culturalTips,omitempty"`
	BudgetGuide    map[string]interface{} `json:"budgetGuide,omitempty"`
	Transportation map[string]interface{} `json:"transportation,omitempty"`
	Safety         string                 `json:"safety,omitempty"`
	Language       string                 `json:"language,omitempty"`
	Currency       string                 `json:"currency,omitempty"`
	AdditionalInfo map[string]interface{} `json:"additionalInfo,omitempty"`
}

// GeneratePlaceInsights generates AI-powered insights for a destination
func (s *PlaceInsightsService) GeneratePlaceInsights(
	ctx context.Context,
	destinationName string,
	country string,
) (*PlaceInsights, error) {
	// Build prompt
	prompt := s.buildPlaceInsightsPrompt(destinationName, country)

	// Call OpenAI with JSON mode
	response, err := s.openaiClient.ChatCompletion(ctx, clients.ChatCompletionRequest{
		Model: "gpt-4o-mini",
		Messages: []clients.ChatMessage{
			{
				Role:    "system",
				Content: "You are a travel expert providing comprehensive, accurate destination insights. Always respond with valid JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature:    0.35,
		MaxTokens:      12000,
		ResponseFormat: &clients.ResponseFormat{Type: "json_object"},
	})

	if err != nil {
		return nil, fmt.Errorf("failed to generate insights: %w", err)
	}

	if response.Content == "" {
		return nil, fmt.Errorf("empty response from OpenAI")
	}

	// Parse JSON response
	var insights PlaceInsights
	if err := json.Unmarshal([]byte(response.Content), &insights); err != nil {
		return nil, fmt.Errorf("failed to parse insights JSON: %w", err)
	}

	// Set destination name
	insights.Destination = destinationName

	return &insights, nil
}

// buildPlaceInsightsPrompt builds the prompt for place insights
func (s *PlaceInsightsService) buildPlaceInsightsPrompt(destinationName, country string) string {
	countryContext := ""
	if country != "" {
		countryContext = fmt.Sprintf(" in %s", country)
	}

	return fmt.Sprintf(`Generate comprehensive travel insights for %s%s.

Provide detailed information in JSON format with the following structure:

{
  "overview": "Brief overview of the destination (2-3 sentences)",
  "bestTimeToGo": "Best time to visit and why (weather, festivals, etc.)",
  "mustSeePlaces": ["List of 5-7 must-see attractions or places"],
  "localCuisine": ["List of 4-5 must-try local dishes or food experiences"],
  "culturalTips": ["List of 4-6 important cultural etiquette tips"],
  "budgetGuide": {
    "budget": "Budget range per day (e.g., '$50-100/day')",
    "midRange": "Mid-range budget per day",
    "luxury": "Luxury budget per day",
    "notes": "Brief notes on costs"
  },
  "transportation": {
    "gettingThere": "How to get there (flights, etc.)",
    "gettingAround": "How to get around locally",
    "tips": "Transportation tips"
  },
  "safety": "Safety information and tips (2-3 sentences)",
  "language": "Primary language(s) spoken and useful phrases",
  "currency": "Local currency and payment info",
  "additionalInfo": {
    "visaInfo": "Basic visa information",
    "connectivity": "Internet/SIM card info",
    "emergencyNumbers": "Important emergency contacts"
  }
}

Be specific, practical, and up-to-date. Focus on actionable information for travelers.`,
		destinationName, countryContext)
}

// VisaService handles visa requirements queries
type VisaService struct {
	repo   interfaces.Repository
	logger *zap.Logger
}

// NewVisaService creates a new visa service
func NewVisaService(repo interfaces.Repository, logger *zap.Logger) *VisaService {
	return &VisaService{
		repo:   repo,
		logger: logger,
	}
}

// VisaRequirement represents visa requirements for a destination
type VisaRequirement struct {
	ID                 string      `json:"id" firestore:"id"`
	SourceCountry      CountryInfo `json:"sourceCountry" firestore:"sourceCountry"`
	DestinationCountry CountryInfo `json:"destinationCountry" firestore:"destinationCountry"`
	VisaType           string      `json:"visaType" firestore:"visaType"`
	Duration           string      `json:"duration" firestore:"duration"`
	Description        string      `json:"description" firestore:"description"`
	Region             string      `json:"region" firestore:"region"`
	Requirements       []string    `json:"requirements" firestore:"requirements"`
	Notes              string      `json:"notes,omitempty" firestore:"notes,omitempty"`
	LastUpdated        string      `json:"lastUpdated" firestore:"lastUpdated"`
	Confidence         string      `json:"confidence" firestore:"confidence"`
	Source             string      `json:"source" firestore:"source"`
}

// CountryInfo represents country information
type CountryInfo struct {
	Code string `json:"code" firestore:"code"`
	Name string `json:"name" firestore:"name"`
	Flag string `json:"flag,omitempty" firestore:"flag,omitempty"`
}

// GetVisaRequirements gets visa requirements for a nationality
func (s *VisaService) GetVisaRequirements(
	ctx context.Context,
	nationality string,
) ([]VisaRequirement, error) {
	if nationality == "" {
		return nil, fmt.Errorf("nationality is required")
	}

	// Query visa_requirements collection
	// In Firestore, we need to query all documents where sourceCountry.code == nationality
	// Since we can't do nested field queries directly with the repository interface,
	// we'll need to get all visa requirements and filter them

	// For now, let's use a simpler approach: construct document IDs
	// The document ID format is: {sourceCountryCode}_{destinationCountryCode}
	// We'll scan for all documents starting with the nationality code

	// Get all visa_requirements documents
	requirements := []VisaRequirement{}

	// Since our repository interface doesn't support complex queries,
	// we'll use a workaround: try to fetch known destination countries
	// In a production system, you'd want to add a Query method to the repository

	// For now, return a simplified response indicating the service is available
	// The actual implementation would require querying Firestore with a where clause
	// which our current repository interface doesn't fully support

	s.logger.Warn("Visa requirements query needs Firestore query support",
		zap.String("nationality", nationality),
	)

	// Return empty list for now - this would need proper Firestore query support
	return requirements, nil
}
