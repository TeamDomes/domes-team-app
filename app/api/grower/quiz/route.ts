import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const wrongLocations = ['Denver, CO', 'Portland, ME', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Chicago, IL', 'Boston, MA', 'Trenton, NJ']
const wrongProducts = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing', 'THC patches only']
const wrongKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Fast food partnerships', 'Celebrity endorsements only', 'Wholesale only']

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    // Get today's featured brand
    const { data: featured } = await supabase
      .from('brands')
      .select('*')
      .eq('featured_week', todayStr)
      .limit(1)

    if (!featured || featured.length === 0) {
      return NextResponse.json({ brand: null, quiz: [] })
    }

    const brand = featured[0]

    // Get existing brand quiz questions
    const { data: existing } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('category', 'brand')

    // Check if questions match the current brand
    const matchesBrand = existing && existing.length > 0 && existing.length <= 5 &&
      existing.every((q: any) => q.question?.includes(brand.name))

    if (matchesBrand) {
      return NextResponse.json({ brand, quiz: existing })
    }

    // Delete ALL old brand questions (service role key bypasses RLS)
    await supabase.from('trivia_questions').delete().eq('category', 'brand')

    // Generate new questions for this brand
    const newQuestions: any[] = []

    if (brand.location) {
      const shuffled = wrongLocations.filter(l => l !== brand.location).sort(() => Math.random() - 0.5)
      newQuestions.push({
        question: 'Where is ' + brand.name + ' located?',
        option_a: brand.location,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: brand.name + ' is based in ' + brand.location + '.',
        category: 'brand'
      })
    }

    if (brand.known_for) {
      const shuffled = wrongKnown.sort(() => Math.random() - 0.5)
      newQuestions.push({
        question: 'What is ' + brand.name + ' best known for?',
        option_a: brand.known_for,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: brand.name + ' is known for: ' + brand.known_for,
        category: 'brand'
      })
    }

    if (brand.product_types) {
      const shuffled = wrongProducts.sort(() => Math.random() - 0.5)
      newQuestions.push({
        question: 'What type of products does ' + brand.name + ' make?',
        option_a: brand.product_types,
        option_b: shuffled[0],
        option_c: shuffled[1],
        correct_answer: 'A',
        explanation: brand.name + ' produces: ' + brand.product_types,
        category: 'brand'
      })
    }

    if (newQuestions.length > 0) {
      await supabase.from('trivia_questions').insert(newQuestions)
    }

    // Fetch the freshly inserted questions
    const { data: freshQuiz } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('category', 'brand')

    return NextResponse.json({ brand, quiz: freshQuiz || [] })
  } catch (err: any) {
    console.error('Quiz API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
