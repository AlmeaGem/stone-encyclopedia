import {
  MAX_FILES,
  sanitizeImage,
  restoreImages,
} from './reference-images.mjs';
import {
  createConsultation,
  consultationText,
  normalizePreferences,
} from './consultation.mjs';
import { materials, defaultBeads, geometry, validateDesign } from './model.mjs';
// Images load only from the local, reviewed catalogue; no external requests.
const imageCache = new Map();
await Promise.all(
  materials
    .filter((m) => m.image)
    .map(async (m) => {
      const image = new Image();
      image.src = '.' + m.image.localPath;
      try {
        await image.decode();
        imageCache.set(m.id, image);
      } catch {
        /* clearly labeled fallback */
      }
    }),
);
const $ = (s) => document.querySelector(s),
  storageKey = 'almea-bracelet-private-preview-v1';
let references = [],
  referenceBusy = false,
  referenceGeneration = 0;
let state = { version: 1, wrist: 150, beads: structuredClone(defaultBeads) },
  selected = state.beads[0].id,
  undo = [],
  redo = [],
  drag = null;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) state = validateDesign(JSON.parse(saved));
  selected = state.beads[0].id;
} catch {}
const current = () => state.beads.find((b) => b.id === selected);
const material = (id) => materials.find((m) => m.id === id);
const gradient = (m) =>
  `radial-gradient(circle at 32% 24%, ${m.colors[0]} 0%, ${m.colors[1]} 48%, ${m.colors[2]} 100%)`;
