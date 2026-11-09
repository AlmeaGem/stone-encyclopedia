import { describe, expect, it } from 'vitest';
import { recommend } from '../prototype/best-seven/engine.js';
import review from '../prototype/best-seven/review-data.json';
import wishes from '../prototype/diagnosis-v3/draft-data.json';
import { approvedManuscript } from '../src/lib/approved-manuscripts';

describe('isolated BEST 7 experiment', () => {
  it('keeps all 47 review records distinct and only 25 conservative candidates eligible', () => {
    expect(review.tags).toHaveLength(47);
    expect(new Set(review.tags.map((t) => t.stoneId)).size).toBe(20);
    expect(review.tags.filter((t) => t.decision === '採用候補')).toHaveLength(
      25,
    );
    expect(
      review.tags.filter((t) => t.reviewState === '暫定候補・未承認'),
    ).toHaveLength(43);
    expect(review.tags.filter((t) => t.decision === '保留')).toHaveLength(3);
    expect(review.tags.filter((t) => t.decision === '除外')).toHaveLength(1);
    expect(review.tags.filter((t) => t.decision === '修正候補')).toHaveLength(
      18,
    );
  });
  it('traces every trial quote to its own approved manuscript', () => {
    for (const tag of review.tags) {
      const sections = approvedManuscript(tag.stoneId).sections;
      expect(
        sections.some((section) =>
          section.paragraphs.some((text) => text.includes(tag.sourceText)),
        ),
        tag.stoneId,
      ).toBe(true);
    }
  });
  it('uses exact wishes only and never fills fewer than seven', () => {
    const ideal = recommend({ primary: 'love.meet.ideal' }, review);
    expect(ideal.count).toBe(6);
    expect(ideal.results).toHaveLength(6);
    expect(recommend({ primary: 'love.meet.good_match' }, review).count).toBe(
      0,
    );
    expect(recommend({ primary: 'love.reunion.ex' }, review).count).toBe(0);
    expect(recommend({ primary: 'love.meet.approach' }, review).count).toBe(0);
    expect(recommend({ primary: 'relationships.repair' }, review).count).toBe(
      0,
    );
    expect(recommend({ primary: 'finance.income' }, review).count).toBe(0);
  });
  it('never double counts a stone bundle across primary and secondary or aliases', () => {
    const result = recommend(
      {
        primary: 'love.person.progress',
        secondary: ['love.attraction.charm', 'love.attraction.charm'],
      },
      review,
    );
    const rose = result.results.find((x) => x.stoneId === 's107');
    expect(rose?.score).toBe(80);
    expect(rose?.matchedWishes).toEqual(['love.person.progress']);
    expect(rose?.sources).toHaveLength(1);
    expect(result.secondary).toEqual(['love.attraction.charm']);
    const tampered = {
      ...review,
      tags: review.tags.map((t) => ({ ...t, groupId: 'unresolved' })),
    };
    expect(recommend({ primary: 'love.meet.ideal' }, tampered).count).toBe(0);
  });
  it('does not assume unknown preferences or avoidance are safe', () => {
    const noAttrs = recommend(
      {
        primary: 'love.meet.ideal',
        colors: ['ピンク'],
        mood: '透明感',
        form: 'スフィア',
      },
      review,
    );
    expect(noAttrs.results.every((r) => r.score === 100)).toBe(true);
    expect(noAttrs.gaps.join(' ')).toContain('採点していません');
    const avoid = recommend(
      { primary: 'love.meet.ideal', avoid: ['濃い色'] },
      review,
    );
    expect(avoid.count).toBe(0);
    expect(avoid.gaps.join(' ')).toContain(
      '確認できない石も候補から外しました',
    );
  });
  it('validates supported optional axes only with complete verified provenance', () => {
    const one = review.tags.find(
      (t) => t.stoneId === 's091' && t.detailId === 'love.meet.ideal',
    )!;
    const data = {
      ...review,
      tags: [one],
      verifiedAttributes: {
        s091: {
          colors: {
            verified: true,
            source: 'synthetic test only',
            values: ['ピンク'],
          },
          moods: {
            verified: true,
            source: 'synthetic test only',
            values: ['透明感'],
          },
          forms: {
            verified: true,
            source: 'synthetic test only',
            values: ['スフィア'],
          },
          avoid: {
            verified: true,
            source: 'synthetic test only',
            values: ['濃い色'],
          },
        },
      },
    };
    expect(
      recommend({ primary: 'love.meet.ideal', colors: ['ピンク'] }, data)
        .results[0].score,
    ).toBe(100);
    expect(
      recommend({ primary: 'love.meet.ideal', colors: ['青'] }, data).results[0]
        .score,
    ).toBe(85.7);
    expect(
      recommend(
        {
          primary: 'love.meet.ideal',
          colors: ['ピンク'],
          mood: '透明感',
          form: 'スフィア',
        },
        data,
      ).results[0].score,
    ).toBe(100);
    expect(
      recommend({ primary: 'love.meet.ideal', avoid: ['濃い色'] }, data).count,
    ).toBe(0);
    expect(
      recommend({ primary: 'love.meet.ideal', avoid: ['淡い色'] }, data).count,
    ).toBe(1);
  });
  it('repeats all 24 cases byte-for-byte deterministically', () => {
    expect(wishes.cases).toHaveLength(24);
    for (const c of wishes.cases) {
      const x = recommend({ primary: c.id }, review);
      expect(recommend({ primary: c.id }, review)).toEqual(x);
      expect(new Set(x.results.map((r) => r.stoneId)).size).toBe(
        x.results.length,
      );
      expect(x.results.length).toBe(Math.min(7, x.count));
    }
  });
});
