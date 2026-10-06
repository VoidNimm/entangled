/**
 * Sample background colors from poster images using ffmpeg.
 * Reads a 50x50 pixel area from the LEFT side of each image (where bg is clear, figure is right-of-center).
 * Outputs average RGB as hex.
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

const posters = [
  { file: 'public/assets/posters/clips01-first.jpg', label: 'clips01-first (Hero/Noise bg)' },
  { file: 'public/assets/posters/clips02-first.jpg', label: 'clips02-first (Unravel bg)' },
  { file: 'public/assets/posters/clips02-last.jpg',  label: 'clips02-last (Unravel end)' },
  { file: 'public/assets/posters/clips03-first.jpg', label: 'clips03-first (Heat entry)' },
  { file: 'public/assets/posters/clips03-last.jpg',  label: 'clips03-last (Heat darkest)' },
  { file: 'public/assets/posters/clips04-first.jpg', label: 'clips04-first (Stillness)' },
  { file: 'public/assets/posters/clips04-last.jpg',  label: 'clips04-last (Stillness end)' },
];

for (const { file, label } of posters) {
  const tmp = `scripts/tmp_clr.ppm`;
  try {
    // Crop left background region (x=30, y=200, width=120, height=120), scale to 1x1 for avg
    execSync(
      `ffmpeg -y -i "${file.replace(/\//g, '\\')}" -vf "crop=120:120:30:200,scale=1:1" -f rawvideo -pix_fmt rgb24 "${tmp.replace(/\//g, '\\')}" 2>nul`,
      { stdio: 'pipe' }
    );
    const buf = readFileSync(tmp);
    const r = buf[0], g = buf[1], b = buf[2];
    const hex = `#${r.toString(16).padStart(2,'0').toUpperCase()}${g.toString(16).padStart(2,'0').toUpperCase()}${b.toString(16).padStart(2,'0').toUpperCase()}`;
    console.log(`${label}: ${hex}  (rgb(${r},${g},${b}))`);
    unlinkSync(tmp);
  } catch (e) {
    console.log(`${label}: ERROR - ${e.message}`);
  }
}
