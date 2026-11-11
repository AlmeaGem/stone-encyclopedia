export const MAX_FILES = 5;
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 1024 * 1024;
export const MAX_INPUT_EDGE = 12000;
export const MAX_INPUT_PIXELS = 40_000_000;
export const MAX_OUTPUT_EDGE = 1600;
export function detectType(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return 'image/png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}
export async function sanitizeImage(file) {
  if (!file || file.size === 0 || file.size > MAX_INPUT_BYTES)
    throw Error('画像は1枚8MB以下にしてください。');
  const type = detectType(
    new Uint8Array(await file.slice(0, 12).arrayBuffer()),
  );
  if (!type || (file.type && file.type !== type))
    throw Error('JPG・PNG・WebPの正しい画像を選んでください。');
  let image;
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw Error('画像を読み取れませんでした。');
  }
  try {
    if (
      !image.width ||
      !image.height ||
      image.width > MAX_INPUT_EDGE ||
      image.height > MAX_INPUT_EDGE ||
      image.width * image.height > MAX_INPUT_PIXELS
    )
      throw Error(
        '画像は縦横12000ピクセル以下、4000万画素以下にしてください。',
      );
    const scale = Math.min(
      1,
      MAX_OUTPUT_EDGE / Math.max(image.width, image.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw Error('画像を処理できませんでした。');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.8),
    );
    if (!blob || blob.type !== 'image/webp')
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8),
      );
    if (!blob || blob.size > MAX_OUTPUT_BYTES)
      throw Error('縮小後の画像が1MBを超えました。別の画像をお試しください。');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error('画像を保存できませんでした。'));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    image.close();
  }
}
export async function restoreImages(entries) {
  if (entries === undefined) return [];
  if (!Array.isArray(entries) || entries.length > MAX_FILES)
    throw Error('参考画像は最大5枚です。');
  const results = [];
  for (const entry of entries) {
    if (
      typeof entry?.dataUrl !== 'string' ||
      entry.dataUrl.length > Math.ceil((MAX_OUTPUT_BYTES * 4) / 3) + 100 ||
      !/^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        entry.dataUrl,
      )
    )
      throw Error('参考画像データの形式が正しくありません。');
    let raw;
    try {
      raw = atob(entry.dataUrl.split(',')[1]);
    } catch {
      throw Error('参考画像データを読み取れません。');
    }
    if (raw.length > MAX_OUTPUT_BYTES)
      throw Error('保存された参考画像が大きすぎます。');
    const data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
    results.push(
      await sanitizeImage(
        new Blob([data], {
          type: entry.dataUrl.startsWith('data:image/webp;')
            ? 'image/webp'
            : 'image/jpeg',
        }),
      ),
    );
  }
  return results;
}
