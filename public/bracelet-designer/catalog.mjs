// Separate reviewed records from the existing encyclopedia. Empty until a human
// verifies each product size, image rights, and identity against source records.
export const reviewedStoneRecords = [];

export function reviewedCatalog(records) {
  return records.flatMap((record) => {
    if (
      !/^s\d{3}$/.test(record.stoneId || '') ||
      record.reviewStatus !== 'approved' ||
      !record.name ||
      !record.slug ||
      !Array.isArray(record.sizes)
    )
      return [];
    const sizes = record.sizes
      .filter(
        (item) =>
          Number.isFinite(item.mm) &&
          item.mm > 0 &&
          item.status === 'verified' &&
          /^https:\/\//.test(item.sourceUrl || '') &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt || ''),
      )
      .map((item) => item.mm);
    if (!sizes.length) return [];
    // Images remain optional: valid metadata is not proof of a license or review.
    const image =
      record.image &&
      record.image.status === 'approved' &&
      record.image.rightsStatus === 'approved' &&
      /^\/assets\/[a-zA-Z0-9._/-]+\.(?:png|webp|jpg)$/.test(
        record.image.localPath || '',
      ) &&
      !record.image.localPath.includes('..')
        ? record.image
        : null;
    return [
      {
        id: record.stoneId,
        stoneId: record.stoneId,
        slug: record.slug,
        name: record.name,
        color: record.color,
        colors:
          Array.isArray(record.colors) && record.colors.length === 3
            ? record.colors
            : ['#faf8f5', '#d7ccc8', '#968985'],
        sizes: [...new Set(sizes)].sort((a, b) => a - b),
        image,
        evidence: record.sizes,
        // Catalog availability is distinct from general market observations.
        ownInventory: record.ownInventory ?? {
          status: 'unconfirmed',
          sizes: [],
        },
        compatibilityId: record.compatibilityId ?? record.stoneId,
        compatibility: null,
      },
    ];
  });
}
