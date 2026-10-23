// Shared staff-name detection for Google reviews (webhook + Wall of Love).
// Rules: whole words only, case-insensitive, review_text only,
// active team members only, first_name + team.aliases. No fuzzy/substring matching.

export type StaffForMatch = {
  id: string
  first_name?: string | null
  full_name?: string | null
  aliases?: string[] | null
  is_active?: boolean | null
}

export type StaffMention = { id: string; name: string }

// Canonical tag stored in google_reviews.mentioned_staff.
// Stats pages compare against the first word of full_name, so store that.
export function canonicalName(t: StaffForMatch): string {
  return (t.full_name || '').trim().split(/\s+/)[0] || (t.first_name || '').trim()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsWholeWord(text: string, word: string): boolean {
  const w = word.trim()
  if (!w) return false
  // Not preceded/followed by a letter or digit (Unicode-aware). "Mari's" matches; "Marisa" doesn't.
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(w)}(?![\\p{L}\\p{N}])`, 'iu')
  return re.test(text)
}

export function detectStaffMentions(reviewText: string | null | undefined, team: StaffForMatch[]): StaffMention[] {
  if (!reviewText) return []
  const found: StaffMention[] = []
  for (const t of team) {
    if (t.is_active === false) continue
    const names = [t.first_name || canonicalName(t), ...(t.aliases || [])].filter((n): n is string => !!n && !!n.trim())
    if (names.some(n => containsWholeWord(reviewText, n))) {
      const name = canonicalName(t)
      if (name && !found.some(f => f.id === t.id)) found.push({ id: t.id, name })
    }
  }
  return found
}
