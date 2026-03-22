/**
 * Computes column assignments for overlapping time blocks.
 * Uses greedy interval scheduling: sorted by start_time, each item
 * is assigned to the first column whose last item has already ended.
 *
 * Returns items with { colIdx, colCount } so renderers can position blocks
 * side-by-side instead of stacking them.
 */
export interface LayoutBlock {
  colIdx: number
  colCount: number
}

function norm(t: string) {
  // "09:00:00" → "09:00"  |  "09:00" → "09:00"
  return t.slice(0, 5)
}

export function computeLayout<T extends { start_time: string; end_time: string }>(
  items: T[]
): Array<LayoutBlock & { item: T }> {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) =>
    norm(a.start_time).localeCompare(norm(b.start_time))
  )

  // Group into clusters: each cluster is a maximal set of transitively-overlapping events
  const clusters: T[][] = []

  for (const item of sorted) {
    let added = false
    for (const cluster of clusters) {
      const overlaps = cluster.some(
        c =>
          norm(item.start_time) < norm(c.end_time) &&
          norm(item.end_time) > norm(c.start_time)
      )
      if (overlaps) {
        cluster.push(item)
        added = true
        break
      }
    }
    if (!added) clusters.push([item])
  }

  const result: Array<LayoutBlock & { item: T }> = []

  for (const cluster of clusters) {
    const tracks: string[] = [] // current end_time for each track
    const assignments: { item: T; colIdx: number }[] = []

    for (const item of cluster) {
      let placed = false
      for (let i = 0; i < tracks.length; i++) {
        if (norm(item.start_time) >= tracks[i]) {
          tracks[i] = norm(item.end_time)
          assignments.push({ item, colIdx: i })
          placed = true
          break
        }
      }
      if (!placed) {
        assignments.push({ item, colIdx: tracks.length })
        tracks.push(norm(item.end_time))
      }
    }

    const colCount = tracks.length
    for (const { item, colIdx } of assignments) {
      result.push({ item, colIdx, colCount })
    }
  }

  return result
}
