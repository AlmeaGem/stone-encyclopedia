import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const additions = [
  ['Aquamarine', '穏やかな愛情と、時間をかけて育む信頼'],
  ['Aventurine', '心を休ませ、自分らしい穏やかさを取り戻す'],
  ['Amazonite', '希望を呼び覚ます「ホープストーン」'],
  ['Amethyst', '心を静め、冷静な判断へ導く'],
  ['Aragonite', '自然体の魅力で、人を惹きつける'],
  ['Amber', '太古の太陽を宿す、黄金の守護石'],
  ['Angelite', '天使の優しさを宿す、神秘の石'],
  ['Onyx', '邪気を退ける、漆黒の守護石'],
  ['OrangeMoonstone', '月の優しさと、太陽のような明るさを宿す石'],
  ['GardenQuartz', '水晶の中に眠る、神秘の小さな世界'],
  ['Garnet', '運命を動かす、情熱と再生の石'],
  ['Carnelian', '眠っていた情熱を目覚めさせる、炎の石'],
  ['Chalcedony', '人と人の心を結ぶ、優しい絆の石'],
  ['CrystalQuartz', 'あらゆるエネルギーを清める、光の守護石'],
  ['Chrysocolla', '地球のエネルギーを宿す、大地の守護石'],
  ['Kunzite', '真実の愛へ導く、優しい光の石'],
] as const;

describe('published editorial source', () => {
  it.each(additions)(
    '%s supplementary manuscript remains connected to the detail template',
    (name, heading) => {
      const component = `${name}Supplement`;
      const source = readFileSync(`src/components/${component}.astro`, 'utf8');
      const template = readFileSync('src/pages/stones/[slug].astro', 'utf8');
      expect(source).toContain(heading);
      expect(template).toContain(`import ${component} `);
      expect(template).toContain(`<${component} part="meaning"`);
      expect(template).toContain(`<${component} part="pairings"`);
    },
  );
});
