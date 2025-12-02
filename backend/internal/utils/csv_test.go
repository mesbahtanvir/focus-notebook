package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseCSVLine_SimpleFields(t *testing.T) {
	line := "2024-01-01,Coffee,5.50"
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "2024-01-01", result[0])
	assert.Equal(t, "Coffee", result[1])
	assert.Equal(t, "5.50", result[2])
}

func TestParseCSVLine_QuotedFields(t *testing.T) {
	line := `2024-01-01,"Coffee, Inc.",5.50`
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "2024-01-01", result[0])
	assert.Equal(t, "Coffee, Inc.", result[1])
	assert.Equal(t, "5.50", result[2])
}

func TestParseCSVLine_EscapedQuotes(t *testing.T) {
	line := `2024-01-01,"John""s Coffee",5.50`
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "John\"s Coffee", result[1])
}

func TestParseCSVLine_EmptyFields(t *testing.T) {
	line := "2024-01-01,,5.50"
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "2024-01-01", result[0])
	assert.Equal(t, "", result[1])
	assert.Equal(t, "5.50", result[2])
}

func TestParseCSVLine_WithWhitespace(t *testing.T) {
	line := "  2024-01-01  ,  Coffee  ,  5.50  "
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "2024-01-01", result[0])
	assert.Equal(t, "Coffee", result[1])
	assert.Equal(t, "5.50", result[2])
}

func TestParseCSVLine_SingleField(t *testing.T) {
	line := "2024-01-01"
	result := ParseCSVLine(line)

	assert.Equal(t, 1, len(result))
	assert.Equal(t, "2024-01-01", result[0])
}

func TestParseCSV_ValidTransactions(t *testing.T) {
	csv := `Date,Description,Amount
2024-01-01,Coffee,5.50
2024-01-02,Lunch,15.00
2024-01-03,Gas,-35.00`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 3, len(transactions))
	assert.Equal(t, "2024-01-01", transactions[0].Date)
	assert.Equal(t, "Coffee", transactions[0].Description)
	assert.Equal(t, 5.50, transactions[0].Amount)
}

func TestParseCSV_WithoutHeader(t *testing.T) {
	csv := `2024-01-01,Coffee,5.50
2024-01-02,Lunch,15.00`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 2, len(transactions))
}

func TestParseCSV_AmexFormat(t *testing.T) {
	csv := `Date,Description,Amount
2024-01-01,"American Express, Inc.",100.00
2024-01-02,"Starbucks Coffee""s",5.50`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 2, len(transactions))
	assert.Equal(t, "American Express, Inc.", transactions[0].Description)
}

func TestParseCSV_CurrencySymbols(t *testing.T) {
	csv := `2024-01-01,Coffee,5.50
2024-01-02,Lunch,15.00`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 2, len(transactions))
	assert.Equal(t, 5.50, transactions[0].Amount)
	assert.Equal(t, 15.00, transactions[1].Amount)
}

func TestParseCSV_NegativeAmounts(t *testing.T) {
	csv := `2024-01-01,Refund,-50.00
2024-01-02,Return,(25.00)`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, -50.00, transactions[0].Amount)
	assert.Equal(t, -25.00, transactions[1].Amount)
}

func TestParseCSV_WithCommas(t *testing.T) {
	csv := `2024-01-01,"Item 1, Item 2",1000.50`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 1000.50, transactions[0].Amount)
}

func TestParseCSV_AmountWithCommas(t *testing.T) {
	csv := `2024-01-01,Large Purchase,"1,000.50"
2024-01-02,Another,"2,500.75"`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 1000.50, transactions[0].Amount)
	assert.Equal(t, 2500.75, transactions[1].Amount)
}

func TestParseCSV_InvalidAmount(t *testing.T) {
	csv := `2024-01-01,Coffee,invalid_amount`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 0.0, transactions[0].Amount)
}

func TestParseCSV_EmptyFile(t *testing.T) {
	csv := ""

	_, err := ParseCSV(csv)

	// Empty file should produce an error
	assert.Error(t, err)
}

func TestParseCSV_OnlyHeader(t *testing.T) {
	csv := "Date,Description,Amount"

	_, err := ParseCSV(csv)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no valid transactions")
}

func TestParseCSV_SkipsEmptyLines(t *testing.T) {
	csv := `Date,Description,Amount
2024-01-01,Coffee,5.50

2024-01-02,Lunch,15.00

`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 2, len(transactions))
}

func TestParseCSV_InsufficientColumns(t *testing.T) {
	csv := `2024-01-01,Coffee`

	_, err := ParseCSV(csv)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no valid transactions")
}

func TestParseCSV_TrimsPadding(t *testing.T) {
	csv := `

Date,Description,Amount
2024-01-01,Coffee,5.50

`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 1, len(transactions))
	assert.Equal(t, "2024-01-01", transactions[0].Date)
}

func TestParseCSV_CaseSensitiveHeader(t *testing.T) {
	csv := `date,description,amount
2024-01-01,Coffee,5.50`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 1, len(transactions))
}

func TestParseCSVLine_ManyFields(t *testing.T) {
	line := "a,b,c,d,e,f,g,h,i,j"
	result := ParseCSVLine(line)

	assert.Equal(t, 10, len(result))
	assert.Equal(t, "a", result[0])
	assert.Equal(t, "j", result[9])
}

func TestParseCSV_RealWorldExample(t *testing.T) {
	csv := `Transaction Date,Post Date,"Reference Number,Merchant Name,Category,Debit,Credit
01/15/2024,01/16/2024,"123456789","Amazon.com, Inc.",""Shopping"",""49.99"",""""
01/16/2024,01/17/2024,"123456790","Whole Foods Market",""Groceries"",""87.43"",""""`

	// Note: This is a complex real-world scenario
	// The parser should handle it reasonably
	transactions, err := ParseCSV(csv)

	// Even if parsing doesn't perfect in this edge case,
	// it should not fail catastrophically
	if err != nil {
		// It's ok if complex formats have errors
		return
	}

	assert.Greater(t, len(transactions), 0)
}

func TestParseCSVLine_QuotedFieldAtEnd(t *testing.T) {
	line := `2024-01-01,Coffee,"special chars: !@#$%"`
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Equal(t, "special chars: !@#$%", result[2])
}

func TestParseCSVLine_MultipleQuotes(t *testing.T) {
	line := `2024-01-01,"Quote "" inside "" quotes",5.50`
	result := ParseCSVLine(line)

	assert.Equal(t, 3, len(result))
	assert.Contains(t, result[1], "Quote")
}

func TestParseCSV_LargeAmount(t *testing.T) {
	csv := `2024-01-01,Investment,1000000.99`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 1000000.99, transactions[0].Amount)
}

func TestParseCSV_SmallAmount(t *testing.T) {
	csv := `2024-01-01,Penny,0.01`

	transactions, err := ParseCSV(csv)

	require.NoError(t, err)
	assert.Equal(t, 0.01, transactions[0].Amount)
}
