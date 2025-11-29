package utils

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/mesbahtanvir/focus-notebook/backend/internal/models"
)

// ParseCSVLine parses a single CSV line handling quoted fields properly (RFC 4180)
func ParseCSVLine(line string) []string {
	var result []string
	var current strings.Builder
	inQuotes := false

	for i := 0; i < len(line); i++ {
		char := rune(line[i])

		// Look ahead for next character
		var nextChar rune
		if i+1 < len(line) {
			nextChar = rune(line[i+1])
		}

		if char == '"' {
			if inQuotes && nextChar == '"' {
				// Escaped quote within quoted field
				current.WriteRune('"')
				i++ // Skip next quote
			} else {
				// Toggle quote state
				inQuotes = !inQuotes
			}
		} else if char == ',' && !inQuotes {
			// Field separator outside quotes
			result = append(result, strings.TrimSpace(current.String()))
			current.Reset()
		} else {
			current.WriteRune(char)
		}
	}

	// Push the last field
	result = append(result, strings.TrimSpace(current.String()))

	return result
}

// ParseCSV parses CSV content into transaction objects
// Handles quoted fields with commas (common in Amex statements)
func ParseCSV(csvContent string) ([]models.CSVTransaction, error) {
	lines := strings.Split(strings.TrimSpace(csvContent), "\n")

	if len(lines) == 0 {
		return nil, fmt.Errorf("empty CSV file")
	}

	// Skip header row if it exists
	startIndex := 0
	if strings.Contains(strings.ToLower(lines[0]), "date") {
		startIndex = 1
	}

	var transactions []models.CSVTransaction

	for i := startIndex; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		// Parse CSV line properly handling quoted fields
		values := ParseCSVLine(line)

		if len(values) >= 3 {
			// Parse amount - handle negative numbers, currency symbols, parentheses
			amountStr := values[2]
			amountStr = strings.ReplaceAll(amountStr, "$", "")
			amountStr = strings.ReplaceAll(amountStr, ",", "")

			amount := 0.0

			// Handle parentheses notation for negative numbers (common in accounting)
			if strings.Contains(amountStr, "(") && strings.Contains(amountStr, ")") {
				amountStr = strings.ReplaceAll(amountStr, "(", "")
				amountStr = strings.ReplaceAll(amountStr, ")", "")
				parsedAmount, err := strconv.ParseFloat(amountStr, 64)
				if err == nil {
					amount = -parsedAmount
				}
			} else {
				parsedAmount, err := strconv.ParseFloat(amountStr, 64)
				if err == nil {
					amount = parsedAmount
				}
			}

			transactions = append(transactions, models.CSVTransaction{
				Date:        values[0],
				Description: values[1],
				Amount:      amount,
			})
		}
	}

	if len(transactions) == 0 {
		return nil, fmt.Errorf("no valid transactions found in CSV")
	}

	return transactions, nil
}
