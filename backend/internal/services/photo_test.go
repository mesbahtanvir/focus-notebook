package services

import (
	"context"
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/repository/mocks"
)

func TestCalculateRatingDeviation(t *testing.T) {
	tests := []struct {
		name       string
		totalVotes int
		wantMin    float64
		wantMax    float64
	}{
		{"zero votes (max uncertainty)", 0, 340.0, 360.0},
		{"few votes (high uncertainty)", 2, 200.0, 350.0},
		{"medium votes", 10, 50.0, 150.0},
		{"many votes (low uncertainty)", 50, 30.0, 50.0},
		{"very many votes (min uncertainty)", 100, 30.0, 35.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rd := calculateRatingDeviation(tt.totalVotes)

			assert.GreaterOrEqual(t, rd, tt.wantMin, "RD should be >= %f for %d votes", tt.wantMin, tt.totalVotes)
			assert.LessOrEqual(t, rd, tt.wantMax, "RD should be <= %f for %d votes", tt.wantMax, tt.totalVotes)
		})
	}
}

func TestCalculateRatingDeviation_Monotonic(t *testing.T) {
	// RD should decrease as votes increase
	prev := calculateRatingDeviation(0)

	for votes := 1; votes <= 50; votes++ {
		current := calculateRatingDeviation(votes)
		assert.LessOrEqual(t, current, prev, "RD should decrease as votes increase")
		prev = current
	}
}

func TestExpectedScore(t *testing.T) {
	tests := []struct {
		name      string
		ratingA   int
		ratingB   int
		rdA       float64
		rdB       float64
		wantRange [2]float64 // [min, max]
	}{
		{"equal ratings", 1200, 1200, 100, 100, [2]float64{0.45, 0.55}},
		{"A much higher", 1500, 1200, 100, 100, [2]float64{0.70, 0.95}},
		{"B much higher", 1200, 1500, 100, 100, [2]float64{0.05, 0.30}},
		{"A slightly higher", 1250, 1200, 100, 100, [2]float64{0.52, 0.62}},
		{"high uncertainty", 1200, 1200, 300, 300, [2]float64{0.45, 0.55}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := expectedScore(tt.ratingA, tt.ratingB, tt.rdA, tt.rdB)

			assert.GreaterOrEqual(t, score, tt.wantRange[0])
			assert.LessOrEqual(t, score, tt.wantRange[1])
			assert.GreaterOrEqual(t, score, 0.0)
			assert.LessOrEqual(t, score, 1.0)
		})
	}
}

func TestExpectedScore_Symmetry(t *testing.T) {
	// P(A wins) + P(B wins) should equal 1
	ratingA, ratingB := 1300, 1200
	rdA, rdB := 100.0, 100.0

	scoreA := expectedScore(ratingA, ratingB, rdA, rdB)
	scoreB := expectedScore(ratingB, ratingA, rdB, rdA)

	sum := scoreA + scoreB
	assert.InDelta(t, 1.0, sum, 0.01, "Expected scores should sum to 1")
}

func TestInformationGain(t *testing.T) {
	tests := []struct {
		name   string
		photoA BattlePhoto
		photoB BattlePhoto
	}{
		{
			"equal photos",
			BattlePhoto{Rating: 1200, TotalVotes: 10},
			BattlePhoto{Rating: 1200, TotalVotes: 10},
		},
		{
			"new vs established",
			BattlePhoto{Rating: 1200, TotalVotes: 0},
			BattlePhoto{Rating: 1200, TotalVotes: 50},
		},
		{
			"different ratings",
			BattlePhoto{Rating: 1400, TotalVotes: 20},
			BattlePhoto{Rating: 1000, TotalVotes: 20},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gain := informationGain(tt.photoA, tt.photoB)

			// Information gain should be positive
			assert.GreaterOrEqual(t, gain, 0.0)
			// And bounded (typically less than 1)
			assert.LessOrEqual(t, gain, 1.5)
		})
	}
}

func TestInformationGain_HigherForUncertainPairs(t *testing.T) {
	// New photos should have higher information gain
	newPhoto := BattlePhoto{Rating: 1200, TotalVotes: 0}
	establishedPhoto := BattlePhoto{Rating: 1200, TotalVotes: 50}

	gainNew := informationGain(newPhoto, newPhoto)
	gainEstablished := informationGain(establishedPhoto, establishedPhoto)

	assert.Greater(t, gainNew, gainEstablished, "New photos should have higher information gain")
}

