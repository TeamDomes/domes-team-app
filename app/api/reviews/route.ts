import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { detectStaffMentions, type StaffForMatch } from '@/lib/reviewMentions'

// Use service role key — webhook is called by Zapier (no user session / RLS won't work with anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Active team members (first_name + aliases) for mention detection
async function getTeam(): Promise<StaffForMatch[]> {
  const { data, error } = await supabase.from('team').select('id, first_name, full_name, aliases, is_active')
  if (error) throw new Error('team lookup failed: ' + error.message)
  return (data || []) as StaffForMatch[]
}

/* POST — receive a review from Zapier */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const customerName = body.customer_name || body.reviewer_name || body.author_name || 'Anonymous'
    const rating = parseInt(body.rating || body.star_rating || '5', 10)
    const reviewText = body.review_text || body.text || body.comment || ''
    const reviewDate = body.review_date || body.date || body.create_time || new Date().toISOString()
    const googleReviewId = body.google_review_id || body.review_id || null

    const team = await getTeam()
    const matches = detectStaffMentions(reviewText, team)
    const mentioned = matches.map(m => m.name)

    const { data: inserted, error } = await supabase.from('google_reviews').insert({
      google_review_id: googleReviewId,
      customer_name: customerName,
      rating,
      review_text: reviewText,
      review_date: reviewDate,
      mentioned_staff: mentioned,
      points_awarded: false,
    }).select('id').single()

    if (error) {
      // Duplicate review
      if (error.code === '23505') {
        return NextResponse.json({ status: 'duplicate', message: 'Review already exists' }, { status: 200 })
      }
      return NextResponse.json({ status: 'error', message: error.message }, { status: 400 })
    }

    // Award points + mark BINGO O square for mentioned staff (4+ star reviews)
    if (matches.length > 0 && rating >= 4) {
      let pointsWritten = false

      // Find active BINGO cycle
      const { data: activeCycle } = await supabase
        .from('bingo_cycles')
        .select('id')
        .eq('status', 'Active')
        .limit(1)

      for (const match of matches) {
        if (match.id) {
          // Award 250 points
          const { error: pointsError } = await supabase.from('points_log').insert({
            team_member_id: match.id,
            points: 250,
            activity: 'google_review_mention',
            source_id: customerName,
          })
          if (!pointsError) pointsWritten = true

          // Mark BINGO O square if cycle is active
          if (activeCycle && activeCycle.length > 0) {
            const cycleId = activeCycle[0].id
            const { data: sq } = await supabase
              .from('bingo_squares')
              .select('*')
              .eq('team_member_id', match.id)
              .eq('cycle_id', cycleId)
              .single()

            if (sq && !sq.square_o) {
              await supabase
                .from('bingo_squares')
                .update({ square_o: true })
                .eq('id', sq.id)

              // Check if BINGO is complete (all 5 squares)
              if (sq.square_b && sq.square_i && sq.square_n && sq.square_g) {
                // All other squares were already true + O is now true = BINGO!
                await supabase.from('points_log').insert({
                  team_member_id: match.id,
                  points: 1500,
                  activity: 'bingo_win',
                  source_id: `cycle_${cycleId}_review`,
                })
              }
            }
          }
        }
      }

      if (pointsWritten && inserted?.id) {
        await supabase.from('google_reviews').update({ points_awarded: true }).eq('id', inserted.id)
      }
    }

    return NextResponse.json({ status: 'ok', mentioned_staff: mentioned }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

/* GET — health check */
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'Domes Google Reviews webhook' })
}
