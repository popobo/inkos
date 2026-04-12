import { describe, expect, it } from "vitest";
import { chunkChapters } from "../utils/chapter-chunker.js";

describe("chunkChapters", () => {
  it("returns empty array for empty chapters", () => {
    expect(chunkChapters([], 10_000)).toEqual([]);
  });

  it("throws when maxCharsPerChunk is below 1", () => {
    expect(() => chunkChapters([{ title: "A", content: "b" }], 0)).toThrow("maxCharsPerChunk");
  });

  it("packs multiple short chapters into one chunk when they fit", () => {
    const chapters = [
      { title: "1", content: "a".repeat(100) },
      { title: "2", content: "b".repeat(100) },
      { title: "3", content: "c".repeat(100) },
    ];
    const chunks = chunkChapters(chapters, 500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.startChapter).toBe(1);
    expect(chunks[0]!.endChapter).toBe(3);
    expect(chunks[0]!.chapters).toHaveLength(3);
  });

  it("starts a new chunk when the next chapter would exceed the budget", () => {
    const chapters = [
      { title: "1", content: "a".repeat(200) },
      { title: "2", content: "b".repeat(200) },
    ];
    const chunks = chunkChapters(chapters, 250);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.startChapter).toBe(1);
    expect(chunks[0]!.endChapter).toBe(1);
    expect(chunks[1]!.startChapter).toBe(2);
    expect(chunks[1]!.endChapter).toBe(2);
  });

  it("isolates a single oversized chapter in its own chunk", () => {
    const chapters = [
      { title: "short", content: "x" },
      { title: "long", content: "y".repeat(500) },
      { title: "after", content: "z" },
    ];
    const chunks = chunkChapters(chapters, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.chapters).toEqual([chapters[0]]);
    expect(chunks[1]!.chapters).toEqual([chapters[1]]);
    expect(chunks[2]!.chapters).toEqual([chapters[2]]);
  });

  it("preserves global chapter indices via startChapter and endChapter", () => {
    const chapters = Array.from({ length: 5 }, (_, i) => ({
      title: `T${i + 1}`,
      content: "p".repeat(40),
    }));
    const chunks = chunkChapters(chapters, 120);
    let expectedStart = 1;
    for (const ch of chunks) {
      expect(ch.startChapter).toBe(expectedStart);
      expect(ch.endChapter).toBe(expectedStart + ch.chapters.length - 1);
      expectedStart = ch.endChapter + 1;
    }
    expect(expectedStart).toBe(6);
  });
});