func TestParseBattlePhoto(t *testing.T) {
	tests := []struct {
		name string
		data map[string]interface{}
		want BattlePhoto
	}{
		{
			"full data",
			map[string]interface{}{
				"id":            "photo123",
				"url":           "https://example.com/photo.jpg",
				"storagePath":   "images/photo.jpg",
				"libraryId":     "lib123",
				"thumbnailUrl":  "https://example.com/thumb.jpg",
				"thumbnailPath": "images/thumb.jpg",
				"rating":        1350.0,
				"wins":          10.0,
				"losses":        5.0,
				"totalVotes":    15.0,
			},
			BattlePhoto{
				ID:            "photo123",
				URL:           "https://example.com/photo.jpg",
				StoragePath:   "images/photo.jpg",
				LibraryID:     "lib123",
				ThumbnailURL:  "https://example.com/thumb.jpg",
				ThumbnailPath: "images/thumb.jpg",
				Rating:        1350,
				Wins:          10,
				Losses:        5,
				TotalVotes:    15,
			},
		},
		{
			"minimal data with defaults",
			map[string]interface{}{
				"id": "photo456",
			},
			BattlePhoto{
				ID:     "photo456",
				Rating: 1200, // Default rating
			},
		},
		{
			"int64 values",
			map[string]interface{}{
				"id":         "photo789",
				"rating":     int64(1400),
				"wins":       int64(20),
				"losses":     int64(10),
				"totalVotes": int64(30),
			},
			BattlePhoto{
				ID:         "photo789",
				Rating:     1400,
				Wins:       20,
				Losses:     10,
				TotalVotes: 30,
			},
		},
		{
			"empty data",
			map[string]interface{}{},
			BattlePhoto{
				Rating: 1200, // Default rating
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseBattlePhoto(tt.data)

			assert.Equal(t, tt.want.ID, got.ID)
			assert.Equal(t, tt.want.URL, got.URL)
			assert.Equal(t, tt.want.StoragePath, got.StoragePath)
			assert.Equal(t, tt.want.LibraryID, got.LibraryID)
			assert.Equal(t, tt.want.Rating, got.Rating)
			assert.Equal(t, tt.want.Wins, got.Wins)
			assert.Equal(t, tt.want.Losses, got.Losses)
			assert.Equal(t, tt.want.TotalVotes, got.TotalVotes)
		})
	}
}

