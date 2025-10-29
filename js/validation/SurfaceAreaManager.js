import { CONFIG } from '../config.js';

export class SurfaceAreaManager {
    static TARGET_SURFACE_AREA = 84; // Target total surface area in grid lengths for fair scoring
    
    /**
     * Calculate the perimeter (surface area) of a mirror shape
     * For triangles, round hypotenuses and non-flat sides to nearest integer
     */
    static calculateMirrorSurfaceArea(mirror) {
        const gridSize = CONFIG.GRID_SIZE; // 20px
        
        switch (mirror.shape) {
            case 'square':
                // Perimeter = 4 * side length
                const sideLength = mirror.size / gridSize;
                return 4 * sideLength;
                
            case 'rectangle':
                // Perimeter = 2 * (width + height)
                const width = mirror.width / gridSize;
                const height = mirror.height / gridSize;
                return 2 * (width + height);
                
            case 'rightTriangle':
                // Right triangle: two perpendicular sides + hypotenuse
                const rtSide = mirror.size / gridSize;
                const hypotenuse = Math.round(rtSide * Math.sqrt(2)); // Round to nearest integer
                return rtSide + rtSide + hypotenuse;
                
            case 'isoscelesTriangle':
                // Isosceles triangle: base + 2 equal sides
                const isoBase = (mirror.width || mirror.size) / gridSize;
                const isoHeight = (mirror.height || mirror.size) / gridSize;
                
                // Calculate the length of the two equal sides using Pythagorean theorem
                // Each side goes from base corner to apex: sqrt((base/2)^2 + height^2)
                const isoSideLength = Math.sqrt((isoBase/2) * (isoBase/2) + isoHeight * isoHeight);
                const roundedSideLength = Math.round(isoSideLength);
                
                return isoBase + 2 * roundedSideLength;
                
            case 'trapezoid':
                // Trapezoid: top base + bottom base + 2 equal sides
                const trapBottomBase = mirror.width / gridSize;  // Bottom base (wider)
                const trapTopBase = mirror.topWidth / gridSize;  // Top base (narrower)
                const trapHeight = mirror.height / gridSize;
                
                // Calculate the length of the two equal slanted sides
                // Side length = sqrt(height^2 + ((bottom - top)/2)^2)
                const trapBaseDiff = (trapBottomBase - trapTopBase) / 2;
                const trapSideLength = Math.sqrt(trapHeight * trapHeight + trapBaseDiff * trapBaseDiff);
                const roundedTrapSideLength = Math.round(trapSideLength);
                
                return trapBottomBase + trapTopBase + 2 * roundedTrapSideLength;
                
            case 'parallelogram':
                // Parallelogram: 2 * (base + slanted side)
                const paraBase = mirror.width / gridSize;        // Base length
                const paraHeight = mirror.height / gridSize;     // Vertical height
                const paraSkew = mirror.skew / gridSize;         // Horizontal skew amount
                
                // Calculate the slanted side using Pythagorean theorem
                // Slanted side = sqrt(height^2 + skew^2)
                const paraSlantedSide = Math.sqrt(paraHeight * paraHeight + paraSkew * paraSkew);
                const roundedParaSlantedSide = Math.round(paraSlantedSide);
                
                return 2 * (paraBase + roundedParaSlantedSide);
                
            default:
                return 0;
        }
    }
    
