import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* POST — invite a user by email */
export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Check if user already exists in Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const alreadyExists = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (alreadyExists) {
      return NextResponse.json({ status: 'already_exists', message: 'User already has an account' })
    }

    // Create the user with a temporary password
    const tempPassword = 'Domes2026!'
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // auto-confirm so they can log in immediately
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Link to team table — update auth_user_id
    if (data.user) {
      await supabaseAdmin
        .from('team')
        .update({ auth_user_id: data.user.id })
        .eq('email', email.toLowerCase())
    }

    return NextResponse.json({
      status: 'created',
      message: `Account created for ${email}`,
      userId: data.user?.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* GET — list all team members with auth status */
export async function GET() {
  try {
    const { data: team } = await supabaseAdmin.from('team').select('id, full_name, email, role, type, auth_user_id')
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const authEmails = new Set(
      (authData?.users || []).map((u: any) => u.email?.toLowerCase())
    )

    const members = (team || []).map((t: any) => ({
      id: t.id,
      name: t.full_name,
      email: t.email,
      role: t.role,
      type: t.type,
      hasAuth: authEmails.has(t.email?.toLowerCase()),
    }))

    return NextResponse.json({ members })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