function store() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    $('#status').textContent =
      'ブラウザ内に保存できません。編集データをファイルに保存してください。';
  }
}
function commit(fn) {
  const before = structuredClone(state),
    previousSelected = selected;
  fn();
  if (!geometry(state.beads)) {
    state = before;
    selected = previousSelected;
    $('#status').textContent = 'この組み合わせは円形に配置できません。';
    return;
  }
  undo.push(before);
  if (undo.length > 100) undo.shift();
  redo = [];
  store();
  render();
}
function renderPalette() {
  const q = $('#search').value.toLocaleLowerCase().trim();
  const sizeFilter = Number($('#filter-size').value);
  $('#palette').replaceChildren();
  for (const m of materials.filter(
    (m) =>
      m.stoneId &&
      (m.name + m.color + m.id).toLocaleLowerCase().includes(q) &&
      (!sizeFilter || m.sizes.includes(sizeFilter)),
  )) {
    const b = document.createElement('button');
    b.className = 'material';
    b.type = 'button';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = imageCache.has(m.id)
      ? `url(".${m.image.localPath}") center / contain no-repeat`
      : gradient(m);
    if (m.stoneId && !m.illustration && !imageCache.has(m.id))
      sw.title = '画像未登録・仮表示';
    const label = document.createElement('span');
    label.textContent =
      m.name +
      (m.stoneId && !m.illustration && !imageCache.has(m.id)
        ? '（画像未登録・仮表示）'
        : '');
    b.append(sw, label);
    b.onclick = () =>
      commit(() => {
        current().material = m.id;
        if (!m.sizes.includes(current().size)) current().size = m.sizes[0];
      });
    $('#palette').append(b);
  }
}
function render() {
  const g = geometry(state.beads),
    area = $('#beads');
  area.replaceChildren();
  const scale =
    40 / (g.radius + Math.max(...state.beads.map((b) => b.size / 2)));
  state.beads.forEach((b, i) => {
    const p = g.positions[i],
      m = material(b.material),
      node = document.createElement('button');
    node.type = 'button';
    node.className = 'bead' + (b.id === selected ? ' selected' : '');
    node.dataset.id = b.id;
    node.setAttribute('aria-label', `${i + 1}番 ${m.name} ${b.size}mm`);
    node.setAttribute('aria-pressed', String(b.id === selected));
    node.style.left = `${50 + p.x * scale}%`;
    node.style.top = `${50 + p.y * scale}%`;
    node.style.width = `${b.size * scale}%`;
    node.style.aspectRatio = '1';
    node.style.background = imageCache.has(m.id)
      ? `url(".${m.image.localPath}") center / contain no-repeat`
      : gradient(m);
    if (m.stoneId && !m.illustration && !imageCache.has(m.id))
      node.setAttribute(
        'aria-label',
        `${i + 1}番 ${m.name} ${b.size}mm 画像未登録・仮表示`,
      );
    node.addEventListener('click', () => {
      selected = b.id;
      render();
    });
    node.addEventListener('pointerdown', startDrag);
    area.append(node);
  });
  const selectedMaterial = material(current().material);
  $('#selected-label').textContent =
    `${state.beads.findIndex((b) => b.id === selected) + 1}番目・${selectedMaterial.name}${selectedMaterial.stoneId && !selectedMaterial.illustration && !imageCache.has(selectedMaterial.id) ? '（画像未登録・仮表示）' : ''}`;
  $('#size').replaceChildren(
    ...material(current().material).sizes.map((n) => {
      const option = document.createElement('option');
      option.value = String(n);
      option.textContent = `${n} mm`;
      return option;
    }),
  );
  $('#size').value = String(current().size);
  $('#wrist').value = String(state.wrist);
  const diff = g.innerCircumference - state.wrist;
  $('#estimate').textContent =
    `推定内周 ${g.innerCircumference.toFixed(1)} mm ／ 手首との差 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} mm`;
  $('#undo').disabled = !undo.length;
  $('#redo').disabled = !redo.length;
  $('#remove').disabled = state.beads.length <= 3;
  $('#add').disabled = state.beads.length >= 80;
}
function startDrag(e) {
  if (e.button !== 0) return;
  const node = e.currentTarget;
  selected = node.dataset.id;
  drag = { node, id: selected, x: e.clientX, y: e.clientY, moved: false };
  node.setPointerCapture(e.pointerId);
  node.addEventListener('pointermove', moveDrag);
  node.addEventListener('pointerup', endDrag);
  node.addEventListener('pointercancel', cancelDrag);
}
function moveDrag(e) {
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 4) drag.moved = true;
  if (drag.moved) {
    e.preventDefault();
    drag.node.classList.add('dragging');
    drag.node.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }
}
function clearDrag() {
  if (!drag) return;
  const n = drag.node;
  n.removeEventListener('pointermove', moveDrag);
  n.removeEventListener('pointerup', endDrag);
  n.removeEventListener('pointercancel', cancelDrag);
  drag = null;
}
function endDrag(e) {
  if (!drag) return;
  const d = drag;
  let target = null;
  if (d.moved) {
    let best = Infinity;
    for (const n of document.querySelectorAll('.bead')) {
      if (n.dataset.id === d.id) continue;
      const r = n.getBoundingClientRect(),
        dist = Math.hypot(
          e.clientX - (r.left + r.width / 2),
          e.clientY - (r.top + r.height / 2),
        );
      if (dist < best) {
        best = dist;
        target = n.dataset.id;
      }
    }
  }
  clearDrag();
  if (target) {
    commit(() => {
      const from = state.beads.findIndex((b) => b.id === d.id),
        to = state.beads.findIndex((b) => b.id === target);
      const [b] = state.beads.splice(from, 1);
      state.beads.splice(to, 0, b);
    });
  } else render();
}
function cancelDrag() {
  clearDrag();
  render();
}
function move(delta) {
  commit(() => {
    let i = state.beads.findIndex((b) => b.id === selected),
      j = (i + delta + state.beads.length) % state.beads.length;
    [state.beads[i], state.beads[j]] = [state.beads[j], state.beads[i]];
  });
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#size').onchange = (e) =>
  commit(() => (current().size = Number(e.target.value)));
$('#search').oninput = renderPalette;
$('#filter-size').onchange = renderPalette;
$('#wrist').onchange = (e) => {
  const n = Number(e.target.value);
  if (!Number.isFinite(n) || n < 80 || n > 300) {
    $('#status').textContent = '手首周りは80〜300mmで入力してください。';
    render();
    return;
  }
  commit(() => (state.wrist = n));
};
$('#add').onclick = () =>
  commit(() => {
    const i = state.beads.findIndex((b) => b.id === selected),
      b = { ...current(), id: crypto.randomUUID() };
    state.beads.splice(i + 1, 0, b);
    selected = b.id;
  });
$('#remove').onclick = () =>
  commit(() => {
    const i = state.beads.findIndex((b) => b.id === selected);
    state.beads.splice(i, 1);
    selected = state.beads[Math.min(i, state.beads.length - 1)].id;
  });
$('#previous').onclick = () => move(-1);
$('#next').onclick = () => move(1);
$('#undo').onclick = () => {
  if (!undo.length) return;
  redo.push(structuredClone(state));
  state = undo.pop();
  if (!current()) selected = state.beads[0].id;
  store();
  render();
};
$('#redo').onclick = () => {
  if (!redo.length) return;
  undo.push(structuredClone(state));
  state = redo.pop();
  if (!current()) selected = state.beads[0].id;
  store();
  render();
};
$('#save-data').onclick = () =>
  download(
    new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    'almea-bracelet.json',
  );
$('#load-data').onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10000000) throw Error('ファイルが大きすぎます。');
    const imported = JSON.parse(await f.text());
    const next = validateDesign(
      imported.kind === 'almea-consultation'
        ? imported.consultation.design
        : imported,
    );
    const restoredReferences =
      imported.kind === 'almea-consultation'
        ? await restoreImages(imported.referenceImages)
        : [];
    if (imported.kind === 'almea-consultation') {
      setPreferences(imported.consultation.preferences);
      $('#consult-budget').value = String(
        imported.consultation.budget || '',
      ).slice(0, 300);
      $('#consult-message').value = String(
        imported.consultation.message || '',
      ).slice(0, 4000);
    }
    referenceGeneration++;
    references = restoredReferences;
    renderReferences();
    commit(() => {
      state = next;
      selected = state.beads[0].id;
    });
    $('#status').textContent = 'デザインを読み込みました。';
  } catch (err) {
    $('#status').textContent = err.message || '読み込みに失敗しました。';
  } finally {
    e.target.value = '';
  }
};
function makeImage() {
  const c = document.createElement('canvas');
  c.width = 1000;
  c.height = 1100;
  const x = c.getContext('2d');
  x.fillStyle = '#faf8f5';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#6c5650';
  x.font = '24px serif';
  x.textAlign = 'center';
  x.fillText('ALMÉA GEM · DESIGN IMAGE', 500, 80);
  const g = geometry(state.beads),
    scale = 420 / (g.radius + Math.max(...state.beads.map((b) => b.size / 2)));
  state.beads.forEach((b, i) => {
    const p = g.positions[i],
      m = material(b.material),
      cx = 500 + p.x * scale,
      cy = 540 + p.y * scale,
      r = p.r * scale,
      grad = x.createRadialGradient(
        cx - r * 0.3,
        cy - r * 0.35,
        r * 0.04,
        cx,
        cy,
        r,
      );
    grad.addColorStop(0, m.colors[0]);
    grad.addColorStop(0.55, m.colors[1]);
    grad.addColorStop(1, m.colors[2]);
    if (imageCache.has(m.id)) {
      x.drawImage(imageCache.get(m.id), cx - r, cy - r, 2 * r, 2 * r);
    } else {
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.fillStyle = grad;
      x.fill();
    }
  });
  x.fillStyle = '#88756d';
  x.font = '20px serif';
  x.fillText(
    state.beads.some((b) => !imageCache.has(b.material))
      ? 'Includes illustrations · image is indicative'
      : 'Image is indicative',
    500,
    1040,
  );
  return c;
}
$('#save-image').onclick = () =>
  makeImage().toBlob((blob) => {
    if (blob) download(blob, 'almea-bracelet.png');
  }, 'image/png');