    /**
     * Get all possible mirror configurations with their surface areas
     */
    static getAllPossibleMirrors() {
        const mirrors = [];
        const sizes = [20, 40, 60, 80, 100, 120]; // 1, 2, 3, 4, 5, 6 grid units
        
        // Squares
        sizes.forEach(size => {
            mirrors.push({
                shape: 'square',
                size: size,
                width: size,
                height: size,
                rotation: 0,
                surfaceArea: this.calculateMirrorSurfaceArea({ shape: 'square', size })
            });
        });
        
        // Rectangles (different width/height combinations)
        sizes.forEach(width => {
            sizes.forEach(height => {
                if (width !== height) { // Skip squares (already added)
                    mirrors.push({
                        shape: 'rectangle',
                        size: Math.max(width, height),
                        width: width,
                        height: height,
                        rotation: 0,
                        surfaceArea: this.calculateMirrorSurfaceArea({ shape: 'rectangle', width, height })
                    });
                }
            });
        });
        
        // Right triangles
        sizes.forEach(size => {
            mirrors.push({
                shape: 'rightTriangle',
                size: size,
                width: size,
                height: size,
                rotation: 0,
                surfaceArea: this.calculateMirrorSurfaceArea({ shape: 'rightTriangle', size })
            });
        });
        
        // Isosceles triangles (base must be even, height can be any valid size)
        sizes.forEach(baseSize => {
            const baseGridUnits = baseSize / CONFIG.GRID_SIZE;
            if (baseGridUnits % 2 === 0) { // Only even grid unit bases
                sizes.forEach(heightSize => {
                    // Create isosceles triangle with this base and height combination
                    mirrors.push({
                        shape: 'isoscelesTriangle',
                        size: Math.max(baseSize, heightSize), // Use larger dimension as 'size'
                        width: baseSize,   // Base width
                        height: heightSize, // Triangle height
                        rotation: 0,
                        surfaceArea: this.calculateMirrorSurfaceArea({ 
                            shape: 'isoscelesTriangle', 
                            width: baseSize, 
                            height: heightSize 
                        })
                    });
                });
            }
        });
        
        // Trapezoids (bottom base, top base, height combinations)
        sizes.forEach(bottomBase => {
            sizes.forEach(topBase => {
                sizes.forEach(height => {
                    // Only create trapezoids where bottom > top (proper trapezoid shape)
                    if (bottomBase > topBase && topBase >= 20) { // Ensure minimum top base size
                        mirrors.push({
                            shape: 'trapezoid',
                            size: Math.max(bottomBase, height),
                            width: bottomBase,      // Bottom base (wider)
                            topWidth: topBase,      // Top base (narrower)
                            height: height,         // Vertical height
                            rotation: 0,
                            surfaceArea: this.calculateMirrorSurfaceArea({ 
                                shape: 'trapezoid', 
                                width: bottomBase, 
                                topWidth: topBase, 
                                height: height 
                            })
                        });
                    }
                });
            });
        });
        
        // Parallelograms (base, height, skew combinations)
        sizes.forEach(baseSize => {
            sizes.forEach(heightSize => {
                // Create different skew amounts (horizontal displacement)
                const skewAmounts = [20, 40, 60]; // 1, 2, 3 grid units of skew
                skewAmounts.forEach(skew => {
                    // Ensure skew is less than base for reasonable shapes
                    if (skew < baseSize) {
                        mirrors.push({
                            shape: 'parallelogram',
                            size: Math.max(baseSize, heightSize),
                            width: baseSize,     // Base length
                            height: heightSize,  // Vertical height
                            skew: skew,          // Horizontal skew
                            rotation: 0,
                            surfaceArea: this.calculateMirrorSurfaceArea({ 
                                shape: 'parallelogram', 
                                width: baseSize, 
                                height: heightSize,
                                skew: skew 
                            })
                        });
                    }
                });
            });
        });
        
        return mirrors;
    }
    
    /**
     * Generate mirrors for free play mode with EXACTLY target surface area
     * This MUST return exactly 84 surface area for fair scoring
     */
    static generateMirrorsWithTargetSurfaceArea() {
        const targetArea = this.TARGET_SURFACE_AREA;
        const possibleMirrors = this.getAllPossibleMirrors();

        const maxAttempts = 1000; // Increase attempts to ensure we find a solution

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = this.attemptGenerateExactArea(targetArea, possibleMirrors);

            if (result && result.totalArea === targetArea) {
                console.log(`✅ EXACT surface area achieved! ${result.mirrors.length} mirrors, total area: ${result.totalArea}`);
                return result.mirrors;
            }
        }

