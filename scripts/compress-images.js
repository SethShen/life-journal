#!/usr/bin/env node
/**
 * compress-images.js — 压缩 photos/ 下的照片
 *
 * 依赖：sharp（会尝试按需安装）
 *       npm i -D sharp
 *
 * 如果没有 sharp，会退化为「仅列出待压缩文件」的提示模式，
 * 不会破坏任何东西。
 *
 * 策略：
 *   - 长边缩到 1920px
 *   - JPEG 质量 80
 *   - 小于 200KB 的跳过
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');

const MAX_EDGE = 1920;
const QUALITY = 80;
const MIN_SIZE = 200 * 1024; // 小于 200KB 跳过

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('⚠ 未安装 sharp。请先运行：npm i -D sharp');
  console.error('  （也可以直接跳过压缩，但仓库会变大）');
  process.exit(0);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(PHOTOS_DIR);
  if (!files.length) {
    console.log('没有找到图片。');
    return;
  }

  let saved = 0;
  let count = 0;

  for (const file of files) {
    const stat = fs.statSync(file);
    if (stat.size < MIN_SIZE) continue;

    const ext = path.extname(file).toLowerCase();
    const tmp = file.replace(ext, `.tmp${ext === '.png' ? '.png' : '.jpg'}`);

    try {
      let pipeline = sharp(file).rotate().resize(MAX_EDGE, MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (ext === '.png') {
        pipeline = pipeline.png({ quality: QUALITY, compressionLevel: 9 });
      } else {
        pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
      }

      await pipeline.toFile(tmp);

      const newSize = fs.statSync(tmp).size;
      if (newSize < stat.size) {
        fs.renameSync(tmp, file);
        const delta = stat.size - newSize;
        saved += delta;
        count++;
        console.log(
          `  ✓ ${path.relative(ROOT, file)}  ${(stat.size / 1024 / 1024).toFixed(2)}MB → ${(
            newSize /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      } else {
        fs.unlinkSync(tmp);
      }
    } catch (err) {
      console.error(`  ✗ ${path.relative(ROOT, file)}: ${err.message}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }

  console.log('');
  console.log(`✓ 压缩完成：${count} 张，节省 ${(saved / 1024 / 1024).toFixed(2)} MB`);
}

main();
