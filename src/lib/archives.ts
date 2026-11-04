import moonstone from '../content/archives/moonstone.json';
import egyptianAmulets from '../content/archives/egyptian-amulets.json';
import themes from '../content/story-themes.json';
import { stones } from './content';
import { validateArchiveCatalog } from './archive-schema';

/** Only free articles are included in this public catalog. */
export const archives = validateArchiveCatalog(
  [moonstone, egyptianAmulets],
  stones.map((stone) => stone.id),
  themes.map((theme) => theme.id),
);
