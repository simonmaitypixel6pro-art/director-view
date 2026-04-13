import { NextResponse } from "next/server"

export async function GET() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!googleClientId) {
    return NextResponse.json(
      { error: "Google Client ID not configured" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    clientId: googleClientId,
  })
}
