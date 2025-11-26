package services

import (
	"context"
	"fmt"
	"time"

	"github.com/mesbahtanvir/focus-notebook/backend-go/internal/repository/interfaces"
	"go.uber.org/zap"
)

// PackingListService handles packing list operations
type PackingListService struct {
	repo   interfaces.Repository
	logger *zap.Logger
}

// NewPackingListService creates a new packing list service
func NewPackingListService(repo interfaces.Repository, logger *zap.Logger) *PackingListService {
	return &PackingListService{
		repo:   repo,
		logger: logger,
	}
}

// PackingItem represents a single packing item
type PackingItem struct {
	ID          string `json:"id" firestore:"id"`
	Name        string `json:"name" firestore:"name"`
	Description string `json:"description,omitempty" firestore:"description,omitempty"`
	Quantity    string `json:"quantity,omitempty" firestore:"quantity,omitempty"`
	Tip         string `json:"tip,omitempty" firestore:"tip,omitempty"`
	Custom      bool   `json:"custom,omitempty" firestore:"custom,omitempty"`
}

// PackingGroup represents a group of packing items
type PackingGroup struct {
	ID          string         `json:"id" firestore:"id"`
	Title       string         `json:"title" firestore:"title"`
	Icon        string         `json:"icon,omitempty" firestore:"icon,omitempty"`
	Description string         `json:"description,omitempty" firestore:"description,omitempty"`
	Items       []PackingItem  `json:"items" firestore:"items"`
}

// PackingSection represents a section of the packing list
type PackingSection struct {
	ID      string          `json:"id" firestore:"id"`
	Title   string          `json:"title" firestore:"title"`
	Emoji   string          `json:"emoji,omitempty" firestore:"emoji,omitempty"`
	Summary string          `json:"summary,omitempty" firestore:"summary,omitempty"`
	Groups  []PackingGroup  `json:"groups" firestore:"groups"`
}

// CustomItemsState represents custom items per section
type CustomItemsState map[string][]PackingItem

// PackingList represents the complete packing list
type PackingList struct {
	ID            string            `json:"id" firestore:"-"`
	TripID        string            `json:"tripId" firestore:"tripId"`
	UserID        string            `json:"userId" firestore:"userId"`
	Sections      []PackingSection  `json:"sections" firestore:"sections"`
	PackedItemIDs []string          `json:"packedItemIds" firestore:"packedItemIds"`
	ItemStatuses  map[string]string `json:"itemStatuses" firestore:"itemStatuses"`
	CustomItems   CustomItemsState  `json:"customItems" firestore:"customItems"`
	CreatedAt     time.Time         `json:"createdAt" firestore:"createdAt"`
	UpdatedAt     time.Time         `json:"updatedAt,omitempty" firestore:"updatedAt,omitempty"`
}

// CreatePackingList creates a new packing list for a trip
func (s *PackingListService) CreatePackingList(
	ctx context.Context,
	userID string,
	tripID string,
) (*PackingList, error) {
	// Verify trip ownership
	tripPath := fmt.Sprintf("users/%s/trips/%s", userID, tripID)
	tripData, err := s.repo.Get(ctx, tripPath)
	if err != nil {
		return nil, fmt.Errorf("trip not found: %w", err)
	}

	// Check if packing list already exists
	packingListPath := fmt.Sprintf("%s/packingList/data", tripPath)
	existing, err := s.repo.Get(ctx, packingListPath)
	if err == nil && existing != nil {
		// Parse and return existing
		return parsePackingList(tripID, existing), nil
	}

	// Build base packing list with simplified templates
	sections := buildBaseSections()

	packingList := &PackingList{
		ID:            tripID,
		TripID:        tripID,
		UserID:        userID,
		Sections:      sections,
		PackedItemIDs: []string{},
		ItemStatuses:  make(map[string]string),
		CustomItems:   make(CustomItemsState),
		CreatedAt:     time.Now(),
	}

	// Save to Firestore
	packingListData := packingListToMap(packingList)
	if err := s.repo.Create(ctx, packingListPath, packingListData); err != nil {
		return nil, fmt.Errorf("failed to create packing list: %w", err)
	}

	return packingList, nil
}

// UpdatePackingList updates packing list data
func (s *PackingListService) UpdatePackingList(
	ctx context.Context,
	userID string,
	tripID string,
	updates map[string]interface{},
) error {
	// Verify trip ownership
	tripPath := fmt.Sprintf("users/%s/trips/%s", userID, tripID)
	if _, err := s.repo.Get(ctx, tripPath); err != nil {
		return fmt.Errorf("trip not found: %w", err)
	}

	// Update packing list
	packingListPath := fmt.Sprintf("%s/packingList/data", tripPath)
	if _, err := s.repo.Get(ctx, packingListPath); err != nil {
		return fmt.Errorf("packing list not found: %w", err)
	}

	updates["updatedAt"] = time.Now()
	if err := s.repo.Update(ctx, packingListPath, updates); err != nil {
		return fmt.Errorf("failed to update packing list: %w", err)
	}

	return nil
}

