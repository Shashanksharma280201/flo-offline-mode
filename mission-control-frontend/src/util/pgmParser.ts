/**
 * PGM (Portable Gray Map) file parser for LIDAR map visualization
 * Converts PGM binary data to ImageData that can be rendered on canvas
 */

export interface PGMData {
    width: number;
    height: number;
    maxValue: number;
    pixels: Uint8Array;
}

/**
 * Parse PGM file (P5 format - binary grayscale)
 * @param arrayBuffer - Raw PGM file data
 * @returns Parsed PGM data with width, height, and pixel data
 */
export function parsePGM(arrayBuffer: ArrayBuffer): PGMData {
    const bytes = new Uint8Array(arrayBuffer);
    let offset = 0;

    // Read magic number (should be "P5" for binary PGM)
    const magic = String.fromCharCode(bytes[offset], bytes[offset + 1]);
    offset += 2;

    if (magic !== "P5") {
        throw new Error(`Invalid PGM format. Expected P5, got ${magic}`);
    }

    // Skip whitespace and comments
    const skipWhitespaceAndComments = () => {
        while (offset < bytes.length) {
            // Skip whitespace
            while (offset < bytes.length && (bytes[offset] === 32 || bytes[offset] === 9 || bytes[offset] === 10 || bytes[offset] === 13)) {
                offset++;
            }
            // Skip comments (lines starting with #)
            if (bytes[offset] === 35) { // '#' character
                while (offset < bytes.length && bytes[offset] !== 10) { // until newline
                    offset++;
                }
            } else {
                break;
            }
        }
    };

    // Read a number from ASCII
    const readNumber = (): number => {
        skipWhitespaceAndComments();
        let numStr = "";
        while (offset < bytes.length && bytes[offset] >= 48 && bytes[offset] <= 57) { // 0-9
            numStr += String.fromCharCode(bytes[offset]);
            offset++;
        }
        return parseInt(numStr, 10);
    };

    // Read width
    const width = readNumber();

    // Read height
    const height = readNumber();

    // Read max value
    const maxValue = readNumber();

    console.log("[PGM Parser] Parsed header:", { width, height, maxValue });

    // Skip any remaining whitespace before pixel data
    skipWhitespaceAndComments();

    // Read pixel data
    const pixelDataLength = width * height;
    const pixels = new Uint8Array(pixelDataLength);

    for (let i = 0; i < pixelDataLength; i++) {
        if (offset + i >= bytes.length) {
            throw new Error(`Unexpected end of file at pixel ${i}`);
        }
        pixels[i] = bytes[offset + i];
    }

    console.log("[PGM Parser] Successfully parsed", pixels.length, "pixels");

    return { width, height, maxValue, pixels };
}

/**
 * Convert PGM data to ImageData for canvas rendering
 * @param pgmData - Parsed PGM data
 * @returns ImageData that can be drawn on canvas with ctx.putImageData()
 */
export function pgmToImageData(pgmData: PGMData): ImageData {
    const { width, height, maxValue, pixels } = pgmData;

    // Create RGBA image data (4 bytes per pixel)
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < pixels.length; i++) {
        // Scale pixel value to 0-255 range
        const scaledValue = Math.floor((pixels[i] / maxValue) * 255);

        // In LIDAR occupancy grid PGM maps:
        // - Low values (0-50) = obstacles/walls = should display as BLACK
        // - High values (200-255) = free space = should display as WHITE
        // - Middle values = unknown/uncertain
        const value = scaledValue; // Use value directly (no inversion)

        const dataIndex = i * 4;
        data[dataIndex] = value;     // R
        data[dataIndex + 1] = value; // G
        data[dataIndex + 2] = value; // B
        data[dataIndex + 3] = 255;   // A (fully opaque)
    }

    console.log("[PGM Parser] Converted to ImageData:", width, "x", height);

    return imageData;
}

/**
 * Create an Image element from PGM data by converting to canvas
 * @param arrayBuffer - Raw PGM file data
 * @returns Promise that resolves to an HTMLImageElement
 */
export async function createImageFromPGM(arrayBuffer: ArrayBuffer): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        try {
            // Parse PGM data
            const pgmData = parsePGM(arrayBuffer);

            // Create a temporary canvas
            const canvas = document.createElement("canvas");
            canvas.width = pgmData.width;
            canvas.height = pgmData.height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Failed to get 2D context from canvas");
            }

            // Convert PGM to ImageData and draw on canvas
            const imageData = pgmToImageData(pgmData);
            ctx.putImageData(imageData, 0, 0);

            // Convert canvas to PNG blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Failed to create blob from canvas"));
                    return;
                }

                // Create image from blob URL
                const img = new Image();
                const blobUrl = URL.createObjectURL(blob);

                img.onload = () => {
                    console.log("[PGM Parser] Image created successfully:", img.width, "x", img.height);
                    resolve(img);
                    // Note: caller should revoke URL when done
                };

                img.onerror = () => {
                    URL.revokeObjectURL(blobUrl);
                    reject(new Error("Failed to load image from canvas blob"));
                };

                img.src = blobUrl;
            }, "image/png");
        } catch (error) {
            reject(error);
        }
    });
}
