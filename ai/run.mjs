/**
 * run.mjs — the AI plays a few hundred fresh boards and learns to defend each.
 *
 * Each row = one fresh board. The AI starts from the dealt layout and runs an
 * evolutionary hill-climb (policy.optimize) to survive as long as it can. We log:
 *   - the survival TRAJECTORY per board (best-so-far vs. refinement step),
 *   - each board's final score (a "row"),
 *   - the ten best individual games (board + placements + replay trace).
 *
 * The averaged trajectory is the learning curve: the AI's survival climbing as it
 * refines its defense. Writes ai/results.json.
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    newBoard, simulateTrace, scoreGame, placementValid, MAX_TIME,
} from './engine.mjs';
import { placeByPolicy, optimize } from './policy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const ROWS = Number(process.env.ROWS || 260);
const ITERS = Number(process.env.ITERS || 140);
const CHECKPOINTS = Number(process.env.CHECKPOINTS || 50);
const SEED = Number(process.env.SEED || 12345);

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rng = mulberry32(SEED);
const DEFAULT_THETA = { radius: 120, tiltDeg: 45, tiltAmp: 30, tiltPhaseDeg: 0, phaseDeg: 0, spreadDeg: 15 };

// top-10 keeper
const top = [];
function offer(score, board, placements) {
    if (top.length >= 10 && score <= top[top.length - 1].score) return;
    top.push({ score, board, placements });
    top.sort((a, b) => b.score - a.score);
    if (top.length > 10) top.length = 10;
}

const trajectories = [];   // per-board best-so-far arrays (equal length)
const finals = [];         // per-board final score, in play order
let bestSoFar = 0;
const recordLine = [];     // best-so-far across rows
const t0 = Date.now();

console.log(`Playing ${ROWS} fresh boards, ${ITERS} refinement steps each…`);
for (let r = 0; r < ROWS; r++) {
    const board = newBoard();

    // Start from the dealt layout; if that's somehow illegal, fall back to a ring.
    let start = board.mirrors.map(m => ({ x: m.x, y: m.y, rotation: m.rotation || 0 }));
    if (!placementValid(board.mirrorInventory, start)) {
        start = placeByPolicy(board.mirrorInventory, DEFAULT_THETA, rng);
    }

    const res = optimize(board, start, ITERS, rng, CHECKPOINTS);
    trajectories.push(res.trajectory);
    finals.push(+res.score.toFixed(2));
    if (placementValid(board.mirrorInventory, res.placements)) offer(res.score, board, res.placements);
    if (res.score > bestSoFar) bestSoFar = res.score;
    recordLine.push(+bestSoFar.toFixed(2));

    if ((r + 1) % 20 === 0) {
        const recent = finals.slice(-20).reduce((p, c) => p + c, 0) / 20;
        process.stdout.write(`  row ${String(r + 1).padStart(3)}/${ROWS}  recent avg=${recent.toFixed(1)}s  best=${bestSoFar.toFixed(1)}s\n`);
    }
}

// Average learning trajectory (+ quartile band) across boards.
const L = Math.min(...trajectories.map(t => t.length));
const meanTraj = [], p25Traj = [], p75Traj = [];
for (let i = 0; i < L; i++) {
    const col = trajectories.map(t => t[i]).sort((a, b) => a - b);
    meanTraj.push(+(col.reduce((p, c) => p + c, 0) / col.length).toFixed(2));
    p25Traj.push(col[Math.floor(col.length * 0.25)]);
    p75Traj.push(col[Math.floor(col.length * 0.75)]);
}
const stepAxis = Array.from({ length: L }, (_, i) => i * Math.max(1, Math.floor(ITERS / CHECKPOINTS)));

// Replay traces for the top 10.
const top10 = top.map((run, idx) => {
    const trace = simulateTrace(run.board.mirrorInventory, run.placements, run.board.spawners,
        { fps: 30, maxSeconds: 24 });
    return {
        rank: idx + 1,
        score: +run.score.toFixed(2),
        cappedPerfect: run.score >= MAX_TIME - 0.001,
        mirrorCount: run.board.mirrorInventory.length,
        spawners: run.board.spawners.map(s => ({ x: Math.round(s.x), y: Math.round(s.y) })),
        placements: run.placements.map(p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), rotation: +p.rotation.toFixed(1) })),
        trace,
    };
});

// Full puzzles for the top 5, so the REAL game can load and record them.
const exhibitRuns = top.slice(0, 5).map((run, i) => ({
    rank: i + 1,
    score: +run.score.toFixed(2),
    mode: 'main',
    mirrors: run.board.mirrorInventory.map((inv, j) => ({
        ...inv,
        x: +run.placements[j].x.toFixed(2),
        y: +run.placements[j].y.toFixed(2),
        rotation: +run.placements[j].rotation.toFixed(2),
    })),
    spawners: run.board.spawners.map(s => ({ x: s.x, y: s.y, angle: s.angle })),
}));
writeFileSync(join(HERE, 'exhibit-runs.json'), JSON.stringify({ runs: exhibitRuns }));
console.log(`Wrote exhibit-runs.json (top 5: ${exhibitRuns.map(r => r.score + 's').join(', ')})`);

const startAvg = meanTraj[0], endAvg = meanTraj[meanTraj.length - 1];
const results = {
    meta: {
        rows: ROWS, iters: ITERS, seed: SEED,
        bestScore: +bestSoFar.toFixed(2),
        startAvg, endAvg,
        improvement: +(endAvg / Math.max(0.01, startAvg)).toFixed(2),
        overallAvgFinal: +(finals.reduce((p, c) => p + c, 0) / finals.length).toFixed(2),
        maxTime: MAX_TIME,
        elapsedSec: +((Date.now() - t0) / 1000).toFixed(1),
    },
    learning: { stepAxis, meanTraj, p25Traj, p75Traj },
    finals,
    recordLine,
    top10,
};

const outPath = join(HERE, 'results.json');
writeFileSync(outPath, JSON.stringify(results));
console.log(`\nDone in ${results.meta.elapsedSec}s. ${ROWS} boards, ${ROWS * ITERS} refinements.`);
console.log(`Avg survival: dealt ${startAvg}s -> refined ${endAvg}s (${results.meta.improvement}x). Best single game ${bestSoFar.toFixed(1)}s.`);
console.log(`Top 10: ${top10.map(t => t.score + 's').join(', ')}`);
console.log(`Wrote ${outPath} (${(JSON.stringify(results).length / 1024).toFixed(0)} KB)`);
