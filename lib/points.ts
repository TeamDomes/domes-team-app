import { supabase } from '@/lib/supabase'

export const POINTS = {
  TRIVIA_CORRECT: 30,
  TRIVIA_WRONG: 10,
  QUIZ_PERFECT: 75,
  QUIZ_PARTIAL: 30,
  APPRECIATION_GIVEN: 15,
  APPRECIATION_RECEIVED: 25,
  QUESTIONNAIRE_COMPLETE: 50,
  POST_CREATED: 15,
  COMMENT_POSTED: 10,
  GOOGLE_REVIEW_MENTION: 250,
  // BINGO squares - different values per type
  BINGO_ON_TIME: 10,
  BINGO_DRAWER: 25,
  BINGO_GOOGLE_REVIEW: 0,  // O square marked but no separate points — 250 comes from Wall of Love
  BINGO_SQUARE: 15,       // all other squares
  BINGO_WIN: 1500,         // winning BINGO
}

// Activities exempt from weekly cap (budtenders)
const CAP_EXEMPT = ['bingo_win', 'bingo_square', 'bingo_on_time', 'bingo_drawer', 'bingo_google_review', 'google_review_mention', 'points_adjustment']

// Weekly cap for budtender game points
const BUDTENDER_WEEKLY_CAP = 500

export async function awardPoints(
  teamMemberId: string,
  points: number,
  activity: string,
  sourceId?: string
) {
  // Prevent duplicate awards for same activity + source
  if (sourceId) {
    const { data: existing } = await supabase
      .from('points_log')
      .select('id')
      .eq('team_member_id', teamMemberId)
      .eq('activity', activity)
      .eq('source_id', sourceId)
      .limit(1)
    if (existing && existing.length > 0) return // Already awarded
  }

  // Check weekly cap for non-exempt activities
  if (!CAP_EXEMPT.includes(activity)) {
    // Get this member's role
    const { data: member } = await supabase
      .from('team')
      .select('role, type')
      .eq('id', teamMemberId)
      .single()

    // Only cap budtenders (FT/PT), not Leads/Admins
    if (member && (member.type === 'FT' || member.type === 'PT') && member.role !== 'Lead' && member.role !== 'Admin') {
      const weekStart = getWeekStart()
      const { data: weekPoints } = await supabase
        .from('points_log')
        .select('points, activity')
        .eq('team_member_id', teamMemberId)
        .gte('created_at', weekStart.toISOString())

      const cappedTotal = (weekPoints || [])
        .filter((p: any) => !CAP_EXEMPT.includes(p.activity))
        .reduce((sum: number, p: any) => sum + p.points, 0)

      if (cappedTotal >= BUDTENDER_WEEKLY_CAP) return // At cap
      // Reduce points if it would exceed cap
      const remaining = BUDTENDER_WEEKLY_CAP - cappedTotal
      if (points > remaining) points = remaining
    }
  }

  // Insert the points
  await supabase.from('points_log').insert({
    team_member_id: teamMemberId,
    points,
    activity,
    source_id: sourceId || null,
  })

  // Lead trickle-down: leads get 1/3 of budtender points
  if (activity !== 'lead_trickle' && activity !== 'points_adjustment') {
    const { data: member } = await supabase
      .from('team')
      .select('role')
      .eq('id', teamMemberId)
      .single()

    // Only trickle from non-lead/admin members
    if (member && member.role !== 'Lead' && member.role !== 'Admin') {
      const tricklePoints = Math.round(points / 3)
      if (tricklePoints > 0) {
        // Find all leads
        const { data: leads } = await supabase
          .from('team')
          .select('id')
          .eq('role', 'Lead')

        for (const lead of (leads || [])) {
          await supabase.from('points_log').insert({
            team_member_id: lead.id,
            points: tricklePoints,
            activity: 'lead_trickle',
            source_id: `${activity}_${teamMemberId}_${Date.now()}`,
          })
        }
      }
    }
  }
}

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = start
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}
