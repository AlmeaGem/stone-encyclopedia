/** Build-time only: approved Markdown is authoritative; never shipped as records. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import rawStones from '../content/stones.json' with { type: 'json' };

export type ManuscriptSection = {
  heading: string;
  paragraphs: string[];
  kind: 'prose' | 'wishes' | 'pairings';
  subordinate: boolean;
};
export type ApprovedManuscript = {
  id: string;
  catchphrase: string;
  sections: ManuscriptSection[];
};
const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const manuscripts = new Map<string, ApprovedManuscript>();
for (let batch = 1; batch <= 11; batch++) {
  const base = join(
    process.cwd(),
    'editorial/manuscripts/approved-chatgpt',
    `batch-${String(batch).padStart(2, '0')}`,
  );
  const source = readFileSync(join(base, 'MANUSCRIPTS.md'));
  const text = source.toString('utf8');
  const headings = [...text.matchAll(/^## (s\d{3})｜([^\r\n]+)\r?$/gm)];
  const footer = [...text.matchAll(/^## (?!s\d{3}｜)[^\r\n]+$/gm)].find(
    (match) => match.index! > headings.at(-1)!.index!,
  );
  for (const [index, match] of headings.entries()) {
    const id = match[1];
    const stone = rawStones.find((s) => s.id === id);
    const record = JSON.parse(readFileSync(join(base, `${id}.json`), 'utf8'));
    const section = text.slice(
      match.index!,
      headings[index + 1]?.index ?? footer?.index ?? text.length,
    );
    const bytes = Buffer.from(section);
    if (
      !stone ||
      manuscripts.has(id) ||
      record.catalogName !== stone.name ||
      record.slug !== stone.slug ||
      record.sourceHeadingName !== match[2] ||
      record.sourceFileSha256 !== hash(source) ||
      record.sectionSha256 !== hash(bytes) ||
      record.sectionMarkdown !== section ||
      !source
        .subarray(record.sourceByteStart, record.sourceByteEndExclusive)
        .equals(bytes)
    )
      throw new Error(`${id}: approved source identity or bytes changed`);
    const parts = [...section.matchAll(/^### (.+)\r?$/gm)];
    const opening = section.slice(0, parts[0]?.index);
    const catchphrase = /^\*\*(.+)\*\*\r?$/m.exec(opening)?.[1];
    if (!catchphrase || parts.length < 5)
      throw new Error(`${id}: incomplete manuscript`);
    const sections = parts.map((part, n): ManuscriptSection => {
      const body = section
        .slice(part.index! + part[0].length, parts[n + 1]?.index)
        .replace(/\n---\s*$/, '')
        .trim();
      if (/Codex|編集メモ/.test(body))
        throw new Error(`${id}: editorial notes in body`);
      return {
        heading: part[1],
        paragraphs: body.split(/\r?\n\s*\r?\n/),
        kind: part[1].startsWith('こんな願い')
          ? 'wishes'
          : part[1].startsWith('相性のよい石')
            ? 'pairings'
            : 'prose',
        subordinate: /^(恋愛の願い|金運の願い)/.test(part[1]),
      };
    });
    manuscripts.set(id, { id, catchphrase, sections });
  }
}
if (manuscripts.size !== 210 || rawStones.some((s) => !manuscripts.has(s.id)))
  throw new Error('All 210 approved manuscripts are required');
export function approvedManuscript(id: string): ApprovedManuscript {
  const result = manuscripts.get(id);
  if (!result) throw new Error(`Missing approved manuscript: ${id}`);
  return result;
}
/** Only the approved bold spans are interpreted. Astro escapes all other text. */
export function inlineManuscript(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => ({
      text: part.startsWith('**') ? part.slice(2, -2) : part,
      strong: part.startsWith('**'),
    }));
}
export type PairingEntry = {
  name: string;
  separator: string;
  description: string;
  source: string;
  stoneId: string | null;
  slug: string | null;
  resolution: 'canonical' | 'alias' | 'ambiguous' | 'unmatched';
};

/** Split only at an item boundary: start of paragraph or a completed sentence. */
export function pairingEntries(section: ManuscriptSection): PairingEntry[] {
  if (section.kind !== 'pairings')
    throw new Error('Expected a pairing section');
  return section.paragraphs.flatMap((paragraph) => {
    const matches = [
      ...paragraph.matchAll(
        /(?:^|(?<=。)|(?<=\n))\s*(?:\*\*)?([^：:\n*]+?)(?:\*\*)?([：:])/gu,
      ),
    ];
    if (
      !matches.length ||
      matches[0].index !== 0 ||
      matches.length !== (paragraph.match(/[：:]/g) || []).length
    )
      throw new Error(`Unrecognized pairing format: ${section.heading}`);
    return matches.map((match, index) => {
      const source = paragraph.slice(match.index!, matches[index + 1]?.index);
      const name = match[1].trim();
      const description = source.slice(match[0].length);
      const canonical = rawStones.filter((stone) => stone.name === name);
      const aliases = rawStones.filter((stone) =>
        (stone.aliases as string[]).includes(name),
      );
      const candidates = canonical.length ? canonical : aliases;
      const stone = candidates.length === 1 ? candidates[0] : undefined;
      return {
        name,
        separator: match[2],
        description,
        source,
        stoneId: stone?.id ?? null,
        slug: stone?.slug ?? null,
        resolution:
          candidates.length > 1
            ? ('ambiguous' as const)
            : !stone
              ? ('unmatched' as const)
              : canonical.length
                ? ('canonical' as const)
                : ('alias' as const),
      };
    });
  });
}

export function manuscriptItems(section: ManuscriptSection) {
  if (section.kind === 'pairings')
    return pairingEntries(section).map((entry) => entry.source);
  return section.paragraphs.flatMap((paragraph) =>
    section.kind === 'wishes' ? paragraph.split('／') : [paragraph],
  );
}
