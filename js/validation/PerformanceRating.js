export class PerformanceRating {
    static ratings = null;
    
    /**
     * Load performance ratings from JSON file
     */
    static async loadRatings() {
        if (!this.ratings) {
            try {
                const response = await fetch('./data/performance-ratings.json');
                const data = await response.json();
                this.ratings = data.performanceRatings;
            } catch (error) {
                console.error('Failed to load performance ratings:', error);
                // Fallback ratings if JSON fails to load - Neon Crypt palette
                this.ratings = [
                    { maxTime: 10, rating: "Dissatisfactory", color: "#E84E6A", description: "Core breach occurred too quickly" },
                    { maxTime: 30, rating: "Inadequate", color: "#E87ADC", description: "Defense systems failed early" },
                    { maxTime: 60, rating: "Marginal", color: "#B080E8", description: "Basic defensive capability shown" },
                    { maxTime: 120, rating: "Satisfactory", color: "#4E78E8", description: "Acceptable defense duration" },
                    { maxTime: 180, rating: "Good", color: "#60A0F0", description: "Solid defensive performance" },
                    { maxTime: 300, rating: "Excellent", color: "#88C8FF", description: "Superior tactical defense" },
                    { maxTime: 600, rating: "Outstanding", color: "#A8E0FF", description: "Elite defensive mastery" },
                    { maxTime: 999999, rating: "Transcendent", color: "#D4D4E8", description: "Unprecedented defense achievement" }
                ];
            }
        }
        return this.ratings;
    }
    
    /**
     * Get performance rating based on survival time
     * @param {number} survivalTime - Time in seconds
     * @returns {Object} Rating object with rating, color, and description
     */
    static async getRating(survivalTime) {
        const ratings = await this.loadRatings();
        
        // Find the first rating where survivalTime <= maxTime
        for (const rating of ratings) {
            if (survivalTime <= rating.maxTime) {
                return {
                    rating: rating.rating,
                    color: rating.color,
                    description: rating.description
                };
            }
        }
        
        // Fallback to last rating if no match found
        const lastRating = ratings[ratings.length - 1];
        return {
            rating: lastRating.rating,
            color: lastRating.color,
            description: lastRating.description
        };
    }
    
    /**
     * Get all available ratings (useful for leaderboards or stats)
     * @returns {Array} Array of all rating objects
     */
    static async getAllRatings() {
        return await this.loadRatings();
    }
}