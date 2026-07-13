import { NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/lib/supabase/client"
import { sendWaitlistConfirmation } from "@/lib/email"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  locale: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, locale } = schema.parse(body)

    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      )
    }

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email, locale })

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      )
    }

    await sendWaitlistConfirmation(email, locale)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      )
    }
    console.error("Waitlist error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
