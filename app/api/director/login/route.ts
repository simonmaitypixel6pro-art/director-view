import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error("[Director] CAPTCHA verification error:", error)
    return false
  }
}

function generateSessionToken(username: string, password: string): string {
  const credentials = `${username}:${password}`
  return Buffer.from(credentials, "utf-8").toString("base64")
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Director] Director login attempt started")
    const { username, password, token } = await request.json()

    if (!token) {
      console.log("[Director] Missing CAPTCHA token")
      return NextResponse.json({ success: false, message: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      console.log("[Director] CAPTCHA verification failed")
      return NextResponse.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    if (!username || !password) {
      console.log("[Director] Missing credentials")
      return NextResponse.json({ success: false, message: "Username and password are required" }, { status: 400 })
    }

    console.log("[Director] Querying database for director...")
    const result = await sql`
      SELECT id, username, role FROM admins WHERE username = ${username} AND password = ${password} AND role = 'director'
    `
    console.log("[Director] Database query result:", { found: result.length > 0 })

    if (result.length > 0) {
      const director = result[0] as { id: number; username: string; role: string }
      console.log("[Director] Director found")

      try {
        await sql`
          INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
          VALUES ('director', ${director.id}, 'login_success', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
        `
        console.log("[Director] Security audit log inserted")
      } catch (auditError) {
        console.log("[Director] Security audit log failed:", auditError)
      }

      const sessionToken = generateSessionToken(username, password)
      console.log("[Director] Login successful")

      return NextResponse.json({
        success: true,
        message: "Login successful",
        director: {
          id: director.id,
          username: director.username,
          role: director.role,
        },
        token: sessionToken,
      })
    } else {
      console.log("[Director] Invalid credentials")

      try {
        await sql`
          INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
          VALUES ('director', -1, 'login_failed', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
        `
      } catch (auditError) {
        console.log("[Director] Audit log failed:", auditError)
      }

      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error: any) {
    console.error("[Director] Login error:", error)
    return NextResponse.json({ success: false, message: "An error occurred during login" }, { status: 500 })
  }
}
