/**
 * Local anti-cheat demo against the Firebase emulator.
 *
 * Run the emulator first (npm run emulate), then in another terminal:  npm run test-local
 *
 * It signs in anonymously, plays an honest game (which the server scores), then
 * tries several cheats and shows each one getting rejected server-side.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const app = initializeApp({ projectId: 'singularity-c216f', apiKey: 'demo-emulator' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const functions = getFunctions(app);
connectFunctionsEmulator(functions, '127.0.0.1', 5001);

const startGame = httpsCallable(functions, 'startGame');
const submitGame = httpsCallable(functions, 'submitGame');

let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? (pass++, console.log('  ✓', msg)) : (fail++, console.log('  ✗', msg)); };
async function expectReject(fn, label) {
    try { await fn(); fail++; console.log('  ✗', label, '(expected rejection but it SUCCEEDED)'); }
    catch (e) { pass++; console.log('  ✓', label, '→', e.message); }
}

await signInAnonymously(auth);
console.log('Signed in anonymously to the emulator.\n');

console.log('1) Honest game: server issues a puzzle, we play it exactly as issued');
const { data: game } = await startGame({ mode: 'main' });
ok(game.sessionId && game.puzzle?.mirrors?.length > 0,
   `startGame issued ${game.puzzle.mirrors.length} mirrors + ${game.puzzle.spawners.length} spawners`);
const honest = game.puzzle.mirrors.map(m => ({ x: m.x, y: m.y, rotation: m.rotation }));
const { data: scored } = await submitGame({ sessionId: game.sessionId, placements: honest, displayName: 'Tester' });
ok(scored.verified && typeof scored.score === 'number',
   `submitGame returned a SERVER-computed score: ${scored.scoreFormatted} (${scored.score}s)`);

console.log('\n2) Cheat: resubmit an already-finished session');
await expectReject(() => submitGame({ sessionId: game.sessionId, placements: honest, displayName: 'Tester' }),
    'double-submit rejected');

console.log('\n3) Cheat: place a mirror on the protected core');
const { data: g3 } = await startGame({ mode: 'main' });
const onCore = g3.puzzle.mirrors.map((m, i) => i === 0
    ? { x: 400, y: 300, rotation: m.rotation }
    : { x: m.x, y: m.y, rotation: m.rotation });
await expectReject(() => submitGame({ sessionId: g3.sessionId, placements: onCore, displayName: 'Cheater' }),
    'illegal placement rejected');

console.log('\n4) Cheat: submit more mirrors than were issued');
const { data: g4 } = await startGame({ mode: 'main' });
const extra = [...g4.puzzle.mirrors.map(m => ({ x: m.x, y: m.y, rotation: m.rotation })), { x: 200, y: 200, rotation: 0 }];
await expectReject(() => submitGame({ sessionId: g4.sessionId, placements: extra, displayName: 'Cheater' }),
    'extra-mirror rejected');

console.log('\n5) Daily mode: issue today\'s puzzle; a second attempt the same day is blocked');
const { data: daily } = await startGame({ mode: 'daily' });
ok(daily.puzzle?.mode === 'daily' && daily.puzzle.mirrorInventory.length > 0,
   `daily startGame issued ${daily.puzzle.mirrorInventory.length} mirrors (theme: ${daily.puzzle.theme})`);
await expectReject(() => startGame({ mode: 'daily' }), 'second daily attempt blocked (one per day)');

console.log(`\n${fail === 0 ? 'ALL GOOD' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
