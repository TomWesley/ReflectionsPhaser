import { IronCladValidator } from '../validation/IronCladValidator.js';
import { MirrorPlacementValidation } from '../validation/MirrorPlacementValidation.js';

/**
 * ValidationRenderer - Handles drawing validation visuals
 * Note: Invalid placements are now prevented, so we only show valid indicators
 */
export class ValidationRenderer {
    static drawValidationViolations(ctx, mirrors, isPlaying) {
        // Don't show any validation visuals during gameplay
        if (isPlaying) return;

        // Validation violations are now prevented by the placement system
        // So we don't need to draw warning indicators anymore
        // Mirrors will always be in valid positions
    }
}
