"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"
import { Shield, Eye, EyeOff } from "lucide-react"

declare global {
  interface Window {
    turnstile: {
      render: (selector: string, options: any) => string
      getResponse: (widgetId: string) => string | undefined
      reset: (widgetId: string) => void
    }
  }
}

export default function DirectorLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState("")
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)

    // Check if already logged in
    const directorAuth = localStorage.getItem("directorAuth")
    if (directorAuth) {
      router.push("/director/dashboard")
      return
    }

    // Load Turnstile
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    script.onload = () => {
      setTurnstileSiteKey(process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "")
      setTurnstileReady(true)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [router])

  useEffect(() => {
    if (turnstileReady && turnstileSiteKey && turnstileContainerRef.current && !turnstileWidgetRef.current) {
      try {
        turnstileWidgetRef.current = window.turnstile.render("#turnstile-container", {
          sitekey: turnstileSiteKey,
          theme: localStorage.getItem("theme") === "dark" ? "dark" : "light",
          callback: (token: string) => {
            setTurnstileToken(token)
            setCaptchaError("")
          },
          "error-callback": () => {
            setCaptchaError("CAPTCHA verification failed")
          },
        })
      } catch (error) {
        console.error("Turnstile render error:", error)
      }
    }
  }, [turnstileReady, turnstileSiteKey])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCaptchaError("")
    setError("")

    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/director/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          token: turnstileToken,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Store auth token and director data in localStorage
        localStorage.setItem("directorAuth", data.token)
        localStorage.setItem("directorData", JSON.stringify(data.director))
        router.push("/director/dashboard")
      } else {
        setError(data.message || "Login failed")
        if (turnstileWidgetRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetRef.current)
        }
        setTurnstileToken(null)
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login")
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetRef.current)
      }
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />

      {/* Mode Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-3">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Director Portal</CardTitle>
            <CardDescription>Access the director analytics dashboard</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              {captchaError && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950">
                  <AlertDescription className="text-red-800 dark:text-red-200">{captchaError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="border-slate-200 dark:border-slate-700 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cloudflare Turnstile */}
              <div ref={turnstileContainerRef} id="turnstile-container" className="flex justify-center" />

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