// SetItemStatus sets the packing status of an item
func (s *PackingListService) SetItemStatus(
	ctx context.Context,
	userID string,
	tripID string,
	itemID string,
	status string,
) error {
	// Validate status
	validStatuses := map[string]bool{
		"unpacked": true,
		"packed":   true,
		"later":    true,
		"no-need":  true,
	}
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: must be one of unpacked, packed, later, no-need")
	}

	// Verify trip ownership
	tripPath := fmt.Sprintf("users/%s/trips/%s", userID, tripID)
	if _, err := s.repo.Get(ctx, tripPath); err != nil {
		return fmt.Errorf("trip not found: %w", err)
	}

	// Get packing list
	packingListPath := fmt.Sprintf("%s/packingList/data", tripPath)
	data, err := s.repo.Get(ctx, packingListPath)
	if err != nil {
		return fmt.Errorf("packing list not found: %w", err)
	}

	// Update item statuses
	itemStatuses := make(map[string]string)
	if statusesRaw, ok := data["itemStatuses"].(map[string]interface{}); ok {
		for k, v := range statusesRaw {
			if vStr, ok := v.(string); ok {
				itemStatuses[k] = vStr
			}
		}
	}
	itemStatuses[itemID] = status

	// For backward compatibility, also update packedItemIds
	packedItemIDs := []string{}
	if idsRaw, ok := data["packedItemIds"].([]interface{}); ok {
		for _, id := range idsRaw {
			if idStr, ok := id.(string); ok {
				packedItemIDs = append(packedItemIDs, idStr)
			}
		}
	}

	if status == "packed" {
		// Add to packed
		found := false
		for _, id := range packedItemIDs {
			if id == itemID {
				found = true
				break
			}
		}
		if !found {
			packedItemIDs = append(packedItemIDs, itemID)
		}
	} else {
		// Remove from packed
		newPacked := []string{}
		for _, id := range packedItemIDs {
			if id != itemID {
				newPacked = append(newPacked, id)
			}
		}
		packedItemIDs = newPacked
	}

	// Update
	updates := map[string]interface{}{
		"itemStatuses":  itemStatuses,
		"packedItemIds": packedItemIDs,
		"updatedAt":     time.Now(),
	}

	if err := s.repo.Update(ctx, packingListPath, updates); err != nil {
		return fmt.Errorf("failed to update item status: %w", err)
	}

	return nil
}

