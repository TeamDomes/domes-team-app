import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Staff first names for auto-detection
async function getStaffNames(): Promise<string[]> {
  const { data } = await supabase.from('team').select('full_name')
  return (data || []).map((t: any) => t.full_name.split(' ')[0])
}

function detectStaff(text: string, staffNames: string[]): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  return staffNames.filter(name => name.length >= 3 && lower.includes(name.toLowerCase()))
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

    const staffNames = await getStaffNames()
    const mentioned = detectStaff(reviewText, staffNames)

    const { error } = await supabase.from('google_reviews').insert({
      google_review_id: googleReviewId,
      customer_name: customerName,
      rating,
      review_text: reviewText,
      review_date: reviewDate,
      mentioned_staff: mentioned,
      points_awarded: false,
    })

    if (error) {
      // Duplicate review
      if (error.code === '23505') {
        return NextResponse.json({ status: 'duplicate', message: 'Review already exists' }, { status: 200 })
      }
      return NextResponse.json({ status: 'error', message: error.message }, { status: 400 })
    }

    // Award points to mentioned staff (15 pts for 4+ star reviews)
    if (mentioned.length > 0 && rating >= 4) {
      const { data: teamData } = await supabase.from('team').select('id, full_name')
      for (const name of mentioned) {
        const match = (teamData || []).find((t: any) =>
          t.full_name.split(' ')[0].toLowerCase() === name.toLowerCase()
        )
        if (match) {
          await supabase.from('points_log').insert({
            team_member_id: match.id,
            points: 250,
            activity: 'google_review_mention',
            source_id: customerName,
          })
        }
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
