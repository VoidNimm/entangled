import fs from 'fs';

function analyzeTrace(filename) {
  const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  const events = data.traceEvents || data;

  const frames = events.filter(e => e.name === 'DrawFrame' || e.name === 'Commit');
  let frameTimes = [];
  if (frames.length > 1) {
    frames.sort((a, b) => a.ts - b.ts);
    for (let i = 1; i < frames.length; i++) {
      frameTimes.push((frames[i].ts - frames[i-1].ts) / 1000); // ms
    }
  }

  frameTimes.sort((a, b) => a - b);
  const p50 = frameTimes[Math.floor(frameTimes.length * 0.5)] || 0;
  const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)] || 0;
  const over50 = frameTimes.filter(t => t > 50).length;

  let longTasks = 0;
  let tbt = 0;
  const tasks = events.filter(e => e.name === 'RunTask' && e.dur);
  tasks.forEach(t => {
    const durMs = t.dur / 1000;
    if (durMs > 50) {
      longTasks++;
      tbt += (durMs - 50);
    }
  });

  console.log(`--- ${filename} ---`);
  console.log(`p50 frame time: ${p50.toFixed(2)} ms`);
  console.log(`p95 frame time: ${p95.toFixed(2)} ms`);
  console.log(`Frames > 50ms: ${over50}`);
  console.log(`Long tasks: ${longTasks}`);
  console.log(`Total blocking time: ${tbt.toFixed(2)} ms`);
}

analyzeTrace('trace-desktop.json');
analyzeTrace('trace-mobile.json');
