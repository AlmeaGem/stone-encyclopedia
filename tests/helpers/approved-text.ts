import {
  approvedManuscript,
  manuscriptItems,
} from '../../src/lib/approved-manuscripts';
/** First complete paragraph of the approved section, with presentation syntax removed. */
export function approvedText(id: string, heading: string) {
  const section = approvedManuscript(id).sections.find((s) =>
    s.heading.startsWith(heading),
  );
  if (!section) throw new Error(`${id}: missing ${heading}`);
  return manuscriptItems(section)[0].replace(/\*\*/g, '');
}
