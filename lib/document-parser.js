/**
 * Document Parser Library
 *
 * Parses PDF, CSV, and Excel files into structured data.
 * Used by the Discovery spoke for extracting business information.
 */

import { createLogger } from './logger.js';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

const logger = createLogger({ module: 'document-parser' });

/**
 * Parse a document and return structured data
 * @param {string} filePath - Path to the file
 * @returns {Promise<{text: string, metadata: object, structure: object}>}
 */
export async function parseDocument(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = extname(filePath).toLowerCase();

  logger.info('Parsing document', { filePath, ext });

  switch (ext) {
    case '.pdf':
      return parsePDF(filePath);
    case '.csv':
      return parseCSV(filePath);
    case '.xlsx':
    case '.xls':
      return parseExcel(filePath);
    case '.txt':
    case '.md':
      return parseText(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Parse a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, metadata: object, structure: object}>}
 */
async function parsePDF(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    logger.info('PDF parsed successfully', {
      pages: data.numpages,
      textLength: data.text.length
    });

    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
        version: data.version,
      },
      structure: {
        type: 'document',
        sections: extractSections(data.text),
      },
    };
  } catch (error) {
    logger.error('PDF parsing failed', { error: error.message });
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Parse a CSV file
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<{text: string, metadata: object, structure: object}>}
 */
async function parseCSV(filePath) {
  try {
    const { parse } = await import('csv-parse/sync');
    const content = readFileSync(filePath, 'utf-8');

    // Parse CSV
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Extract headers (columns)
    const headers = records.length > 0 ? Object.keys(records[0]) : [];

    logger.info('CSV parsed successfully', {
      rows: records.length,
      columns: headers.length
    });

    return {
      text: formatCSVAsText(headers, records),
      metadata: {
        rows: records.length,
        columns: headers,
      },
      structure: {
        type: 'tabular',
        headers,
        data: records,
        summary: summarizeColumns(headers, records),
      },
    };
  } catch (error) {
    logger.error('CSV parsing failed', { error: error.message });
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

/**
 * Parse an Excel file
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<{text: string, metadata: object, structure: object}>}
 */
async function parseExcel(filePath) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.readFile(filePath);

    const sheets = {};
    const allText = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      sheets[sheetName] = {
        headers,
        rows: data.length,
        data,
        summary: summarizeColumns(headers, data),
      };

      allText.push(`## Sheet: ${sheetName}`);
      allText.push(formatCSVAsText(headers, data));
    }

    logger.info('Excel parsed successfully', {
      sheets: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames
    });

    return {
      text: allText.join('\n\n'),
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
      },
      structure: {
        type: 'spreadsheet',
        sheets,
      },
    };
  } catch (error) {
    logger.error('Excel parsing failed', { error: error.message });
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
}

/**
 * Parse a plain text or markdown file
 * @param {string} filePath - Path to the text file
 * @returns {Promise<{text: string, metadata: object, structure: object}>}
 */
async function parseText(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');

    logger.info('Text file parsed', { length: content.length });

    return {
      text: content,
      metadata: {
        length: content.length,
        lines: content.split('\n').length,
      },
      structure: {
        type: 'text',
        sections: extractSections(content),
      },
    };
  } catch (error) {
    logger.error('Text parsing failed', { error: error.message });
    throw new Error(`Text parsing failed: ${error.message}`);
  }
}

/**
 * Extract sections from text based on headers
 * @param {string} text - The text to analyze
 * @returns {Array} - Array of section objects
 */
function extractSections(text) {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { title: 'Introduction', content: [] };

  for (const line of lines) {
    // Detect headers (markdown style or ALL CAPS)
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/) ||
                       (line.length < 50 && line === line.toUpperCase() && line.trim().length > 3);

    if (headerMatch) {
      if (currentSection.content.length > 0) {
        sections.push({
          ...currentSection,
          content: currentSection.content.join('\n').trim(),
        });
      }
      currentSection = {
        title: Array.isArray(headerMatch) ? headerMatch[1] : line.trim(),
        content: [],
      };
    } else {
      currentSection.content.push(line);
    }
  }

  // Push final section
  if (currentSection.content.length > 0) {
    sections.push({
      ...currentSection,
      content: currentSection.content.join('\n').trim(),
    });
  }

  return sections;
}

/**
 * Format CSV data as readable text
 * @param {Array} headers - Column headers
 * @param {Array} records - Data records
 * @returns {string} - Formatted text
 */
function formatCSVAsText(headers, records) {
  if (records.length === 0) return 'No data';

  const lines = [];
  lines.push(`Columns: ${headers.join(', ')}`);
  lines.push(`Total rows: ${records.length}`);
  lines.push('');

  // Show first 10 rows as sample
  const sample = records.slice(0, 10);
  for (const record of sample) {
    const values = headers.map(h => `${h}: ${record[h] || 'N/A'}`);
    lines.push(values.join(' | '));
  }

  if (records.length > 10) {
    lines.push(`... and ${records.length - 10} more rows`);
  }

  return lines.join('\n');
}

/**
 * Summarize column data types and statistics
 * @param {Array} headers - Column headers
 * @param {Array} records - Data records
 * @returns {object} - Column summaries
 */
function summarizeColumns(headers, records) {
  const summary = {};

  for (const header of headers) {
    const values = records.map(r => r[header]).filter(v => v != null && v !== '');

    // Detect type
    const numericValues = values.filter(v => !isNaN(parseFloat(v)));
    const isNumeric = numericValues.length > values.length * 0.8;

    summary[header] = {
      type: isNumeric ? 'numeric' : 'text',
      nonEmpty: values.length,
      unique: new Set(values).size,
    };

    if (isNumeric && numericValues.length > 0) {
      const nums = numericValues.map(v => parseFloat(v));
      summary[header].min = Math.min(...nums);
      summary[header].max = Math.max(...nums);
      summary[header].avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
  }

  return summary;
}

/**
 * Get supported file types
 * @returns {Array} - Array of supported extensions
 */
export function getSupportedTypes() {
  return ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.md'];
}

/**
 * Check if a file type is supported
 * @param {string} filename - The filename to check
 * @returns {boolean}
 */
export function isSupported(filename) {
  const ext = extname(filename).toLowerCase();
  return getSupportedTypes().includes(ext);
}

export default {
  parseDocument,
  getSupportedTypes,
  isSupported,
};
