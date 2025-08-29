import { CONFIG } from '../config.js';

export class SurfaceAreaManager {
    static TARGET_SURFACE_AREA = 84; // Target total surface area in grid lengths
    static MIN_MIRRORS = 6; // Minimum number of mirrors
    
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
        
        return mirrors;
    }
    
    /**
     * Generate mirrors for free play mode with exact target surface area
     */
    static generateMirrorsWithTargetSurfaceArea() {
        const targetArea = this.TARGET_SURFACE_AREA;
        const minMirrors = this.MIN_MIRRORS;
        const possibleMirrors = this.getAllPossibleMirrors();
        
        let selectedMirrors = [];
        let currentSurfaceArea = 0;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            selectedMirrors = [];
            currentSurfaceArea = 0;
            
            // TEMPORARY: Force an isosceles triangle first to test
            const isoscelesOptions = possibleMirrors.filter(m => m.shape === 'isoscelesTriangle');
            if (isoscelesOptions.length > 0 && selectedMirrors.length === 0) {
                const forcedIsosceles = isoscelesOptions[Math.floor(Math.random() * isoscelesOptions.length)];
                selectedMirrors.push({ ...forcedIsosceles });
                currentSurfaceArea += forcedIsosceles.surfaceArea;
                console.log(`FORCED ISOSCELES: base=${forcedIsosceles.width/20}, height=${forcedIsosceles.height/20}, surface area=${forcedIsosceles.surfaceArea}`);
            }
            
            // Generate mirrors until we're close to target
            while (currentSurfaceArea < targetArea && selectedMirrors.length < 50) {
                const remainingArea = targetArea - currentSurfaceArea;
                
                // If we're close to the target, be more selective
                let candidateMirrors;
                if (remainingArea <= 15) {
                    // Find mirrors that fit exactly or leave room for small mirrors
                    candidateMirrors = possibleMirrors.filter(m => 
                        m.surfaceArea <= remainingArea && 
                        (m.surfaceArea === remainingArea || remainingArea - m.surfaceArea >= 3)
                    );
                } else {
                    // Early stage - use any mirror, but prefer larger ones to make progress
                    candidateMirrors = possibleMirrors.filter(m => m.surfaceArea <= remainingArea);
                    // Bias toward larger mirrors early on
                    if (selectedMirrors.length < minMirrors / 2) {
                        candidateMirrors = candidateMirrors.filter(m => m.surfaceArea >= 6);
                    }
                }
                
                if (candidateMirrors.length === 0) {
                    // No valid mirrors fit, try backtracking
                    if (selectedMirrors.length > 0) {
                        const lastMirror = selectedMirrors.pop();
                        currentSurfaceArea -= lastMirror.surfaceArea;
                        continue;
                    } else {
                        break; // Start over
                    }
                }
                
                // Select random mirror from candidates
                const randomMirror = candidateMirrors[Math.floor(Math.random() * candidateMirrors.length)];
                const mirrorCopy = { ...randomMirror };
                
                // Add random rotation for triangles
                if (mirrorCopy.shape === 'rightTriangle' || mirrorCopy.shape === 'isoscelesTriangle') {
                    mirrorCopy.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
                }
                
                selectedMirrors.push(mirrorCopy);
                currentSurfaceArea += randomMirror.surfaceArea;
            }
            
            // Check if we hit our target exactly and have minimum mirrors
            if (currentSurfaceArea === targetArea && selectedMirrors.length >= minMirrors) {
                console.log(`Surface area generation successful! ${selectedMirrors.length} mirrors, total area: ${currentSurfaceArea}`);
                return selectedMirrors;
            }
            
            attempts++;
        }
        
        // Fallback: if we couldn't generate exact target, get as close as possible
        console.warn(`Could not generate exact target surface area after ${maxAttempts} attempts`);
        console.warn(`Final attempt: ${selectedMirrors.length} mirrors, total area: ${currentSurfaceArea}, target: ${targetArea}`);
        
        return selectedMirrors.length >= minMirrors ? selectedMirrors : this.generateFallbackMirrors();
    }
    
    /**
     * Fallback mirror generation - ensures we have playable mirrors even if exact target fails
     */
    static generateFallbackMirrors() {
        console.warn('Using fallback mirror generation');
        const mirrors = [];
        
        // Generate exactly 6 mirrors with roughly balanced surface area
        const baseMirrors = [
            { shape: 'square', size: 40, width: 40, height: 40, rotation: 0 },      // Area: 8
            { shape: 'square', size: 40, width: 40, height: 40, rotation: 0 },      // Area: 8  
            { shape: 'rectangle', size: 60, width: 60, height: 40, rotation: 0 },   // Area: 10
            { shape: 'rectangle', size: 60, width: 60, height: 40, rotation: 0 },   // Area: 10
            { shape: 'rightTriangle', size: 60, width: 60, height: 60, rotation: 0 }, // Area: 10
            { shape: 'rightTriangle', size: 40, width: 40, height: 40, rotation: 0 } // Area: 6 (replaced invalid isosceles)
        ];
        
        // Add random rotations for triangles
        baseMirrors.forEach(mirror => {
            if (mirror.shape === 'rightTriangle' || mirror.shape === 'isoscelesTriangle') {
                mirror.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
            }
            mirrors.push(mirror);
        });
        
        const totalArea = mirrors.reduce((sum, m) => sum + this.calculateMirrorSurfaceArea(m), 0);
        console.log(`Fallback mirrors generated: ${mirrors.length} mirrors, total area: ${totalArea}`);
        
        return mirrors;
    }
    
    /**
     * Calculate total surface area of a mirror array
     */
    static calculateTotalSurfaceArea(mirrors) {
        return mirrors.reduce((total, mirror) => total + this.calculateMirrorSurfaceArea(mirror), 0);
    }
}