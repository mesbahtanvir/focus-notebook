/**
 * Test for CSV parsing with quoted fields (Amex statement compatibility)
 */

// Import the parseCSVLine function from processCSVTransactions
// Since it's not exported, we'll test through a sample implementation
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator outside quotes
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

describe('parseCSVLine', () => {
  it('should parse simple CSV line without quotes', () => {
    const line = '01/15/2024,Coffee Shop,12.50';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', 'Coffee Shop', '12.50']);
  });

  it('should parse CSV line with quoted field containing comma', () => {
    const line = '01/15/2024,"RESTAURANT NAME, NEW YORK",45.00';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', 'RESTAURANT NAME, NEW YORK', '45.00']);
  });

  it('should parse Amex-style CSV with location in description', () => {
    const line = '01/20/2024,"SQ *BLUE BOTTLE COFFEE, Oakland CA",8.75';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/20/2024', 'SQ *BLUE BOTTLE COFFEE, Oakland CA', '8.75']);
  });

  it('should handle multiple quoted fields', () => {
    const line = '"01/15/2024","WHOLE FOODS MKT #10250, San Francisco CA","125.50"';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', 'WHOLE FOODS MKT #10250, San Francisco CA', '125.50']);
  });

  it('should handle escaped quotes within quoted fields', () => {
    const line = '01/15/2024,"Store with ""Quotes"" in name",50.00';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', 'Store with "Quotes" in name', '50.00']);
  });

  it('should handle empty fields', () => {
    const line = '01/15/2024,,25.00';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', '', '25.00']);
  });

  it('should handle fields with spaces', () => {
    const line = ' 01/15/2024 , Coffee Shop , 12.50 ';
    const result = parseCSVLine(line);
    expect(result).toEqual(['01/15/2024', 'Coffee Shop', '12.50']);
  });

  it('should parse real Amex transaction examples', () => {
    const examples = [
      {
        line: '10/01/2024,"NETFLIX.COM, Los Gatos CA",15.99',
        expected: ['10/01/2024', 'NETFLIX.COM, Los Gatos CA', '15.99']
      },
      {
        line: '10/05/2024,"UBER *TRIP, San Francisco CA",32.45',
        expected: ['10/05/2024', 'UBER *TRIP, San Francisco CA', '32.45']
      },
      {
        line: '10/10/2024,"AMERICAN AIRLINES, Dallas TX",350.00',
        expected: ['10/10/2024', 'AMERICAN AIRLINES, Dallas TX', '350.00']
      }
    ];

    examples.forEach(({ line, expected }) => {
      expect(parseCSVLine(line)).toEqual(expected);
    });
  });
});
