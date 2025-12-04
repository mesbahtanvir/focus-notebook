package utils

// SplitAndTrim splits a string by a delimiter and trims whitespace from each part
func SplitAndTrim(s, delim string) []string {
	parts := make([]string, 0)
	for _, part := range SplitString(s, delim) {
		trimmed := TrimString(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

// SplitString splits a string by a delimiter
func SplitString(s, delim string) []string {
	if s == "" {
		return []string{}
	}
	result := []string{}
	current := ""
	for _, ch := range s {
		if string(ch) == delim {
			result = append(result, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

// TrimString trims leading and trailing whitespace from a string
func TrimString(s string) string {
	start := 0
	end := len(s)

	// Trim leading spaces
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	// Trim trailing spaces
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	return s[start:end]
}