        // CRITICAL: If we still haven't found exact solution, use deterministic approach
        console.warn(`⚠️ Random generation failed after ${maxAttempts} attempts. Using deterministic approach...`);
        return this.generateDeterministicExactArea(targetArea, possibleMirrors);
    }

    /**
     * Attempt to generate exactly the target area using backtracking algorithm
     */
    static attemptGenerateExactArea(targetArea, possibleMirrors) {
        let selectedMirrors = [];
        let currentSurfaceArea = 0;

        // Sort mirrors by surface area (largest first) for better backtracking
        const sortedMirrors = [...possibleMirrors].sort((a, b) => b.surfaceArea - a.surfaceArea);

        // Generate mirrors until we hit target
        while (currentSurfaceArea < targetArea) {
            const remainingArea = targetArea - currentSurfaceArea;

            // Find all mirrors that fit in remaining space
            let candidateMirrors = sortedMirrors.filter(m => m.surfaceArea <= remainingArea);

            if (candidateMirrors.length === 0) {
                // Can't fit any more mirrors, need to backtrack
                if (selectedMirrors.length > 0) {
                    const removed = selectedMirrors.pop();
                    currentSurfaceArea -= removed.surfaceArea;

                    // Try a different mirror next time by filtering out what we just removed
                    // This is a simple backtracking strategy
                    continue;
                } else {
                    // Failed this attempt
                    return null;
                }
            }

            // Prefer mirrors that get us closer to the exact target
            // Sort by how close they get us: prioritize exact matches, then closer values
            candidateMirrors.sort((a, b) => {
                const aExact = (a.surfaceArea === remainingArea) ? -1000 : 0;
                const bExact = (b.surfaceArea === remainingArea) ? -1000 : 0;
                return (aExact + Math.abs(remainingArea - a.surfaceArea)) -
                       (bExact + Math.abs(remainingArea - b.surfaceArea));
            });

            // Take the best match with some randomness
            const topCandidates = candidateMirrors.slice(0, Math.min(5, candidateMirrors.length));
            const randomMirror = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            const mirrorCopy = { ...randomMirror };

            // Add random rotation for shapes that support it
            if (mirrorCopy.shape === 'rightTriangle' || mirrorCopy.shape === 'isoscelesTriangle' ||
                mirrorCopy.shape === 'trapezoid' || mirrorCopy.shape === 'parallelogram') {
                mirrorCopy.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
            }

            selectedMirrors.push(mirrorCopy);
            currentSurfaceArea += randomMirror.surfaceArea;

            // Success check
            if (currentSurfaceArea === targetArea) {
                return { mirrors: selectedMirrors, totalArea: currentSurfaceArea };
            }

            // Prevent infinite loops
            if (selectedMirrors.length > 100) {
                return null;
            }
        }

        return null;
    }

    /**
     * Deterministic approach: build exact target using known combinations
     * This is the ultimate fallback that GUARANTEES exactly 84
     *
     * Strategy: Use dynamic programming / greedy approach
     * 84 = 21 × 4 (so we can use 21 squares of size 20 (4 units each))
     * Or other combinations that are guaranteed to exist in our mirror set
     */
    static generateDeterministicExactArea(targetArea, possibleMirrors) {
        console.log(`🔧 Using deterministic approach to guarantee exactly ${targetArea} surface area`);

        // Find the smallest mirror surface area (will be smallest square: 20px = 1 grid unit = 4 perimeter)
        const smallestMirror = possibleMirrors.reduce((min, m) =>
            m.surfaceArea < min.surfaceArea ? m : min
        );
        console.log(`Smallest available mirror has ${smallestMirror.surfaceArea} surface area`);

        // Strategy: Use greedy algorithm with backtracking
        // Fill with larger mirrors first, then use smallest to fill gaps
        const mirrors = [];
        let currentArea = 0;

        // Get all unique surface area values, sorted descending
        const uniqueAreas = [...new Set(possibleMirrors.map(m => m.surfaceArea))].sort((a, b) => b - a);
        console.log(`Available surface area values: ${uniqueAreas.join(', ')}`);

        while (currentArea < targetArea) {
            const remaining = targetArea - currentArea;

            // Try to find exact match for remaining area
            const exactMatch = possibleMirrors.find(m => m.surfaceArea === remaining);
            if (exactMatch) {
                mirrors.push({ ...exactMatch, rotation: 0 });
                currentArea += exactMatch.surfaceArea;
                console.log(`✓ Added exact match: ${exactMatch.shape} (${exactMatch.surfaceArea}) - total now ${currentArea}`);
                break;
            }

            // Find the largest mirror that fits in remaining space
            const bestFit = uniqueAreas.find(area => area <= remaining);
            if (!bestFit) {
                console.error(`❌ CRITICAL: No mirror fits in remaining ${remaining}. This should never happen!`);
                break;
            }

            // Get a random mirror with this surface area (for variety)
            const candidates = possibleMirrors.filter(m => m.surfaceArea === bestFit);
            const selected = candidates[Math.floor(Math.random() * candidates.length)];

            mirrors.push({ ...selected, rotation: 0 });
            currentArea += selected.surfaceArea;
            console.log(`✓ Added ${selected.shape} (${selected.surfaceArea}) - total now ${currentArea}/${targetArea}`);

            // Safety check
            if (mirrors.length > 100) {
                console.error('❌ CRITICAL: Too many mirrors generated (>100)');
                break;
            }
        }

        const finalArea = this.calculateTotalSurfaceArea(mirrors);
        console.log(`✅ Deterministic generation complete: ${mirrors.length} mirrors, ${finalArea} area`);

        if (finalArea !== targetArea) {
            console.error(`❌ CRITICAL: Failed to achieve exact target! Got ${finalArea}, expected ${targetArea}`);
            console.error(`This indicates a fundamental issue with the algorithm or available mirrors.`);
        }

        return mirrors;
    }
    
    
    /**
     * Calculate total surface area of a mirror array
     */
    static calculateTotalSurfaceArea(mirrors) {
        return mirrors.reduce((total, mirror) => total + this.calculateMirrorSurfaceArea(mirror), 0);
    }
}