import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Place correct answer in a random position (A, B, or C)
function randomizeOptions(correct: string, wrong1: string, wrong2: string) {
  const options = [
    { text: correct, isCorrect: true },
    { text: wrong1, isCorrect: false },
    { text: wrong2, isCorrect: false },
  ]
  const shuffled = shuffle(options)
  const correctLetter = shuffled.findIndex(o => o.isCorrect) === 0 ? 'A' : shuffled.findIndex(o => o.isCorrect) === 1 ? 'B' : 'C'
  return {
    option_a: shuffled[0].text,
    option_b: shuffled[1].text,
    option_c: shuffled[2].text,
    correct_answer: correctLetter,
  }
}

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get('brand')

    if (!brandId) {
      return NextResponse.json({ brand: null, quiz: [] })
    }

    // Load the specific brand
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (!brand) {
      return NextResponse.json({ brand: null, quiz: [] })
    }

    // Check if we already have quiz questions for THIS brand
    const { data: existing } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('category', 'brand')

    const matchesBrand = existing && existing.length > 0 && existing.length <= 6 &&
      existing.every((q: any) => q.question?.includes(brand.name))

    if (matchesBrand) {
      return NextResponse.json({ brand, quiz: existing })
    }

    // Delete old brand questions
    await supabase.from('trivia_questions').delete().eq('category', 'brand')

    // Load other brands for wrong-answer material
    const { data: otherBrands } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .neq('id', brandId)

    const others = otherBrands || []
    const otherTalkingPoints = others.flatMap(b => (b.talking_points || []).map((tp: string) => tp))
    const otherLocations = others.map(b => b.location).filter(Boolean)
    const otherKnownFor = others.map(b => b.known_for).filter(Boolean)
    const otherProductTypes = others.map(b => b.product_types).filter(Boolean)
    const otherDescriptions = others.map(b => b.description).filter(Boolean)

    const fallbackLocations = ['Denver, CO', 'Portland, ME', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Chicago, IL']
    const fallbackKnown = ['Budget-priced accessories', 'Cannabis-infused skincare', 'Celebrity endorsements', 'Wholesale distribution only']
    const fallbackProducts = ['Rolling papers only', 'CBD pet treats only', 'Cannabis-infused candles', 'Hemp clothing']

    const newQuestions: any[] = []

    // 1. Talking points questions — "Which is true about [brand]?"
    if (brand.talking_points && brand.talking_points.length > 0) {
      const tps = shuffle(brand.talking_points as string[])
      const wrongPool = otherTalkingPoints.length >= 2
        ? shuffle(otherTalkingPoints)
        : ['They only sell products online', 'They are a subsidiary of a major tobacco company', 'They were founded in 2024', 'They only operate in California', 'They exclusively make CBD products']

      // Generate up to 3 talking-point questions
      for (let i = 0; i < Math.min(tps.length, 3); i++) {
        const wrongAnswers = wrongPool.filter(w => w !== tps[i])
        if (wrongAnswers.length < 2) continue
        const opts = randomizeOptions(tps[i], wrongAnswers[i % wrongAnswers.length], wrongAnswers[(i + 1) % wrongAnswers.length])
        newQuestions.push({
          question: 'Which of the following is true about ' + brand.name + '?',
          ...opts,
          explanation: 'This is one of ' + brand.name + "'s key talking points.",
          category: 'brand'
        })
      }
    }

    // 2. Location question
    if (brand.location) {
      const wrongPool = otherLocations.length >= 2
        ? shuffle(otherLocations.filter(l => l !== brand.location))
        : shuffle(fallbackLocations.filter(l => l !== brand.location))
      if (wrongPool.length >= 2) {
        const opts = randomizeOptions(brand.location, wrongPool[0], wrongPool[1])
        newQuestions.push({
          question: 'Where is ' + brand.name + ' located?',
          ...opts,
          explanation: brand.name + ' is based in ' + brand.location + '.',
          category: 'brand'
        })
      }
    }

    // 3. Known-for question
    if (brand.known_for) {
      const wrongPool = otherKnownFor.length >= 2
        ? shuffle(otherKnownFor.filter(k => k !== brand.known_for))
        : shuffle(fallbackKnown)
      if (wrongPool.length >= 2) {
        const opts = randomizeOptions(brand.known_for, wrongPool[0], wrongPool[1])
        newQuestions.push({
          question: 'What is ' + brand.name + ' best known for?',
          ...opts,
          explanation: brand.name + ' is known for: ' + brand.known_for,
          category: 'brand'
        })
      }
    }

    // 4. Product types question
    if (brand.product_types) {
      const wrongPool = otherProductTypes.length >= 2
        ? shuffle(otherProductTypes.filter(p => p !== brand.product_types))
        : shuffle(fallbackProducts)
      if (wrongPool.length >= 2) {
        const opts = randomizeOptions(brand.product_types, wrongPool[0], wrongPool[1])
        newQuestions.push({
          question: 'What type of products does ' + brand.name + ' make?',
          ...opts,
          explanation: brand.name + ' produces: ' + brand.product_types,
          category: 'brand'
        })
      }
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
