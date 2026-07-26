/**
 * policy.mjs — the AI's "brain".
 *
 * A very simple, legible strategy: arrange the board's mirrors on a defensive
 * RING around the core, then fine-tune each a little. The ring's geometry is a
 * tiny parameter vector theta that the learner (run.mjs) tunes over time:
 *
 *   radius    how far from the core the ring sits (mirrors push outward to fit)
 *   tiltDeg   each mirror's rotation relative to its radial direction
 *   phaseDeg  angular offset of the first mirror
 *   spreadDeg how much random angular jitter to try when fitting
 *
 * placeByPolicy() turns (board, theta) into concrete, VALID placements; then a
 * short hill-climb (polish) nudges mirrors to squeeze out extra survival time.
 */
import {
    CENTER, FORBID_RADIUS, EDGE, W, H,
    buildMirror, mirrorValidAgainst, scoreGame, placementValid,
} from './engine.mjs';

export const THETA_SPEC = [
    { key: 'radius', min: 100, max: 235, sigma: 40 },
    { key: 'tiltDeg', min: -180, max: 180, sigma: 60 },        // base orientation vs radial
    { key: 'tiltAmp', min: 0, max: 110, sigma: 45 },           // how much orientation swings around the ring
    { key: 'tiltPhaseDeg', min: 0, max: 360, sigma: 120 },     // where the swing peaks
    { key: 'phaseDeg', min: 0, max: 360, sigma: 90 },
    { key: 'spreadDeg', min: 0, max: 45, sigma: 20 },
];

export function randomTheta(rng) {
    const t = {};
    for (const s of THETA_SPEC) t[s.key] = s.min + rng() * (s.max - s.min);
    return t;
}

export function clampTheta(t) {
    const out = {};
    for (const s of THETA_SPEC) out[s.key] = Math.max(s.min, Math.min(s.max, t[s.key]));
    return out;
}

const DEG = Math.PI / 180;

/** Rejection-sample a legal spot for one mirror anywhere in the playable annulus. */
function randomValidPlacement(inv, placedInsts, rng, tries = 120) {
    for (let a = 0; a < tries; a++) {
        const ang = rng() * Math.PI * 2;
        const r = FORBID_RADIUS + 10 + rng() * 160;
        const x = CENTER.x + Math.cos(ang) * r;
        const y = CENTER.y + Math.sin(ang) * r;
        if (x < EDGE || x > W - EDGE || y < EDGE || y > H - EDGE) continue;
        const rotation = rng() * 360;
        const inst = buildMirror(inv, { x, y, rotation });
        if (mirrorValidAgainst(inst, placedInsts)) return { x, y, rotation };
    }
    return null;
}

/**
 * Build a full set of valid placements from a board + theta. Mirrors are laid on
 * a ring; if one won't fit at the ring radius it is pushed outward / jittered,
 * and failing that dropped to a random legal spot. Always returns a valid config.
 */
export function placeByPolicy(inventory, theta, rng) {
    const N = inventory.length;
    const placedInsts = [];
    const placements = new Array(N);

    for (let i = 0; i < N; i++) {
        const baseAngle = theta.phaseDeg * DEG + (i * 2 * Math.PI) / N;
        let done = null;
        for (let attempt = 0; attempt < 30 && !done; attempt++) {
            const r = theta.radius + attempt * 6;                 // push outward to fit
            const aJit = (rng() * 2 - 1) * theta.spreadDeg * DEG;
            const ang = baseAngle + aJit;
            const x = CENTER.x + Math.cos(ang) * r;
            const y = CENTER.y + Math.sin(ang) * r;
            if (x < EDGE || x > W - EDGE || y < EDGE || y > H - EDGE) continue;
            // Orientation = radial angle + base tilt + a tilt wave that swings twice
            // around the ring (lets different sectors deflect differently).
            const wave = theta.tiltAmp * Math.cos(2 * ang + theta.tiltPhaseDeg * DEG);
            const rotation = ang / DEG + theta.tiltDeg + wave;
            const inst = buildMirror(inventory[i], { x, y, rotation });
            if (mirrorValidAgainst(inst, placedInsts)) {
                done = { x, y, rotation };
                placedInsts.push(inst);
            }
        }
        if (!done) {
            done = randomValidPlacement(inventory[i], placedInsts, rng);
            if (done) placedInsts.push(buildMirror(inventory[i], done));
        }
        // Last resort: park it far out so the config stays valid-ish; validity is
        // re-checked by the caller and invalid configs are simply not kept.
        if (!done) done = { x: CENTER.x, y: EDGE + 5, rotation: 0 };
        placements[i] = done;
    }
    return placements;
}

