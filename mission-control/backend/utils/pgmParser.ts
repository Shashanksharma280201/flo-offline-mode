import fs from "fs/promises";

/**
 * Parse PGM (Portable Gray Map) file format
 * Supports P5 (binary) format
 */
export interface PGMImage {
  width: number;
  height: number;
  maxVal: number;
  data: Buffer;
}

/**
 * Read and parse a PGM file
 * @param filePath - Path to the PGM file
 * @returns Parsed PGM image data
 */
export async function parsePGM(filePath: string): Promise<PGMImage> {
  const buffer = await fs.readFile(filePath);

  let offset = 0;

  // Read magic number (P5 for binary grayscale)
  const magic = buffer.toString("ascii", offset, offset + 2);
  offset += 2;

  if (magic !== "P5") {
    throw new Error(`Unsupported PGM format: ${magic}. Only P5 (binary) is supported.`);
  }

  // Skip whitespace and comments
  const skipWhitespaceAndComments = () => {
    while (offset < buffer.length) {
      const char = buffer[offset];

      // Skip whitespace (space, tab, newline, carriage return)
      if (char === 0x20 || char === 0x09 || char === 0x0a || char === 0x0d) {
        offset++;
        continue;
      }

      // Skip comments (lines starting with #)
      if (char === 0x23) {
        // Skip until newline
        while (offset < buffer.length && buffer[offset] !== 0x0a) {
          offset++;
        }
        offset++; // Skip the newline
        continue;
      }

      break;
    }
  };

  // Read a number (width, height, or maxval)
  const readNumber = (): number => {
    skipWhitespaceAndComments();

    let numStr = "";
    while (offset < buffer.length) {
      const char = buffer[offset];
      if (char >= 0x30 && char <= 0x39) {
        // 0-9
        numStr += String.fromCharCode(char);
        offset++;
      } else {
        break;
      }
    }

    return parseInt(numStr, 10);
  };

  // Read width
  const width = readNumber();

  // Read height
  const height = readNumber();

  // Read max gray value
  const maxVal = readNumber();

  // Skip one more whitespace character before image data
  skipWhitespaceAndComments();
  if (offset < buffer.length && buffer[offset] === 0x0a) {
    offset++;
  }

  // Remaining data is the image pixels
  const imageData = buffer.slice(offset);

  // Verify data size
  const expectedSize = width * height;
  if (imageData.length < expectedSize) {
    throw new Error(
      `Invalid PGM file: expected ${expectedSize} bytes of image data, got ${imageData.length}`
    );
  }

  return {
    width,
    height,
    maxVal,
    data: imageData.slice(0, expectedSize)
  };
}