function renderReferences() {
  const list = $('#reference-list');
  list.replaceChildren();
  $('#reference-count').textContent = `${references.length} / ${MAX_FILES}枚`;
  references.forEach((item, index) => {
    const tile = document.createElement('div');
    tile.className = 'reference-tile';
    const image = document.createElement('img');
    image.src = item.dataUrl;
    image.alt = `参考画像 ${index + 1}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '削除';
    remove.setAttribute('aria-label', `参考画像 ${index + 1} を削除`);
    remove.onclick = () => {
      referenceGeneration++;
      references.splice(index, 1);
      renderReferences();
    };
    const replace = document.createElement('label');
    replace.className = 'button reference-replace';
    replace.textContent = '差し替え';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.hidden = true;
    input.onchange = async () => {
      if (input.files[0]) await processReferences([input.files[0]], index);
    };
    replace.append(input);
    tile.append(image, remove, replace);
    list.append(tile);
  });
}
async function processReferences(files, replaceIndex = null) {
  if (referenceBusy) {
    $('#reference-status').textContent =
      '画像の処理が終わるまでお待ちください。';
    return;
  }
  if (replaceIndex === null && files.length + references.length > MAX_FILES) {
    $('#reference-status').textContent = '参考画像は最大5枚です。';
    return;
  }
  const generation = referenceGeneration;
  referenceBusy = true;
  $('#reference-status').textContent = '画像を処理しています。';
  try {
    const out = [];
    for (const file of files) out.push(await sanitizeImage(file));
    if (generation !== referenceGeneration)
      throw Error('データが変更されたため、画像を追加しませんでした。');
    if (replaceIndex === null) references.push(...out);
    else references[replaceIndex] = out[0];
    renderReferences();
    $('#reference-status').textContent = '参考画像を端末内で準備しました。';
  } catch (e) {
    $('#reference-status').textContent =
      e.message || '画像を処理できませんでした。';
  } finally {
    referenceBusy = false;
  }
}
$('#reference-input').onchange = async (e) => {
  const files = [...e.target.files];
  if (files.length) await processReferences(files);
  e.target.value = '';
};
renderReferences();
function readPreferences() {
  return normalizePreferences({
    styles: [...document.querySelectorAll('input[name="style"]:checked')].map(
      (x) => x.value,
    ),
    parts: document.querySelector('input[name="parts"]:checked')?.value || '',
    partsDetail: $('#parts-detail').value,
    other: $('#consult-other').value,
  });
}
function setPreferences(raw) {
  const p = normalizePreferences(raw);
  for (const x of document.querySelectorAll('input[name="style"]'))
    x.checked = p.styles.includes(x.value);
  for (const x of document.querySelectorAll('input[name="parts"]'))
    x.checked = x.value === p.parts;
  $('#parts-detail').value = p.partsDetail;
  $('#consult-other').value = p.other;
  $('#parts-detail-wrap').hidden = p.parts !== 'metal';
}
for (const x of document.querySelectorAll('input[name="style"]'))
  x.addEventListener('change', () => {
    if (!x.checked) return;
    for (const other of document.querySelectorAll('input[name="style"]'))
      if (other !== x && (x.value === 'any' || other.value === 'any'))
        other.checked = false;
  });
for (const x of document.querySelectorAll('input[name="parts"]'))
  x.addEventListener('change', () => {
    $('#parts-detail-wrap').hidden = x.value !== 'metal';
  });
function collect() {
  return createConsultation(
    state,
    materials,
    $('#consult-budget').value,
    $('#consult-message').value,
    readPreferences(),
  );
}
function refreshConsult() {
  const data = collect();
  $('#consult-image').src = makeImage().toDataURL('image/png');
  const counts = $('#consult-counts'),
    order = $('#consult-order');
  counts.replaceChildren();
  order.replaceChildren();
  for (const x of data.counts) {
    const li = document.createElement('li');
    li.textContent = `${x.name} ${x.sizeMm}mm × ${x.quantity}`;
    counts.append(li);
  }
  for (const x of data.order) {
    const li = document.createElement('li');
    li.textContent = `${x.name} ${x.sizeMm}mm`;
    order.append(li);
  }
  $('#consult-measure').textContent =
    `手首周り ${data.wristMm}mm ／ 推定内周 ${data.estimatedInnerMm}mm（理論値）`;
}
$('#consult-open').onclick = () => {
  refreshConsult();
  $('#consult').hidden = false;
  $('#consult').scrollIntoView({ behavior: 'smooth' });
  $('#consult-title').focus({ preventScroll: true });
};
$('#consult-close').onclick = () => {
  $('#consult').hidden = true;
  $('#consult-open').focus();
};
$('#consult-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(consultationText(collect()));
    $('#consult-status').textContent =
      '内容をコピーしました。画像は別に保存してください。';
  } catch {
    $('#consult-status').textContent =
      'コピーできませんでした。相談データを保存してください。';
  }
};
$('#consult-save').onclick = () => {
  if (referenceBusy) {
    $('#reference-status').textContent =
      '画像の処理が終わるまでお待ちください。';
    return;
  }
  const value = {
    kind: 'almea-consultation',
    formatVersion: 1,
    consultation: collect(),
    referenceImages: references,
    imagePng: makeImage().toDataURL('image/png'),
  };
  download(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    'almea-consultation.json',
  );
  $('#consult-status').textContent =
    '画像入りの相談データを保存しました。外部への送信はしていません。';
};
renderPalette();
render();
