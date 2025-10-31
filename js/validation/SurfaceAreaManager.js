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
     * Target: 6-15 mirrors with variety (sometimes small, sometimes medium, sometimes large)
     *
     * SIMPLE APPROACH: Add mirrors one at a time, then pick final mirror to hit exact total
     */
    static generateMirrorsWithTargetSurfaceArea() {
        console.log('🔧 Starting simple mirror generation...');
        const targetArea = this.TARGET_SURFACE_AREA;
        const minMirrors = 6;
        const possibleMirrors = this.getAllPossibleMirrors();
        console.log(`📦 Got ${possibleMirrors.length} possible mirror types`);

        const selectedMirrors = [];
        let currentArea = 0;

        // Randomly choose a strategy for VARIETY
        const strategies = [
            { name: 'tiny', range: [4, 8], targetCount: 12 },      // Lots of tiny mirrors
            { name: 'small', range: [6, 10], targetCount: 10 },    // Many small mirrors
            { name: 'medium', range: [8, 14], targetCount: 8 },    // Medium mirrors (default)
            { name: 'large', range: [12, 20], targetCount: 6 },    // Fewer large mirrors
            { name: 'mixed', range: [4, 20], targetCount: 8 }      // Complete variety
        ];

        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        console.log(`  Using strategy: ${strategy.name} (area ${strategy.range[0]}-${strategy.range[1]}, ~${strategy.targetCount} mirrors)`);

        // Step 1: Add random mirrors until we're close to target (leave room for final mirror)
        const mirrorPool = possibleMirrors.filter(m =>
            m.surfaceArea >= strategy.range[0] && m.surfaceArea <= strategy.range[1]
        );

        // If pool is too small, fall back to all mirrors
        const selectedPool = mirrorPool.length > 10 ? mirrorPool : possibleMirrors;

        while (selectedMirrors.length < strategy.targetCount - 2 && currentArea < targetArea - 20) {
            // Pick a random mirror from our strategy pool
            const randomMirror = selectedPool[Math.floor(Math.random() * selectedPool.length)];
            const mirrorCopy = { ...randomMirror };

            // Add random rotation for asymmetric shapes
            if (mirrorCopy.shape === 'rightTriangle' || mirrorCopy.shape === 'isoscelesTriangle' ||
                mirrorCopy.shape === 'trapezoid' || mirrorCopy.shape === 'parallelogram') {
                mirrorCopy.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
            }

            selectedMirrors.push(mirrorCopy);
            currentArea += randomMirror.surfaceArea;
            console.log(`  Added ${mirrorCopy.shape} (${randomMirror.surfaceArea}) - total: ${currentArea}/${targetArea}`);
        }

        // Step 2: Find the EXACT mirror(s) needed to hit targetArea
        const remaining = targetArea - currentArea;
        console.log(`  Need exactly ${remaining} more surface area to reach ${targetArea}`);

        // Try to find a single mirror with exact remaining area
        const exactMatch = possibleMirrors.find(m => m.surfaceArea === remaining);
        if (exactMatch) {
            const finalMirror = { ...exactMatch, rotation: 0 };
            selectedMirrors.push(finalMirror);
            currentArea += exactMatch.surfaceArea;
            console.log(`  ✓ Found exact match: ${exactMatch.shape} (${exactMatch.surfaceArea})`);
        } else {
            // Try to find two mirrors that sum to remaining
            let found = false;
            for (let i = 0; i < possibleMirrors.length && !found; i++) {
                const first = possibleMirrors[i];
                if (first.surfaceArea >= remaining) continue; // Too big

                const needSecond = remaining - first.surfaceArea;
                const second = possibleMirrors.find(m => m.surfaceArea === needSecond);

                if (second) {
                    selectedMirrors.push({ ...first, rotation: 0 });
                    selectedMirrors.push({ ...second, rotation: 0 });
                    currentArea += first.surfaceArea + second.surfaceArea;
                    console.log(`  ✓ Found pair: ${first.shape} (${first.surfaceArea}) + ${second.shape} (${second.surfaceArea})`);
                    found = true;
                }
            }

            if (!found) {
                console.error(`  ❌ Could not find combination for remaining ${remaining}`);
                // Fallback: just add the closest mirror
                const closest = possibleMirrors.reduce((prev, curr) =>
                    Math.abs(curr.surfaceArea - remaining) < Math.abs(prev.surfaceArea - remaining) ? curr : prev
                );
                selectedMirrors.push({ ...closest, rotation: 0 });
                currentArea += closest.surfaceArea;
            }
        }

        const finalArea = this.calculateTotalSurfaceArea(selectedMirrors);
        console.log(`✅ Generated ${selectedMirrors.length} mirrors with ${finalArea} total surface area`);

        if (finalArea !== targetArea) {
            console.warn(`⚠️ Surface area is ${finalArea}, expected ${targetArea} (diff: ${finalArea - targetArea})`);
        }

        return selectedMirrors;
    }

    /**
     * Attempt to generate exactly the target area using backtracking algorithm
     * Prefer smaller mirrors to get target count of ~8 mirrors for easier placement
     */
    static attemptGenerateExactArea(targetArea, possibleMirrors, minMirrors = 6, targetMirrorCount = 8) {
        let selectedMirrors = [];
        let currentSurfaceArea = 0;

        // Sort mirrors by surface area (SMALLEST first to maximize mirror count)
        const sortedMirrors = [...possibleMirrors].sort((a, b) => a.surfaceArea - b.surfaceArea);

        // Safety counter to prevent infinite loops
        let iterations = 0;
        const maxIterations = 1000;

        // Generate mirrors until we hit target
        let backtrackCount = 0;
        const maxBacktracks = 50; // Limit backtracking to prevent infinite loops

        while (currentSurfaceArea < targetArea && iterations < maxIterations) {
            iterations++;
            const remainingArea = targetArea - currentSurfaceArea;
            const currentCount = selectedMirrors.length;

            // Find all mirrors that fit in remaining space
            let candidateMirrors = sortedMirrors.filter(m => m.surfaceArea <= remainingArea);

            if (candidateMirrors.length === 0) {
                // Can't fit any more mirrors, need to backtrack
                backtrackCount++;
                if (backtrackCount > maxBacktracks) {
                    // Too much backtracking - give up on this attempt
                    return null;
                }

                if (selectedMirrors.length > 0) {
                    const removed = selectedMirrors.pop();
                    currentSurfaceArea -= removed.surfaceArea;
                    continue;
                } else {
                    // Failed this attempt
                    return null;
                }
            } else {
                // Reset backtrack counter when making progress
                backtrackCount = 0;
            }

            // Prefer mirrors based on:
            // 1. Exact matches (highest priority)
            // 2. If under target count, prefer smaller mirrors to add more
            // 3. If near target count, prefer mirrors that get us close to exact total
            candidateMirrors.sort((a, b) => {
                const aExact = (a.surfaceArea === remainingArea) ? -10000 : 0;
                const bExact = (b.surfaceArea === remainingArea) ? -10000 : 0;

                // If we need more mirrors, prefer smaller ones
                if (currentCount < targetMirrorCount) {
                    return (aExact + a.surfaceArea) - (bExact + b.surfaceArea);
                } else {
                    // Otherwise, prefer larger mirrors to finish faster
                    return (aExact + Math.abs(remainingArea - a.surfaceArea)) -
                           (bExact + Math.abs(remainingArea - b.surfaceArea));
                }
            });

            // Take the best match with some randomness for variety
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
            if (currentSurfaceArea === targetArea && selectedMirrors.length >= minMirrors) {
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
     * Strategy: Use smaller mirrors to reach minMirrors count (6+)
     *
     * 84 = 21 × 4 (so we can use 21 squares of size 20 (4 units each))
     * But we want fewer mirrors (6-12), so use average size of 8-9 units per mirror
     */
    static generateDeterministicExactArea(targetArea, possibleMirrors, minMirrors = 6) {
        console.log(`🔧 Using deterministic approach to guarantee exactly ${targetArea} surface area with ${minMirrors}+ mirrors`);

        // Find the smallest mirror surface area (will be smallest square: 20px = 1 grid unit = 4 perimeter)
        const smallestMirror = possibleMirrors.reduce((min, m) =>
            m.surfaceArea < min.surfaceArea ? m : min
        );
        console.log(`Smallest available mirror has ${smallestMirror.surfaceArea} surface area`);

        // Get all unique surface area values, sorted ASCENDING (prefer smaller for more mirrors)
        const uniqueAreas = [...new Set(possibleMirrors.map(m => m.surfaceArea))].sort((a, b) => a - b);
        console.log(`Available surface area values: ${uniqueAreas.join(', ')}`);

        // Strategy: Build with medium-small mirrors to hit minMirrors count
        // Average target per mirror: 84 / 10 = 8.4 units per mirror
        const mirrors = [];
        let currentArea = 0;

        while (currentArea < targetArea) {
            const remaining = targetArea - currentArea;
            const currentCount = mirrors.length;

            // Try to find exact match for remaining area
            const exactMatch = possibleMirrors.find(m => m.surfaceArea === remaining);
            if (exactMatch && currentCount >= minMirrors - 1) {
                // Only use exact match if we're at or above minimum count
                mirrors.push({ ...exactMatch, rotation: 0 });
                currentArea += exactMatch.surfaceArea;
                console.log(`✓ Added exact match: ${exactMatch.shape} (${exactMatch.surfaceArea}) - total now ${currentArea}`);
                break;
            }

            // Choose mirror size based on current count
            let bestFit;
            if (currentCount < minMirrors) {
                // Need more mirrors - prefer smaller/medium mirrors (area 4-12)
                const mediumSmallAreas = uniqueAreas.filter(area => area >= 4 && area <= 12 && area <= remaining);
                if (mediumSmallAreas.length > 0) {
                    bestFit = mediumSmallAreas[Math.floor(Math.random() * mediumSmallAreas.length)];
                } else {
                    // Fallback to any that fits
                    bestFit = uniqueAreas.filter(area => area <= remaining).pop();
                }
            } else {
                // Have enough mirrors - find best fit to complete
                bestFit = uniqueAreas.filter(area => area <= remaining).pop(); // Largest that fits
            }

            if (!bestFit) {
                console.error(`❌ CRITICAL: No mirror fits in remaining ${remaining}. This should never happen!`);
                break;
            }

            // Get a random mirror with this surface area (for variety)
            const candidates = possibleMirrors.filter(m => m.surfaceArea === bestFit);
            const selected = candidates[Math.floor(Math.random() * candidates.length)];

            mirrors.push({ ...selected, rotation: 0 });
            currentArea += selected.surfaceArea;
            console.log(`✓ Added ${selected.shape} (${selected.surfaceArea}) - total now ${currentArea}/${targetArea}, count: ${mirrors.length}`);

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

        if (mirrors.length < minMirrors) {
            console.warn(`⚠️ Generated ${mirrors.length} mirrors, which is below minimum of ${minMirrors}`);
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