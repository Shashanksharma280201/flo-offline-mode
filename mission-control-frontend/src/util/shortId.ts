/**
 * Generates a random Base62 string (0-9, a-z, A-Z) of the specified length.
 * Used for generating unique identifiers for QC Questions.
 *
 * @param length The length of the string to generate (default: 10)
 * @returns A random Base62 string
 */
export const generateShortId = (length: number = 10): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
