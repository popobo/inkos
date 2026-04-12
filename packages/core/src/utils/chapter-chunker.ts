/**
 * Group consecutive import chapters into chunks that fit a character budget
 * for Map-Reduce foundation extraction (whole-chapter boundaries only).
 */

export interface ChapterChunk {
  /** 1-based index of first chapter in the source array */
  readonly startChapter: number;
  /** 1-based index of last chapter in the source array (inclusive) */
  readonly endChapter: number;
  readonly chapters: ReadonlyArray<{ readonly title: string; readonly content: string }>;
  /** Sum of title + content lengths for chapters in this chunk plus inter-chapter overhead */
  readonly totalChars: number;
}

const INTER_CHAPTER_OVERHEAD = 24;

function chapterCharEstimate(ch: { readonly title: string; readonly content: string }): number {
  return ch.title.length + ch.content.length;
}

/**
 * Greedy packing: fill each chunk up to maxCharsPerChunk without splitting a chapter.
 * A chapter longer than maxCharsPerChunk occupies its own chunk alone.
 */
export function chunkChapters(
  chapters: ReadonlyArray<{ readonly title: string; readonly content: string }>,
  maxCharsPerChunk: number,
): ChapterChunk[] {
  if (chapters.length === 0) {
    return [];
  }
  if (maxCharsPerChunk < 1) {
    throw new Error("maxCharsPerChunk must be at least 1");
  }

  const out: ChapterChunk[] = [];
  let index = 0;

  while (index < chapters.length) {
    const first = chapters[index]!;
    const firstEst = chapterCharEstimate(first);

    if (firstEst > maxCharsPerChunk) {
      out.push({
        startChapter: index + 1,
        endChapter: index + 1,
        chapters: [first],
        totalChars: firstEst,
      });
      index += 1;
      continue;
    }

    const batch: Array<{ readonly title: string; readonly content: string }> = [first];
    let batchChars = firstEst;
    const startChapter = index + 1;
    index += 1;

    while (index < chapters.length) {
      const next = chapters[index]!;
      const nextEst = chapterCharEstimate(next);
      if (nextEst > maxCharsPerChunk) {
        break;
      }
      const withSep = batchChars + INTER_CHAPTER_OVERHEAD + nextEst;
      if (withSep > maxCharsPerChunk) {
        break;
      }
      batch.push(next);
      batchChars = withSep;
      index += 1;
    }

    out.push({
      startChapter,
      endChapter: startChapter + batch.length - 1,
      chapters: batch,
      totalChars: batchChars,
    });
  }

  return out;
}
