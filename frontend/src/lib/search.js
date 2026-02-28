import fuzzysort from "fuzzysort";

const DEFAULT_OPTIONS = {
  threshold: -10000,
  limit: 50,
};

export function searchWithHighlights(query, items, key) {
  if (!query?.trim()) {
    return items.map((item) => ({ item, highlighted: null }));
  }

  const results = fuzzysort.go(query, items, {
    ...DEFAULT_OPTIONS,
    key,
  });

  return results.map((result) => ({
    item: result.obj,
    highlighted: result[0]?.highlight("<mark>", "</mark>") ?? null,
  }));
}
