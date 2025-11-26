package services

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"sort"
	"time"

	"cloud.google.com/go/storage"
	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository/interfaces"
	"go.uber.org/zap"
	"google.golang.org/api/option"
)

// PhotoService handles photo voting, Elo ratings, and signed URLs
type PhotoService struct {
	repo          interfaces.Repository
	storageClient *storage.Client
	storageBucket string
	logger        *zap.Logger
}

// NewPhotoService creates a new photo service
func NewPhotoService(
	repo interfaces.Repository,
	storageClient *storage.Client,
	storageBucket string,
	logger *zap.Logger,
) *PhotoService {
	return &PhotoService{
		repo:          repo,
		storageClient: storageClient,
		storageBucket: storageBucket,
		logger:        logger,
	}
}

// BattlePhoto represents a photo in a battle session
type BattlePhoto struct {
	ID           string  `json:"id" firestore:"id"`
	URL          string  `json:"url" firestore:"url"`
	StoragePath  string  `json:"storagePath" firestore:"storagePath"`
	LibraryID    string  `json:"libraryId,omitempty" firestore:"libraryId,omitempty"`
	ThumbnailURL string  `json:"thumbnailUrl,omitempty" firestore:"thumbnailUrl,omitempty"`
	ThumbnailPath string `json:"thumbnailPath,omitempty" firestore:"thumbnailPath,omitempty"`
	Rating       int     `json:"rating" firestore:"rating"`
	Wins         int     `json:"wins" firestore:"wins"`
	Losses       int     `json:"losses" firestore:"losses"`
	TotalVotes   int     `json:"totalVotes" firestore:"totalVotes"`
}

