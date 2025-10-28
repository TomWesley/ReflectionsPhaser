// Seeded Random Number Generator
// Ensures same seed produces same sequence of random numbers
export class SeededRandom {
    constructor(seed) {
        this.seed = typeof seed === 'string' ? this.hashCode(seed) : seed;
        this.value = this.seed;
    }
    
    // Convert string to numeric seed
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    // Generate next random number (0-1)
    next() {
        this.value = (this.value * 1103515245 + 12345) & 0x7fffffff;
        return this.value / 0x7fffffff;
    }
    
    // Generate random integer between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    // Generate random float between min and max
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
    
    // Choose random element from array
    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
    
    // Shuffle array (returns new array)
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}