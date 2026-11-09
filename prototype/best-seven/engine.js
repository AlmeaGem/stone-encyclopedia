/** Isolated experiment only. No tag in this dataset is approved for publication. */
export function recommend(input, dataset) {
  if (
    !dataset ||
    typeof dataset.version !== 'string' ||
    !Array.isArray(dataset.tags)
  )
    throw new Error('試作データが不正です');
  const primary = input.primary;
  if (typeof primary !== 'string' || !primary)
    throw new Error('最優先の願いを選んでください');
  const secondary = [...new Set((input.secondary || []).filter(Boolean))]
    .filter((id) => id !== primary)
    .sort();
  if (secondary.length > 2) throw new Error('第2・第3の願いは2件までです');
  const allowed = dataset.tags.filter(
    (t) =>
      t.decision === '採用候補' &&
      t.grouping === 'trial_conservative_one_bundle_per_stone' &&
      t.groupId === t.excerptId &&
      t.bundleId === `trial-stone-bundle:${t.stoneId}` &&
      t.sourceText &&
      t.excerptId &&
      t.detailId,
  );
  const main = allowed.filter((t) => t.detailId === primary);
  const byStone = new Map();
  for (const t of main) if (!byStone.has(t.stoneId)) byStone.set(t.stoneId, t);
  const gaps = [
    '未承認の20石のみを対象とした試作で、210石の正式推薦ではありません。',
    '修正候補・保留・除外タグ、根拠グループ未確定のタグは採点していません。',
  ];
  const attrs = dataset.verifiedAttributes || {};
  const verified = (id, axis) => {
    const record = attrs[id]?.[axis];
    return (
      record?.verified === true &&
      typeof record.source === 'string' &&
      record.source.trim() &&
      Array.isArray(record.values)
    );
  };
  const avoids = [...new Set((input.avoid || []).filter(Boolean))];
  if (avoids.length) {
    for (const id of byStone.keys()) {
      if (
        !verified(id, 'avoid') ||
        attrs[id].avoid.values.some((x) => avoids.includes(x))
      )
        byStone.delete(id);
    }
    gaps.push(
      '避けたい特徴は安全側に扱い、確認できない石も候補から外しました。',
    );
  }
  const optionAxes = [
    [
      'colors',
      10,
      Array.isArray(input.colors)
        ? input.colors.filter((x) => x !== 'こだわらない')
        : [],
    ],
    ['moods', 10, input.mood ? [input.mood] : []],
    ['forms', 5, input.form ? [input.form] : []],
  ];
  const ids = [...byStone.keys()];
  const activeAxes = optionAxes.filter(([axis, , values]) => {
    if (!values.length) return false;
    if (!ids.length || !ids.every((id) => verified(id, axis))) {
      gaps.push(`${axis}：候補全体の根拠が不足するため採点していません。`);
      return false;
    }
    return true;
  });
  const denominator =
    60 +
    (secondary.length ? 15 : 0) +
    activeAxes.reduce((sum, [, weight]) => sum + weight, 0);
  const results = ids
    .map((id) => {
      const evidence = byStone.get(id);
      // All reviewed claims of one stone share one conservative bundle: no repeated
      // source/paraphrase can earn both main and secondary points in this trial.
      const used = new Set([evidence.bundleId]);
      let points = 60;
      const matched = [primary];
      const sources = [
        {
          groupId: evidence.groupId,
          bundleId: evidence.bundleId,
          excerptId: evidence.excerptId,
          locator: evidence.sourceLocator,
          text: evidence.sourceText,
        },
      ];
      const secondaryWeight = secondary.length ? 15 / secondary.length : 0;
      for (const wish of secondary) {
        const candidate = allowed.find(
          (t) =>
            t.stoneId === id && t.detailId === wish && !used.has(t.bundleId),
        );
        if (candidate) {
          points += secondaryWeight;
          used.add(candidate.bundleId);
          matched.push(wish);
          sources.push({
            groupId: candidate.groupId,
            bundleId: candidate.bundleId,
            excerptId: candidate.excerptId,
            locator: candidate.sourceLocator,
            text: candidate.sourceText,
          });
        }
      }
      for (const [axis, weight, values] of activeAxes)
        if (attrs[id][axis].values.some((x) => values.includes(x)))
          points += weight;
      return {
        stoneId: id,
        stoneName: evidence.stoneName,
        score: Math.round((points / denominator) * 1000) / 10,
        mainWish: primary,
        matchedWishes: matched,
        reason: evidence.reasonDraft,
        sources,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.stoneId < b.stoneId ? -1 : a.stoneId > b.stoneId ? 1 : 0),
    );
  if (secondary.length)
    gaps.push(
      '同じ石の原稿根拠は保守的に一つの束として扱うため、副願いへの重複加点は行いません。',
    );
  if (
    results.length > 1 &&
    results.every((item) => item.score === results[0].score)
  )
    gaps.push('候補は同点のため石ID順です。順位は優劣を示しません。');
  if (results.length < 7)
    gaps.push(
      `確認できる候補は${results.length}件です。7件を埋める追加候補・根拠が不足しています。`,
    );
  return {
    version: dataset.version,
    notice: dataset.notice,
    primary,
    secondary,
    count: results.length,
    results: results.slice(0, 7),
    gaps,
  };
}