// buildBaseSections creates base packing list sections
func buildBaseSections() []PackingSection {
	return []PackingSection{
		{
			ID:      "essentials",
			Title:   "Travel Essentials",
			Emoji:   "🧳",
			Summary: "Documents, health items, and day-of travel basics.",
			Groups: []PackingGroup{
				{
					ID:          "documents",
					Title:       "Documents & Access",
					Icon:        "🛂",
					Description: "Everything you need to get out the door.",
					Items: []PackingItem{
						{ID: "essentials-passport", Name: "Passport / ID", Tip: "Store with travel wallet for easy reach."},
						{ID: "essentials-driving-license", Name: "Driving license", Description: "Required for car rentals and additional ID."},
						{ID: "essentials-itinerary", Name: "Itinerary + confirmations", Description: "Addresses, reservation codes, and tickets."},
						{ID: "essentials-insurance", Name: "Travel insurance info", Description: "Policy number, emergency contacts, coverage details."},
					},
				},
				{
					ID:          "money-financial",
					Title:       "Money & Financial Prep",
					Icon:        "💳",
					Description: "Currency and payment preparation.",
					Items: []PackingItem{
						{ID: "essentials-credit-cards", Name: "Credit cards", Tip: "Primary card plus backup card stored separately."},
						{ID: "essentials-local-currency", Name: "Get local currency from bank"},
						{ID: "essentials-notify-cards", Name: "Notify credit card companies", Tip: "Inform banks of international travel dates."},
					},
				},
				{
					ID:          "daily",
					Title:       "Carry-on Daily Kit",
					Icon:        "👜",
					Description: "Comfort and essentials for the journey itself.",
					Items: []PackingItem{
						{ID: "essentials-keys", Name: "Keys", Description: "House keys and any other essential keys."},
						{ID: "essentials-snacks", Name: "Snacks & hydration", Description: "Reusable bottle, protein snack, gum."},
						{ID: "essentials-comfort", Name: "Comfort items", Tip: "Neck pillow, sleep mask, or cozy scarf."},
						{ID: "essentials-health", Name: "Health essentials", Description: "Meds, supplements, motion sickness aids."},
					},
				},
			},
		},
		{
			ID:      "clothing",
			Title:   "Clothing & Layers",
			Emoji:   "🧥",
			Summary: "Build a flexible capsule wardrobe for the trip length.",
			Groups: []PackingGroup{
				{
					ID:          "wardrobe",
					Title:       "Core Wardrobe",
					Icon:        "👚",
					Description: "Mix-and-match outfits for day to night.",
					Items: []PackingItem{
						{ID: "clothing-tops", Name: "Tops", Quantity: "4-6", Tip: "Blend breathable and dressier options."},
						{ID: "clothing-bottoms", Name: "Bottoms", Quantity: "2-3", Description: "Casual + polished pairings."},
						{ID: "clothing-dressy", Name: "Elevated outfit", Quantity: "1", Tip: "Pack one piece that instantly dresses up."},
					},
				},
				{
					ID:          "footwear",
					Title:       "Footwear",
					Icon:        "👟",
					Description: "Comfortable shoes for all activities.",
					Items: []PackingItem{
						{ID: "clothing-white-sneakers", Name: "White sneakers (daily wear)", Tip: "Versatile and comfortable."},
						{ID: "clothing-sandals", Name: "Sandals / Beach shoes"},
						{ID: "clothing-hiking-shoes", Name: "Lightweight hiking or walking shoes"},
					},
				},
				{
					ID:          "foundations",
					Title:       "Foundations",
					Icon:        "🧦",
					Description: "Underlayers that keep you comfortable.",
					Items: []PackingItem{
						{ID: "clothing-underwear", Name: "Underwear", Quantity: "7+ days", Tip: "Quick-dry fabric."},
						{ID: "clothing-socks", Name: "Socks", Quantity: "3-5 pairs"},
						{ID: "clothing-sleep", Name: "Sleepwear", Quantity: "1-2 sets"},
					},
				},
			},
		},
		{
			ID:      "personal",
			Title:   "Personal Care",
			Emoji:   "🧴",
			Summary: "Toiletries, wellness, and day-to-day routines.",
			Groups: []PackingGroup{
				{
					ID:          "toiletries",
					Title:       "Toiletry Kit (Travel-Size)",
					Icon:        "🪥",
					Description: "Mini versions of your daily routine.",
					Items: []PackingItem{
						{ID: "personal-toothbrush", Name: "Toothbrush + paste"},
						{ID: "personal-razor", Name: "Razor & trimmer"},
						{ID: "personal-skincare", Name: "Skincare basics", Tip: "Cleanser, moisturizer, SPF."},
						{ID: "personal-hair", Name: "Hair care essentials"},
						{ID: "personal-shower", Name: "Shower essentials", Description: "Travel-size shampoo, conditioner, body wash."},
						{ID: "personal-deodorant", Name: "Deodorant"},
					},
				},
				{
					ID:          "wellness",
					Title:       "Wellness & Health",
					Icon:        "💊",
					Description: "Keep energy steady on the road.",
					Items: []PackingItem{
						{ID: "personal-meds", Name: "Medications & supplements", Tip: "Pack a full supply + prescription copies."},
						{ID: "personal-firstaid", Name: "Mini first-aid kit", Description: "Bandages, pain relief, motion sickness aids."},
					},
				},
			},
		},
		{
			ID:      "tech",
			Title:   "Tech & Power",
			Emoji:   "🔌",
			Summary: "Stay connected and powered up anywhere.",
			Groups: []PackingGroup{
				{
					ID:          "devices",
					Title:       "Devices",
					Icon:        "📱",
					Description: "Core electronics for travel days and downtime.",
					Items: []PackingItem{
						{ID: "tech-phone", Name: "Phone + charger"},
						{ID: "tech-laptop", Name: "Laptop + charger"},
						{ID: "tech-headphones", Name: "Headphones"},
					},
				},
				{
					ID:          "power",
					Title:       "Power & Connectivity",
					Icon:        "🔋",
					Description: "Adapters, cables, and portable power.",
					Items: []PackingItem{
						{ID: "tech-adapter", Name: "Universal travel adapter"},
						{ID: "tech-powerbank", Name: "Power bank", Tip: "10,000+ mAh keeps phones topped up."},
						{ID: "tech-cables", Name: "Charging cables"},
					},
				},
			},
		},
		{
			ID:      "extras",
			Title:   "Comfort Extras",
			Emoji:   "🌟",
			Summary: "Optional upgrades and personal touches.",
			Groups: []PackingGroup{
				{
					ID:          "comfort",
					Title:       "Transit Comfort",
					Icon:        "🪑",
					Description: "Make long travel days easier.",
					Items: []PackingItem{
						{ID: "extras-blanket", Name: "Lightweight blanket or wrap"},
						{ID: "extras-eye", Name: "Sleep kit", Tip: "Eye mask and earplugs."},
						{ID: "extras-sunglasses", Name: "Sunglasses"},
					},
				},
			},
		},
	}
}