// PhotoBattle represents a photo battle session
type PhotoBattle struct {
	ID           string                 `json:"id" firestore:"-"`
	OwnerID      string                 `json:"ownerId" firestore:"ownerId"`
	Photos       []BattlePhoto          `json:"photos" firestore:"photos"`
	PhotoAliases map[string]string      `json:"photoAliases,omitempty" firestore:"photoAliases,omitempty"`
	SecretKey    string                 `json:"secretKey" firestore:"secretKey"`
	CreatedAt    time.Time              `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time              `json:"updatedAt,omitempty" firestore:"updatedAt,omitempty"`
}

// VoteHistory represents a vote history entry
type VoteHistory struct {
	WinnerID  string     `json:"winnerId" firestore:"winnerId"`
	LoserID   string     `json:"loserId" firestore:"loserId"`
	VoterID   string     `json:"voterId,omitempty" firestore:"voterId,omitempty"`
	CreatedAt time.Time  `json:"createdAt" firestore:"createdAt"`
}

// SubmitVote processes a photo vote using Elo rating algorithm
func (s *PhotoService) SubmitVote(
	ctx context.Context,
	sessionID string,
	winnerID string,
	loserID string,
	voterID string,
) error {
	// Get session
	sessionPath := fmt.Sprintf("photoBattles/%s", sessionID)
	sessionData, err := s.repo.Get(ctx, sessionPath)
	if err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Parse photos
	photosRaw, ok := sessionData["photos"].([]interface{})
	if !ok {
		return fmt.Errorf("invalid photos data")
	}

	photos := make([]BattlePhoto, len(photosRaw))
	for i, p := range photosRaw {
		photoMap, ok := p.(map[string]interface{})
		if !ok {
			continue
		}
		photos[i] = parseBattlePhoto(photoMap)
	}

	// Find winner and loser
	var winner, loser *BattlePhoto
	var winnerIdx, loserIdx int
	for i := range photos {
		if photos[i].ID == winnerID {
			winner = &photos[i]
			winnerIdx = i
		}
		if photos[i].ID == loserID {
			loser = &photos[i]
			loserIdx = i
		}
	}

	if winner == nil || loser == nil {
		return fmt.Errorf("invalid photos selected")
	}

	ownerID, _ := sessionData["ownerId"].(string)
	winnerLibraryID := winner.LibraryID
	loserLibraryID := loser.LibraryID

	// Calculate Elo ratings
	K := 32.0
	expectedWinner := 1.0 / (1.0 + math.Pow(10, float64(loser.Rating-winner.Rating)/400.0))
	expectedLoser := 1.0 / (1.0 + math.Pow(10, float64(winner.Rating-loser.Rating)/400.0))

	winner.Rating = int(math.Max(0, math.Round(float64(winner.Rating)+K*(1.0-expectedWinner))))
	loser.Rating = int(math.Max(0, math.Round(float64(loser.Rating)+K*(0.0-expectedLoser))))
	winner.Wins++
	winner.TotalVotes++
	loser.Losses++
	loser.TotalVotes++

	// Update photos in array
	photos[winnerIdx] = *winner
	photos[loserIdx] = *loser

	// Update session
	updateData := map[string]interface{}{
		"photos":    photos,
		"updatedAt": time.Now(),
	}
	if err := s.repo.Update(ctx, sessionPath, updateData); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// Save vote history
	historyPath := fmt.Sprintf("%s/history/%d", sessionPath, time.Now().UnixNano())
	historyData := map[string]interface{}{
		"winnerId":  winnerID,
		"loserId":   loserID,
		"voterId":   voterID,
		"createdAt": time.Now(),
	}
	if err := s.repo.Create(ctx, historyPath, historyData); err != nil {
		s.logger.Warn("Failed to save vote history", zap.Error(err))
	}

	// Update library stats (if library IDs exist)
	if ownerID != "" {
		if winnerLibraryID != "" {
			s.updateLibraryStats(ctx, ownerID, winnerLibraryID, "win", sessionID)
		}
		if loserLibraryID != "" {
			s.updateLibraryStats(ctx, ownerID, loserLibraryID, "loss", sessionID)
		}
	}

	return nil
}

// updateLibraryStats updates photo library stats
func (s *PhotoService) updateLibraryStats(
	ctx context.Context,
	ownerID string,
	libraryID string,
	result string,
	sessionID string,
) {
	statsPath := fmt.Sprintf("users/%s/photoLibrary/%s", ownerID, libraryID)

	// Get current data to check session tracking
	data, err := s.repo.Get(ctx, statsPath)
	if err != nil {
		s.logger.Warn("Failed to get library stats", zap.Error(err))
		return
	}

	sessionIDs := []string{}
	if sessionsRaw, ok := data["sessionIds"].([]interface{}); ok {
		for _, sid := range sessionsRaw {
			if sidStr, ok := sid.(string); ok {
				sessionIDs = append(sessionIDs, sidStr)
			}
		}
	}

	alreadyCounted := false
	for _, sid := range sessionIDs {
		if sid == sessionID {
			alreadyCounted = true
			break
		}
	}

	// Update stats
	updates := map[string]interface{}{
		"stats.totalVotes":  incrementValue(1),
		"stats.lastVotedAt": time.Now(),
	}

	if result == "win" {
		updates["stats.yesVotes"] = incrementValue(1)
	}

	if !alreadyCounted {
		updates["stats.sessionCount"] = incrementValue(1)
		sessionIDs = append(sessionIDs, sessionID)
		updates["sessionIds"] = sessionIDs
	}

	if err := s.repo.Update(ctx, statsPath, updates); err != nil {
		s.logger.Warn("Failed to update library stats", zap.Error(err))
	}
}

// Helper to create increment value
func incrementValue(n int) interface{} {
	// This is a placeholder - in actual implementation would use Firestore FieldValue.increment
	// For now we'll handle it differently
	return n
}

// GetNextPair selects the next optimal photo pair using Swiss-system pairing
func (s *PhotoService) GetNextPair(ctx context.Context, sessionID string) (*BattlePhoto, *BattlePhoto, error) {
	// Get session
	sessionPath := fmt.Sprintf("photoBattles/%s", sessionID)
	sessionData, err := s.repo.Get(ctx, sessionPath)
	if err != nil {
		return nil, nil, fmt.Errorf("session not found: %w", err)
	}

	// Parse photos
	photosRaw, ok := sessionData["photos"].([]interface{})
	if !ok || len(photosRaw) < 2 {
		return nil, nil, fmt.Errorf("need at least two photos for a battle")
	}

	photos := make([]BattlePhoto, len(photosRaw))
	for i, p := range photosRaw {
		photoMap, ok := p.(map[string]interface{})
		if !ok {
			continue
		}
		photos[i] = parseBattlePhoto(photoMap)
	}

	if len(photos) < 2 {
		return nil, nil, fmt.Errorf("need at least two photos for a battle")
	}

	// Choose pair using Swiss-system algorithm
	left, right := s.choosePairForRanking(photos)

	// Enrich with library data if needed
	ownerID, _ := sessionData["ownerId"].(string)
	enrichedLeft := s.enrichPhotoData(ctx, left, ownerID)
	enrichedRight := s.enrichPhotoData(ctx, right, ownerID)

	return &enrichedLeft, &enrichedRight, nil
}

// choosePairForRanking implements Swiss-system inspired pairing with Glicko-2 confidence tracking
func (s *PhotoService) choosePairForRanking(photos []BattlePhoto) (BattlePhoto, BattlePhoto) {
	// Normalize photos with defaults
	normalized := make([]BattlePhoto, len(photos))
	for i, photo := range photos {
		normalized[i] = photo
		if normalized[i].Rating == 0 {
			normalized[i].Rating = 1200
		}
	}

	// Calculate rating deviation for each photo
	type enrichedPhoto struct {
		BattlePhoto
		rd       float64
		priority float64
	}

	enriched := make([]enrichedPhoto, len(normalized))
	for i, photo := range normalized {
		rd := calculateRatingDeviation(photo.TotalVotes)
		priority := rd/350.0 + (1.0 / (1.0 + float64(photo.TotalVotes)*0.1))
		enriched[i] = enrichedPhoto{
			BattlePhoto: photo,
			rd:          rd,
			priority:    priority,
		}
	}

	// Phase 1: Exploration - bootstrap new photos (< 5 votes)
	newPhotos := []enrichedPhoto{}
	for _, p := range enriched {
		if p.TotalVotes < 5 {
			newPhotos = append(newPhotos, p)
		}
	}

	if len(newPhotos) >= 2 {
		// Pair new photos with each other
		rand.Shuffle(len(newPhotos), func(i, j int) {
			newPhotos[i], newPhotos[j] = newPhotos[j], newPhotos[i]
		})
		if rand.Float64() > 0.5 {
			return newPhotos[0].BattlePhoto, newPhotos[1].BattlePhoto
		}
		return newPhotos[1].BattlePhoto, newPhotos[0].BattlePhoto
	}

	if len(newPhotos) == 1 {
		// Pair new photo with established photo near median rating
		newPhoto := newPhotos[0]
		established := []enrichedPhoto{}
		for _, p := range enriched {
			if p.ID != newPhoto.ID && p.TotalVotes >= 5 {
				established = append(established, p)
			}
		}

		if len(established) > 0 {
			medianRating := 1200
			sort.Slice(established, func(i, j int) bool {
				return math.Abs(float64(established[i].Rating-medianRating)) <
					math.Abs(float64(established[j].Rating-medianRating))
			})

			poolSize := 3
			if len(established) < poolSize {
				poolSize = len(established)
			}
			opponent := established[rand.Intn(poolSize)]

			if rand.Float64() > 0.5 {
				return newPhoto.BattlePhoto, opponent.BattlePhoto
			}
			return opponent.BattlePhoto, newPhoto.BattlePhoto
		}
	}

	// Phase 2: Exploitation - maximize information gain
	sort.Slice(enriched, func(i, j int) bool {
		return enriched[i].priority > enriched[j].priority
	})

	// Select anchor from top 30%
	anchorPoolSize := int(math.Max(2, math.Ceil(float64(len(enriched))*0.3)))
	anchor := enriched[rand.Intn(anchorPoolSize)]

	// Find best opponents by information gain
	type candidate struct {
		photo      enrichedPhoto
		gain       float64
		ratingDiff int
	}

	candidates := []candidate{}
	for _, opponent := range enriched {
		if opponent.ID == anchor.ID {
			continue
		}
		gain := informationGain(anchor.BattlePhoto, opponent.BattlePhoto)
		ratingDiff := int(math.Abs(float64(anchor.Rating - opponent.Rating)))
		candidates = append(candidates, candidate{
			photo:      opponent,
			gain:       gain,
			ratingDiff: ratingDiff,
		})
	}

	if len(candidates) == 0 {
		// Fallback: just return first two photos
		return enriched[0].BattlePhoto, enriched[1].BattlePhoto
	}

	// Sort by information gain
	sort.Slice(candidates, func(i, j int) bool {
		gainDiff := candidates[j].gain - candidates[i].gain
		if math.Abs(gainDiff) > 0.01 {
			return gainDiff > 0
		}
		return candidates[i].ratingDiff < candidates[j].ratingDiff
	})

	// Select from top 20%
	opponentPoolSize := int(math.Max(3, math.Ceil(float64(len(candidates))*0.2)))
	if opponentPoolSize > len(candidates) {
		opponentPoolSize = len(candidates)
	}

	// Weighted random selection
	totalWeight := 0.0
	for i := 0; i < opponentPoolSize; i++ {
		totalWeight += candidates[i].gain
	}

	random := rand.Float64() * totalWeight
	chosen := candidates[0]
	for i := 0; i < opponentPoolSize; i++ {
		random -= candidates[i].gain
		if random <= 0 {
			chosen = candidates[i]
			break
		}
	}

	// Randomize order
	if rand.Float64() > 0.5 {
		return anchor.BattlePhoto, chosen.photo.BattlePhoto
	}
	return chosen.photo.BattlePhoto, anchor.BattlePhoto
}

// calculateRatingDeviation calculates Glicko-2 inspired confidence metric
func calculateRatingDeviation(totalVotes int) float64 {
	minRD := 30.0
	maxRD := 350.0
	decayRate := 0.15

	return minRD + (maxRD-minRD)*math.Exp(-decayRate*float64(totalVotes))
}

// expectedScore calculates expected match outcome using Glicko-2 formula
func expectedScore(ratingA, ratingB int, rdA, rdB float64) float64 {
	Q := math.Ln10 / 400.0
	g := 1.0 / math.Sqrt(1.0+3.0*Q*Q*(rdA*rdA+rdB*rdB)/(math.Pi*math.Pi))
	return 1.0 / (1.0 + math.Pow(10, -g*float64(ratingA-ratingB)/400.0))
}

// informationGain calculates information gain from a potential matchup
func informationGain(photoA, photoB BattlePhoto) float64 {
	rdA := calculateRatingDeviation(photoA.TotalVotes)
	rdB := calculateRatingDeviation(photoB.TotalVotes)

	expected := expectedScore(photoA.Rating, photoB.Rating, rdA, rdB)
	outcomeVariance := expected * (1.0 - expected)
	uncertaintyFactor := (rdA + rdB) / (2.0 * 350.0)

	return 0.7*outcomeVariance + 0.3*uncertaintyFactor
}

// enrichPhotoData enriches photo with library data
func (s *PhotoService) enrichPhotoData(ctx context.Context, photo BattlePhoto, ownerID string) BattlePhoto {
	// If photo already has url and storagePath, return as is
	if photo.URL != "" && photo.StoragePath != "" {
		return photo
	}

	// Otherwise, fetch from library
	if photo.LibraryID == "" || ownerID == "" {
		return photo
	}

	libraryPath := fmt.Sprintf("users/%s/photoLibrary/%s", ownerID, photo.LibraryID)
	libraryData, err := s.repo.Get(ctx, libraryPath)
	if err != nil {
		return photo
	}

	if url, ok := libraryData["url"].(string); ok && url != "" {
		photo.URL = url
	}
	if storagePath, ok := libraryData["storagePath"].(string); ok && storagePath != "" {
		photo.StoragePath = storagePath
	}
	if thumbnailURL, ok := libraryData["thumbnailUrl"].(string); ok {
		photo.ThumbnailURL = thumbnailURL
	}
	if thumbnailPath, ok := libraryData["thumbnailPath"].(string); ok {
		photo.ThumbnailPath = thumbnailPath
	}

	return photo
}

// GetSignedURL generates a signed URL for a storage path
func (s *PhotoService) GetSignedURL(
	ctx context.Context,
	userID string,
	path string,
	expiresAt *time.Time,
) (string, time.Time, error) {
	// Verify user owns the path
	if err := s.assertUserOwnsPath(userID, path); err != nil {
		return "", time.Time{}, err
	}

	// Default expiry: 5 years
	expires := time.Now().Add(5 * 365 * 24 * time.Hour)
	if expiresAt != nil {
		expires = *expiresAt
	}

	// Generate signed URL
	bucket := s.storageClient.Bucket(s.storageBucket)
	file := bucket.Object(path)

	url, err := file.SignedURL(&storage.SignedURLOptions{
		Method:  "GET",
		Expires: expires,
	})
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to generate signed URL: %w", err)
	}

	return url, expires, nil
}

// assertUserOwnsPath verifies user owns the storage path
func (s *PhotoService) assertUserOwnsPath(userID string, path string) error {
	// Path must start with "images/"
	if len(path) < 7 || path[:7] != "images/" {
		return fmt.Errorf("invalid storage path")
	}

	// Path format: images/{type}/{uid}/{filename}
	// Split and verify UID matches
	segments := splitPath(path)
	if len(segments) < 4 {
		return fmt.Errorf("path is incomplete")
	}

	pathUID := segments[2]
	if pathUID != userID {
		return fmt.Errorf("permission denied: cannot access other users' files")
	}

	return nil
}

// Helper to split path by '/'
func splitPath(path string) []string {
	result := []string{}
	current := ""
	for _, c := range path {
		if c == '/' {
			if current != "" {
				result = append(result, current)
				current = ""
			}
		} else {
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

// parseBattlePhoto parses a BattlePhoto from Firestore data
func parseBattlePhoto(data map[string]interface{}) BattlePhoto {
	photo := BattlePhoto{
		Rating: 1200, // Default rating
	}

	if id, ok := data["id"].(string); ok {
		photo.ID = id
	}
	if url, ok := data["url"].(string); ok {
		photo.URL = url
	}
	if storagePath, ok := data["storagePath"].(string); ok {
		photo.StoragePath = storagePath
	}
	if libraryID, ok := data["libraryId"].(string); ok {
		photo.LibraryID = libraryID
	}
	if thumbnailURL, ok := data["thumbnailUrl"].(string); ok {
		photo.ThumbnailURL = thumbnailURL
	}
	if thumbnailPath, ok := data["thumbnailPath"].(string); ok {
		photo.ThumbnailPath = thumbnailPath
	}
	if rating, ok := data["rating"].(int64); ok {
		photo.Rating = int(rating)
	} else if rating, ok := data["rating"].(float64); ok {
		photo.Rating = int(rating)
	}
	if wins, ok := data["wins"].(int64); ok {
		photo.Wins = int(wins)
	} else if wins, ok := data["wins"].(float64); ok {
		photo.Wins = int(wins)
	}
	if losses, ok := data["losses"].(int64); ok {
		photo.Losses = int(losses)
	} else if losses, ok := data["losses"].(float64); ok {
		photo.Losses = int(losses)
	}
	if totalVotes, ok := data["totalVotes"].(int64); ok {
		photo.TotalVotes = int(totalVotes)
	} else if totalVotes, ok := data["totalVotes"].(float64); ok {
		photo.TotalVotes = int(totalVotes)
	}

	return photo
}
