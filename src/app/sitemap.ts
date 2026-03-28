import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://heolab.dev";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/games/minesweeper`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/2048`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/sudoku`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/memory-match`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/snake`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/tetris`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/flappy`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/games/runner`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