// packingListToMap converts PackingList to map for Firestore
func packingListToMap(pl *PackingList) map[string]interface{} {
	return map[string]interface{}{
		"tripId":        pl.TripID,
		"userId":        pl.UserID,
		"sections":      pl.Sections,
		"packedItemIds": pl.PackedItemIDs,
		"itemStatuses":  pl.ItemStatuses,
		"customItems":   pl.CustomItems,
		"createdAt":     pl.CreatedAt,
	}
}

// parsePackingList parses Firestore data into PackingList
func parsePackingList(tripID string, data map[string]interface{}) *PackingList {
	pl := &PackingList{
		ID:            tripID,
		PackedItemIDs: []string{},
		ItemStatuses:  make(map[string]string),
		CustomItems:   make(CustomItemsState),
	}

	if tripIDVal, ok := data["tripId"].(string); ok {
		pl.TripID = tripIDVal
	}
	if userIDVal, ok := data["userId"].(string); ok {
		pl.UserID = userIDVal
	}
	if createdAt, ok := data["createdAt"].(time.Time); ok {
		pl.CreatedAt = createdAt
	}
	if updatedAt, ok := data["updatedAt"].(time.Time); ok {
		pl.UpdatedAt = updatedAt
	}

	// Parse sections
	if sectionsRaw, ok := data["sections"].([]interface{}); ok {
		sections := []PackingSection{}
		for _, sectionData := range sectionsRaw {
			if sectionMap, ok := sectionData.(map[string]interface{}); ok {
				section := parseSection(sectionMap)
				sections = append(sections, section)
			}
		}
		pl.Sections = sections
	}

	// Parse packed items
	if packedRaw, ok := data["packedItemIds"].([]interface{}); ok {
		for _, id := range packedRaw {
			if idStr, ok := id.(string); ok {
				pl.PackedItemIDs = append(pl.PackedItemIDs, idStr)
			}
		}
	}

	// Parse item statuses
	if statusesRaw, ok := data["itemStatuses"].(map[string]interface{}); ok {
		for k, v := range statusesRaw {
			if vStr, ok := v.(string); ok {
				pl.ItemStatuses[k] = vStr
			}
		}
	}

	return pl
}

// parseSection parses a section from map
func parseSection(data map[string]interface{}) PackingSection {
	section := PackingSection{
		Groups: []PackingGroup{},
	}

	if id, ok := data["id"].(string); ok {
		section.ID = id
	}
	if title, ok := data["title"].(string); ok {
		section.Title = title
	}
	if emoji, ok := data["emoji"].(string); ok {
		section.Emoji = emoji
	}
	if summary, ok := data["summary"].(string); ok {
		section.Summary = summary
	}

	if groupsRaw, ok := data["groups"].([]interface{}); ok {
		for _, groupData := range groupsRaw {
			if groupMap, ok := groupData.(map[string]interface{}); ok {
				group := parseGroup(groupMap)
				section.Groups = append(section.Groups, group)
			}
		}
	}

	return section
}

// parseGroup parses a group from map
func parseGroup(data map[string]interface{}) PackingGroup {
	group := PackingGroup{
		Items: []PackingItem{},
	}

	if id, ok := data["id"].(string); ok {
		group.ID = id
	}
	if title, ok := data["title"].(string); ok {
		group.Title = title
	}
	if icon, ok := data["icon"].(string); ok {
		group.Icon = icon
	}
	if desc, ok := data["description"].(string); ok {
		group.Description = desc
	}

	if itemsRaw, ok := data["items"].([]interface{}); ok {
		for _, itemData := range itemsRaw {
			if itemMap, ok := itemData.(map[string]interface{}); ok {
				item := parseItem(itemMap)
				group.Items = append(group.Items, item)
			}
		}
	}

	return group
}

// parseItem parses an item from map
func parseItem(data map[string]interface{}) PackingItem {
	item := PackingItem{}

	if id, ok := data["id"].(string); ok {
		item.ID = id
	}
	if name, ok := data["name"].(string); ok {
		item.Name = name
	}
	if desc, ok := data["description"].(string); ok {
		item.Description = desc
	}
	if qty, ok := data["quantity"].(string); ok {
		item.Quantity = qty
	}
	if tip, ok := data["tip"].(string); ok {
		item.Tip = tip
	}
	if custom, ok := data["custom"].(bool); ok {
		item.Custom = custom
	}

	return item
}
