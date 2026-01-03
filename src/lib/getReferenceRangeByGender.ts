/**
 * Extracts gender-specific reference range from a combined reference range string
 * 
 * @param referenceRange - The full reference range string (e.g., "M: 13.5-17.5, F: 12-15.5")
 * @param sex - Patient sex ("Male", "Female", or other values)
 * @returns The appropriate reference range for the given sex
 * 
 * Supported formats:
 * - "M: x-y, F: a-b"
 * - "Male: x-y, Female: a-b"
 * - "F: a-b, M: x-y" (order doesn't matter)
 * 
 * If no gender-specific format is detected, returns the original string
 */
export function getReferenceRangeByGender(referenceRange: string, sex: string, age?: number | string): string {
    if (!referenceRange || !sex) {
        return referenceRange;
    }

    // Check for Children pattern if age is provided and < 14 (Pediatric cutoff)
    // Safe parse age in case it's passed as string or "5 Y"
    const numericAge = typeof age === 'string' ? parseFloat(age) : age;

    if (numericAge !== undefined && !isNaN(numericAge) && numericAge < 14) {
        const childPattern = /(?:Children|Child):\s*([^,\n\r]+)/i;
        const matchChild = referenceRange.match(childPattern);
        if (matchChild) {
            return matchChild[1].trim();
        }
    }

    const normalizedSex = sex.toLowerCase();

    // Check for Male pattern
    if (normalizedSex === 'male' || normalizedSex === 'm') {
        const malePattern = /(?:M|Male|Men):\s*([^,\n\r]+)/i;
        const match = referenceRange.match(malePattern);
        if (match) {
            return match[1].trim();
        }
    }

    // Check for Female pattern
    if (normalizedSex === 'female' || normalizedSex === 'f') {
        const femalePattern = /(?:F|Female|Women):\s*([^,\n\r]+)/i;
        const match = referenceRange.match(femalePattern);
        if (match) {
            return match[1].trim();
        }
    }

    // No specific format found (or child not applicable), return original
    return referenceRange;
}