/**
 * Short hill-climb: repeatedly nudge a random mirror's position/rotation and keep
 * the change if it survives longer (and stays legal). This is the AI "fine-tuning"
 * its plan on the specific board. Returns { placements, score }.
 */
export function polish(inventory, placements, spawners, steps, rng) {
    let best = placements.map(p => ({ ...p }));
    let bestScore = scoreGame(inventory, best, spawners);

    for (let s = 0; s < steps; s++) {
        const anneal = 1 - (s / Math.max(1, steps)) * 0.7;   // shrink nudges over time
        const i = Math.floor(rng() * inventory.length);
        const trial = best.map(p => ({ ...p }));
        const kind = rng();
        if (kind < 0.55) {                      // nudge position
            trial[i].x += (rng() * 2 - 1) * 20 * anneal;
            trial[i].y += (rng() * 2 - 1) * 20 * anneal;
        } else {                                // nudge rotation
            trial[i].rotation += (rng() * 2 - 1) * 24 * anneal;
        }
        if (!placementValid(inventory, trial)) continue;
        const sc = scoreGame(inventory, trial, spawners);
        if (sc > bestScore) { best = trial; bestScore = sc; }
    }
    return { placements: best, score: bestScore };
}

/** Play one board with a given theta: place by policy, polish, return the result. */
export function playBoard(board, theta, polishSteps, rng) {
    const placements = placeByPolicy(board.mirrorInventory, theta, rng);
    if (!placementValid(board.mirrorInventory, placements)) {
        // Couldn't build a legal ring for this board — count it as a poor game.
        return { placements, score: 0, valid: false };
    }
    const res = polish(board.mirrorInventory, placements, board.spawners, polishSteps, rng);
    return { placements: res.placements, score: res.score, valid: true };
}

/**
 * The AI learning to defend ONE board.
 *
 * Starting from the dealt layout, it runs an evolutionary hill-climb: each step
 * it mutates the placement (nudge/rotate a mirror, occasionally relocate one) and
 * keeps the change if the board survives at least as long. Exploration anneals so
 * it settles into a strong defense. Returns the best placement found, its score,
 * and the survival trajectory (best-so-far at evenly spaced checkpoints) — that
 * trajectory, averaged over many boards, is the learning curve.
 */
export function optimize(board, startPlacements, iters, rng, checkpoints = 50) {
    const inv = board.mirrorInventory, spawners = board.spawners;
    let best = startPlacements.map(p => ({ ...p }));
    let bestScore = scoreGame(inv, best, spawners);
    const trajectory = [];
    const every = Math.max(1, Math.floor(iters / checkpoints));

    for (let s = 0; s < iters; s++) {
        const anneal = 1 - (s / iters) * 0.85;
        const trial = best.map(p => ({ ...p }));
        const nMut = rng() < 0.25 ? 2 : 1;
        for (let k = 0; k < nMut; k++) {
            const i = Math.floor(rng() * inv.length);
            const kind = rng();
            if (kind < 0.5) {                              // nudge position
                trial[i].x += (rng() * 2 - 1) * (26 * anneal + 4);
                trial[i].y += (rng() * 2 - 1) * (26 * anneal + 4);
            } else if (kind < 0.85) {                      // nudge rotation
                trial[i].rotation += (rng() * 2 - 1) * (30 * anneal + 5);
            } else {                                       // occasional big relocate
                const ang = rng() * Math.PI * 2;
                const r = FORBID_RADIUS + 12 + rng() * 150;
                trial[i].x = CENTER.x + Math.cos(ang) * r;
                trial[i].y = CENTER.y + Math.sin(ang) * r;
                trial[i].rotation = rng() * 360;
            }
        }
        if (placementValid(inv, trial)) {
            const sc = scoreGame(inv, trial, spawners);
            if (sc >= bestScore) { best = trial; bestScore = sc; }
        }
        if (s % every === 0) trajectory.push(+bestScore.toFixed(2));
    }
    trajectory.push(+bestScore.toFixed(2));
    return { placements: best, score: bestScore, trajectory };
}
