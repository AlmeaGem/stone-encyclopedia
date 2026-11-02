import { it, expect } from 'vitest';
import sharp from 'sharp';
import { publicImage, sha256 } from '../scripts/public-image';
import { watermark, samples } from '../scripts/watermark-preview';

it('resizes only oversized public copies, preserving ratio, alpha and the source bytes', async () => {
  const source = await sharp({
    create: {
      width: 1920,
      height: 1280,
      channels: 4,
      background: { r: 176, g: 130, b: 104, alpha: 0.5 },
    },
  })
    .webp({ lossless: true })
    .toBuffer();
  const originalHash = sha256(source);
  const output = await publicImage(source);
  expect([output.width, output.height]).toEqual([960, 640]);
  expect(sha256(source)).toBe(originalHash);
  expect(sha256(output.bytes)).not.toBe(originalHash);
  const pixel = await sharp(output.bytes).raw().toBuffer();
  expect([...pixel.subarray(0, 3)]).toEqual(
    expect.arrayContaining([expect.any(Number)]),
  );
  for (const [index, expected] of [176, 130, 104, 128].entries())
    expect(Math.abs(pixel[index] - expected)).toBeLessThanOrEqual(3);
  expect(await publicImage(output.bytes)).toEqual(output);
});

it('watermarks only a corner without changing pixels elsewhere, dimensions or alpha', async () => {
  expect(samples).toHaveLength(6);
  expect(new Set(samples.map((sample) => sample.stoneId)).size).toBe(6);
  const source = await sharp({
    create: { width: 480, height: 480, channels: 4, background: '#292420' },
  })
    .webp({ lossless: true })
    .toBuffer();
  const originalHash = sha256(source);
  const result = await watermark(source, 'bottom-right');
  expect(result.color).toBe('#ffffff');
  expect(sha256(source)).toBe(originalHash);
  expect(sha256(result.bytes)).not.toBe(originalHash);
  const region = { left: 0, top: 0, width: 480, height: 400 };
  expect(await sharp(result.bytes).extract(region).raw().toBuffer()).toEqual(
    await sharp(source).extract(region).raw().toBuffer(),
  );
  expect((await sharp(result.bytes).metadata()).width).toBe(480);
  await expect(watermark(source, 'top-left', 'bad color')).rejects.toThrow();
});
