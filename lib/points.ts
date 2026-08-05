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
  // BINGO squares - different values per type
  BINGO_ON_TIME: 10,
  BINGO_DRAWER: 25,
  BINGO_GOOGLE_REVIEW: 100,
  BINGO_SQUARE: 15,       // all other squares
  BINGO_WIN: 1500,         // winning BINGO
}

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

  await supabase.from('points_log').insert({
    team_member_id: teamMemberId,
    points,
    activity,
    source_id: sourceId || null,
  })
}
