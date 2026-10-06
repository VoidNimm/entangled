import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLIPS_DIR = 'public/assets/clips';

const toEncode = [
  { name: 'clips02.mp4', limit: 8 },
  { name: 'clips02-m.mp4', limit: 4 },
  { name: 'clips04.mp4', limit: 8 },
  { name: 'clips04-m.mp4', limit: 4 },
];

for (const { name, limit } of toEncode) {
  const filepath = path.join(CLIPS_DIR, name);
  const sizeMB = fs.statSync(filepath).size / (1024 * 1024);
  
  if (sizeMB > limit) {
    console.log(`\nRe-encoding ${name} (Current size: ${sizeMB.toFixed(2)} MB)`);
    const tempPath = path.join(CLIPS_DIR, `temp-${name}`);
    
    // Encode with CRF 28
    execSync(`ffmpeg -y -i "${filepath}" -vcodec libx264 -crf 28 -g 1 -an -movflags +faststart "${tempPath}"`, { stdio: 'ignore' });
    
    const newSizeMB = fs.statSync(tempPath).size / (1024 * 1024);
    const savings = ((sizeMB - newSizeMB) / sizeMB) * 100;
    
    console.log(`New size: ${newSizeMB.toFixed(2)} MB (Savings: ${savings.toFixed(2)}%)`);
    
    if (savings >= 15) {
      fs.copyFileSync(filepath, path.join('raw', `backup-${name}`)); // Keep original just in case it wasn't in raw
      try { fs.unlinkSync(filepath); } catch {}
      fs.renameSync(tempPath, filepath);
      
      // Extract 3 frames to check quality manually
      try { fs.mkdirSync('reference/after/6A/quality', { recursive: true }); } catch {}
      execSync(`ffmpeg -y -i "${filepath}" -vf "select='eq(n,0)+eq(n,30)+eq(n,60)'" -fps_mode vfr "reference/after/6A/quality/${name}-frame-%d.jpg"`, { stdio: 'ignore' });
      execSync(`ffmpeg -y -i "raw/backup-${name}" -vf "select='eq(n,0)+eq(n,30)+eq(n,60)'" -fps_mode vfr "reference/after/6A/quality/${name}-orig-frame-%d.jpg"`, { stdio: 'ignore' });
    } else {
      console.log('Savings < 15%, keeping original');
      fs.unlinkSync(tempPath);
    }
  }
}
