import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const wrongLocations = ['Denver, CO', 'Portland, ME', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Chicago, IL', 'Boston, MA', 'Trenton, NJ']
const wrongProducts = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing', 'THC patches only']
const wrongKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Fast food partnerships', 'Celebrity endorsements only', 'Wholesale only']

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brand')

    let brand: any = null

    if (brandId) {
      // Load the specific brand being viewed
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()
      brand = data
    } else {
      // Fallback: most recently featured brand
      const { data: recent } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .not('featured_week', 'is', null)
        .order('featured_week', { ascending: false })
        .limit(1)
      if (recent && recent.length > 0) brand = recent[0]
    }

    if (!brand) {
      return NextResponse.json({ brand: null, quiz: [] })
    }

    // Get existing quiz questions that match THIS brand
    const { data: existing } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('category', 'brand')

    const matchesBrand = existing && existing.length > 0 && existing.length <= 5 &&
      existing.every((q: any) => q.question?.includes(brand.name))

    if (matchesBrand) {
      return NextResponse.json({ brand, quiz: existing })
    }

    // Delete old brand questions and generate new ones for this brand
    await supabase.from('trivia_questions').delete().eq('category', 'brand')

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
      const shuffled = [...wrongKnown].sort(() => Math.random() - 0.5)
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
      const shuffled = [...wrongProducts].sort(() => Math.random() - 0.5)
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