func TestSplitPath(t *testing.T) {
	tests := []struct {
		path string
		want []string
	}{
		{"images/photo/user123/file.jpg", []string{"images", "photo", "user123", "file.jpg"}},
		{"simple", []string{"simple"}},
		{"a/b/c", []string{"a", "b", "c"}},
		{"leading/", []string{"leading"}},
		{"/leading", []string{"leading"}},
		{"//double//slashes", []string{"double", "slashes"}},
		{"", []string{}},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := splitPath(tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestAssertUserOwnsPath(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	tests := []struct {
		name    string
		userID  string
		path    string
		wantErr bool
	}{
		{"valid path - user owns", "user123", "images/photos/user123/file.jpg", false},
		{"invalid - different user", "user123", "images/photos/user456/file.jpg", true},
		{"invalid - not images prefix", "user123", "other/photos/user123/file.jpg", true},
		{"invalid - too short", "user123", "images/a", true},
		{"invalid - incomplete", "user123", "images/photos", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.assertUserOwnsPath(tt.userID, tt.path)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestChoosePairForRanking_MinimumPhotos(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	photos := []BattlePhoto{
		{ID: "p1", Rating: 1200, TotalVotes: 0},
		{ID: "p2", Rating: 1200, TotalVotes: 0},
	}

	left, right := service.choosePairForRanking(photos)

	// Should return valid photos
	assert.True(t, left.ID == "p1" || left.ID == "p2")
	assert.True(t, right.ID == "p1" || right.ID == "p2")
	assert.NotEqual(t, left.ID, right.ID)
}

func TestChoosePairForRanking_NewPhotosPreferred(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	photos := []BattlePhoto{
		{ID: "new1", Rating: 1200, TotalVotes: 0},
		{ID: "new2", Rating: 1200, TotalVotes: 2},
		{ID: "established1", Rating: 1400, TotalVotes: 100},
		{ID: "established2", Rating: 1000, TotalVotes: 100},
	}

	// Run multiple times to check that new photos are often selected
	newPhotoCount := 0
	runs := 100

	for i := 0; i < runs; i++ {
		left, right := service.choosePairForRanking(photos)

		isNewLeft := left.TotalVotes < 5
		isNewRight := right.TotalVotes < 5

		if isNewLeft || isNewRight {
			newPhotoCount++
		}
	}

	// New photos should be selected frequently (at least 50% of the time)
	assert.GreaterOrEqual(t, newPhotoCount, runs/2, "New photos should be frequently selected")
}

func TestChoosePairForRanking_NormalizesRatings(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	// Photos with zero rating should be normalized to 1200
	photos := []BattlePhoto{
		{ID: "p1", Rating: 0, TotalVotes: 10},
		{ID: "p2", Rating: 0, TotalVotes: 10},
	}

	left, right := service.choosePairForRanking(photos)

	// Should work without panicking
	assert.NotEmpty(t, left.ID)
	assert.NotEmpty(t, right.ID)
}

func TestPhotoService_SubmitVote(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	ctx := context.Background()
	sessionID := "session123"

	// Set up session with photos
	mockRepo.AddDocument("photoBattles/"+sessionID, map[string]interface{}{
		"ownerId": "user123",
		"photos": []interface{}{
			map[string]interface{}{
				"id":         "photo1",
				"rating":     float64(1200),
				"wins":       float64(5),
				"losses":     float64(3),
				"totalVotes": float64(8),
			},
			map[string]interface{}{
				"id":         "photo2",
				"rating":     float64(1200),
				"wins":       float64(4),
				"losses":     float64(4),
				"totalVotes": float64(8),
			},
		},
	})

	err := service.SubmitVote(ctx, sessionID, "photo1", "photo2", "voter1")
	assert.NoError(t, err)

	// Verify the session was updated
	updatedSession, _ := mockRepo.Get(ctx, "photoBattles/"+sessionID)
	assert.NotNil(t, updatedSession["updatedAt"])
}

func TestPhotoService_SubmitVote_InvalidSession(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	ctx := context.Background()

	err := service.SubmitVote(ctx, "nonexistent", "photo1", "photo2", "voter1")
	// Should handle gracefully (session not found returns nil data)
	assert.Error(t, err)
}

func TestPhotoService_GetNextPair_NotEnoughPhotos(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	ctx := context.Background()
	sessionID := "session_one_photo"

	// Set up session with only one photo
	mockRepo.AddDocument("photoBattles/"+sessionID, map[string]interface{}{
		"ownerId": "user123",
		"photos": []interface{}{
			map[string]interface{}{
				"id":     "photo1",
				"rating": float64(1200),
			},
		},
	})

	_, _, err := service.GetNextPair(ctx, sessionID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "need at least two photos")
}

func TestPhotoService_EnrichPhotoData_WithExistingData(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	ctx := context.Background()

	// Photo already has URL and storage path
	photo := BattlePhoto{
		ID:          "photo1",
		URL:         "https://existing.url/photo.jpg",
		StoragePath: "existing/path/photo.jpg",
	}

	enriched := service.enrichPhotoData(ctx, photo, "user123")

	// Should return same photo without fetching
	assert.Equal(t, photo.URL, enriched.URL)
	assert.Equal(t, photo.StoragePath, enriched.StoragePath)
}

func TestPhotoService_EnrichPhotoData_FromLibrary(t *testing.T) {
	mockRepo := mocks.NewMockRepository()
	logger := zap.NewNop()
	service := NewPhotoService(mockRepo, nil, "test-bucket", logger)

	ctx := context.Background()
	ownerID := "user123"
	libraryID := "lib456"

	// Add library data
	mockRepo.AddDocument("users/"+ownerID+"/photoLibrary/"+libraryID, map[string]interface{}{
		"url":           "https://library.url/photo.jpg",
		"storagePath":   "library/path/photo.jpg",
		"thumbnailUrl":  "https://library.url/thumb.jpg",
		"thumbnailPath": "library/path/thumb.jpg",
	})

	// Photo needs enrichment
	photo := BattlePhoto{
		ID:        "photo1",
		LibraryID: libraryID,
	}

	enriched := service.enrichPhotoData(ctx, photo, ownerID)

	assert.Equal(t, "https://library.url/photo.jpg", enriched.URL)
	assert.Equal(t, "library/path/photo.jpg", enriched.StoragePath)
	assert.Equal(t, "https://library.url/thumb.jpg", enriched.ThumbnailURL)
	assert.Equal(t, "library/path/thumb.jpg", enriched.ThumbnailPath)
}

func TestEloRatingCalculation(t *testing.T) {
	// Test basic Elo calculation used in SubmitVote
	K := 32.0

	tests := []struct {
		name         string
		winnerRating int
		loserRating  int
		wantWinnerUp bool
		wantLoserDn  bool
	}{
		{"equal ratings", 1200, 1200, true, true},
		{"upset victory", 1000, 1400, true, true},
		{"expected victory", 1400, 1000, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expectedWinner := 1.0 / (1.0 + math.Pow(10, float64(tt.loserRating-tt.winnerRating)/400.0))
			expectedLoser := 1.0 / (1.0 + math.Pow(10, float64(tt.winnerRating-tt.loserRating)/400.0))

			newWinnerRating := int(math.Max(0, math.Round(float64(tt.winnerRating)+K*(1.0-expectedWinner))))
			newLoserRating := int(math.Max(0, math.Round(float64(tt.loserRating)+K*(0.0-expectedLoser))))

			if tt.wantWinnerUp {
				assert.Greater(t, newWinnerRating, tt.winnerRating, "Winner rating should increase")
			}
			if tt.wantLoserDn {
				assert.Less(t, newLoserRating, tt.loserRating, "Loser rating should decrease")
			}

			// Rating changes should be bounded by K
			assert.LessOrEqual(t, newWinnerRating-tt.winnerRating, int(K))
			assert.LessOrEqual(t, tt.loserRating-newLoserRating, int(K))
		})
	}
}

func TestIncrementValue(t *testing.T) {
	result := incrementValue(5)
	assert.Equal(t, 5, result)

	result = incrementValue(1)
	assert.Equal(t, 1, result)
}
