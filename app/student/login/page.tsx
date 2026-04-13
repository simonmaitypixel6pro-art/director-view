"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"
import { GraduationCap, ArrowLeft, Eye, EyeOff, AlertTriangle, Chrome } from "lucide-react"
import { StudentAuthManager } from "@/lib/student-auth"
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog"

// Extend Window type for Google
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          oneTap: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void // Add this line
        }
      }
    }
  }
}

// --- BEACH CONFIGURATION ---
interface BeachItem {
  id: number
  left: number
  duration: number
  delay: number
  scale: number
  type?: string
}

interface ShootingStar {
  id: number
  left: number
  top: number
  duration: number
  delay: number
  angle: number
}

export default function StudentLoginPage() {
  const [enrollmentNumber, setEnrollmentNumber] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Forgot Password State
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  // Beach State
  const [palmTrees, setPalmTrees] = useState<BeachItem[]>([])
  const [people, setPeople] = useState<BeachItem[]>([])
  const [waves, setWaves] = useState<BeachItem[]>([])
  const [stars, setStars] = useState<BeachItem[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])
  const [mounted, setMounted] = useState(false)
  const [googleInitialized, setGoogleInitialized] = useState(false)

  const router = useRouter()
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  // --- GOOGLE OAUTH HANDLER ---
  useEffect(() => {
    // Wait for Google script to load
    const checkGoogleLoaded = setInterval(() => {
      if (window.google && !googleInitialized) {
        console.log("[v0] Google script loaded, initializing...")
        clearInterval(checkGoogleLoaded)
        initializeGoogleAuth()
        setGoogleInitialized(true)
      }
    }, 100)

    return () => clearInterval(checkGoogleLoaded)
  }, [googleInitialized])

  const initializeGoogleAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    try {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
        auto_select: false,
      })

      // This renders the hidden button that we will "force click" later
      const container = document.getElementById("google-signin-hidden")
      if (container) {
        window.google?.accounts.id.renderButton(container, { type: "standard" })
      }
    } catch (err) {
      console.error("Error initializing Google auth:", err)
    }
  }

  const handleGoogleCallback = async (response: any) => {
    setGoogleLoading(true)
    setError("")

    try {
      const token = response.credential
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
      const userData = JSON.parse(jsonPayload)

      const loginResponse = await fetch("/api/student/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        }),
      })

      const loginData = await loginResponse.json()

      if (loginResponse.ok && loginData.success) {
        localStorage.removeItem("loginAttempts")
        StudentAuthManager.setGoogleAuth(
          loginData.student,
          loginData.credentials.enrollment,
          loginData.credentials.googleId
        )
        router.refresh()
        setTimeout(() => router.push("/student/dashboard"), 1000)
      } else {
        setError(loginData.message || "Google authentication failed")
      }
    } catch (err) {
      setError("Authentication failed. Please try again.")
    } finally {
      setGoogleLoading(false)
    }
  }

  // --- THE NEW HELPER FUNCTION ---
  const triggerGoogleSignIn = () => {
    const hiddenBtn = document.getElementById("google-signin-hidden")?.querySelector('div[role="button"]') as HTMLElement
    if (hiddenBtn) {
      hiddenBtn.click()
    } else if (window.google) {
      window.google.accounts.id.prompt()
    }
  }

  // --- 1. INITIALIZE BEACH ITEMS ---
  useEffect(() => {
    setMounted(true)

    // Palm Trees (Light Mode)
    const newPalmTrees = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: (i * 12) + Math.random() * 8,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * -5,
      scale: 0.7 + Math.random() * 0.5,
    }))
    setPalmTrees(newPalmTrees)

    // Moving People (Light Mode)
    const newPeople = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * -30,
      scale: 0.4 + Math.random() * 0.3,
      type: i % 3 === 0 ? 'walking' : i % 3 === 1 ? 'surfing' : 'running',
    }))
    setPeople(newPeople)

    // Ocean Waves (Light Mode)
    const newWaves = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      left: i * 25,
      duration: 8 + Math.random() * 4,
      delay: i * -2,
      scale: 1,
    }))
    setWaves(newWaves)

    // Starry Sky (Dark Mode)
    const newStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * -5,
      scale: 0.3 + Math.random() * 0.7,
    }))
    setStars(newStars)

    // Shooting Stars (Dark Mode)
    const newShootingStars = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 40,
      duration: 1.5 + Math.random() * 1,
      delay: Math.random() * -20,
      angle: 30 + Math.random() * 30,
    }))
    setShootingStars(newShootingStars)
  }, [])

  // --- 2. TURNSTILE LOGIC ---
  useEffect(() => {
    fetch("/api/config/turnstile-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.siteKey) {
          setSiteKey(data.siteKey)
        } else {
          setCaptchaError("Failed to load CAPTCHA configuration.")
        }
      })
      .catch(() => {
        setCaptchaError("Failed to load CAPTCHA configuration.")
      })

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.onload = () => { }
    script.onerror = () => setCaptchaError("Failed to load CAPTCHA.")
    document.body.appendChild(script)
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (siteKey && window.turnstile && turnstileContainerRef.current && !turnstileReady) {
      renderTurnstile()
    }
  }, [siteKey, turnstileReady])

  const renderTurnstile = () => {
    if (!turnstileContainerRef.current || !window.turnstile || !siteKey) return
    try {
      const widgetId = window.turnstile.render("#turnstile-container", {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => {
          setTurnstileToken(token)
          setCaptchaError("")
        },
        "error-callback": () => {
          setTurnstileToken(null)
          setCaptchaError("CAPTCHA verification failed.")
        },
        "expired-callback": () => {
          setTurnstileToken(null)
          setCaptchaError("CAPTCHA expired.")
        },
      })
      turnstileWidgetRef.current = widgetId
      setTurnstileReady(true)
    } catch (err) {
      console.error(err)
    }
  }

  // --- 3. LOCKOUT LOGIC ---
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(lockoutTime - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [lockoutTime])

  // --- 4. FORM HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (lockoutTime > 0) {
      setLoading(false)
      return
    }

    if (!turnstileToken) {
      setCaptchaError("Please complete the CAPTCHA")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentNumber: enrollmentNumber.trim(),
          password,
          captchaToken: turnstileToken,
        }),
      })
      const data = await response.json()
      console.log("[v0] Login response received:", {
        success: data.success,
        hasCredentials: !!data.credentials,
        credentialsEnrollment: data.credentials?.enrollment,
        credentialsPasswordLength: data.credentials?.password?.length,
      })

      if (response.ok && data.success) {
        localStorage.removeItem("loginAttempts")
        console.log("[v0] Calling StudentAuthManager.setAuth with credentials")
        StudentAuthManager.setAuth(data.student, data.credentials.enrollment, data.credentials.password)
        router.refresh()
        setTimeout(() => router.push("/student/dashboard"), 500)
      } else {
        const newCount = failedAttempts + 1
        setFailedAttempts(newCount)
        if (newCount >= 5) setLockoutTime(10 * 60)
        setError(data.message || "Invalid credentials")
        setTurnstileToken(null)
        if (turnstileWidgetRef.current) window.turnstile.reset(turnstileWidgetRef.current)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-200 dark:from-[#0a0e1a] dark:via-[#0f1629] dark:to-[#0a1229] flex items-center justify-center p-4">
      {/* Google Sign-In Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("[v0] Google Sign-In script loaded")
        }}
      />
      <div id="google-signin-hidden" style={{ display: 'none' }}></div>
      {/* --- INLINE STYLES FOR BEACH ANIMATIONS --- */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes palmSway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes walkAcross {
          0% { 
            transform: translateX(-100vw) scaleX(1); 
            opacity: 0;
          }
          5% { 
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% { 
            transform: translateX(100vw) scaleX(1); 
            opacity: 0;
          }
        }
        @keyframes waveFlow {
          0% { 
            transform: translateX(-100%) scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% { 
            transform: translateX(100vw) scale(1.2);
            opacity: 0.3;
          }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shootingStar {
          0% { 
            transform: translate(0, 0) rotate(var(--angle));
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% { 
            transform: translate(calc(var(--distance) * 1px), calc(var(--distance) * 0.6px)) rotate(var(--angle));
            opacity: 0;
          }
        }
        .palm-tree {
          animation: palmSway ease-in-out infinite;
          transform-origin: bottom center;
        }
        .beach-person {
          animation: walkAcross linear infinite;
          position: absolute;
          bottom: 15vh;
        }
        .ocean-wave {
          animation: waveFlow linear infinite;
          position: absolute;
          bottom: 0;
        }
        .star {
          animation: twinkle ease-in-out infinite;
          position: absolute;
        }
        .shooting-star {
          animation: shootingStar linear infinite;
          position: absolute;
        }
      `}} />

      {/* --- BEACH LAYER (FIXED BACKGROUND) --- */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-[1]">

        {/* LIGHT MODE: BEACH SCENE */}
        <div className="block dark:hidden w-full h-full relative">
          {/* Sun with blue tint */}
          <div className="absolute top-10 right-20 w-24 h-24 bg-blue-400 rounded-full shadow-[0_0_60px_#60a5fa] animate-pulse"></div>

          {/* Ocean Waves */}
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="ocean-wave"
              style={{
                left: `${wave.left}%`,
                animationDuration: `${wave.duration}s`,
                animationDelay: `${wave.delay}s`,
                width: '300px',
                height: '80px',
              }}
            >
              <svg viewBox="0 0 300 80" fill="none" style={{ width: '100%', height: '100%' }}>
                <path d="M0 40 Q 75 20, 150 40 T 300 40 L 300 80 L 0 80 Z" fill="rgba(96, 165, 250, 0.3)" />
                <path d="M0 45 Q 75 30, 150 45 T 300 45 L 300 80 L 0 80 Z" fill="rgba(59, 130, 246, 0.2)" />
              </svg>
            </div>
          ))}

          {/* Palm Trees */}
          {palmTrees.map((tree) => (
            <div
              key={tree.id}
              className="palm-tree absolute"
              style={{
                left: `${tree.left}%`,
                bottom: '5vh',
                animationDuration: `${tree.duration}s`,
                animationDelay: `${tree.delay}s`,
                width: `${80 * tree.scale}px`,
                height: `${120 * tree.scale}px`,
              }}
            >
              <svg viewBox="0 0 100 150" fill="none" style={{ width: '100%', height: '100%', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))' }}>
                {/* Trunk */}
                <rect x="45" y="60" width="10" height="90" fill="#8B4513" rx="2" />
                <ellipse cx="50" cy="75" rx="7" ry="4" fill="#A0522D" />
                <ellipse cx="50" cy="90" rx="7" ry="4" fill="#A0522D" />
                <ellipse cx="50" cy="105" rx="7" ry="4" fill="#A0522D" />
                {/* Palm Leaves */}
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#228B22" transform="rotate(-30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#2E8B57" transform="rotate(30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#32CD32" transform="rotate(0 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#3CB371" transform="rotate(-60 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#228B22" transform="rotate(60 50 30)" />
                {/* Coconuts */}
                <circle cx="45" cy="55" r="5" fill="#8B4513" />
                <circle cx="55" cy="58" r="5" fill="#A0522D" />
              </svg>
            </div>
          ))}

          {/* Moving People */}
          {people.map((person) => (
            <div
              key={person.id}
              className="beach-person"
              style={{
                left: `${person.left}%`,
                animationDuration: `${person.duration}s`,
                animationDelay: `${person.delay}s`,
                width: `${60 * person.scale}px`,
                height: `${80 * person.scale}px`,
              }}
            >
              {person.type === 'walking' && (
                <svg viewBox="0 0 60 80" fill="none" style={{ width: '100%', height: '100%' }}>
                  <circle cx="30" cy="15" r="8" fill="#FFA07A" />
                  <rect x="25" y="23" width="10" height="25" fill="#4169E1" rx="2" />
                  <rect x="22" y="35" width="6" height="25" fill="#FFE4B5" rx="2" />
                  <rect x="32" y="35" width="6" height="25" fill="#FFE4B5" rx="2" />
                  <rect x="20" y="23" width="5" height="20" fill="#FFE4B5" rx="2" transform="rotate(-20 22 23)" />
                  <rect x="35" y="23" width="5" height="20" fill="#FFE4B5" rx="2" transform="rotate(20 37 23)" />
                </svg>
              )}
              {person.type === 'surfing' && (
                <svg viewBox="0 0 80 60" fill="none" style={{ width: '100%', height: '100%' }}>
                  <ellipse cx="40" cy="45" rx="35" ry="8" fill="#FF6347" opacity="0.8" />
                  <circle cx="40" cy="20" r="7" fill="#FFA07A" />
                  <path d="M 33 27 Q 40 35 47 27" stroke="#4169E1" strokeWidth="4" fill="none" />
                  <rect x="30" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(-30 32 27)" />
                  <rect x="45" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(30 47 27)" />
                </svg>
              )}
              {person.type === 'running' && (
                <svg viewBox="0 0 60 80" fill="none" style={{ width: '100%', height: '100%' }}>
                  <circle cx="30" cy="15" r="8" fill="#FFA07A" />
                  <rect x="25" y="23" width="10" height="20" fill="#FF6347" rx="2" />
                  <rect x="20" y="38" width="6" height="28" fill="#FFE4B5" rx="2" transform="rotate(-40 23 38)" />
                  <rect x="34" y="38" width="6" height="28" fill="#FFE4B5" rx="2" transform="rotate(30 37 38)" />
                  <rect x="18" y="23" width="5" height="18" fill="#FFE4B5" rx="2" transform="rotate(-50 20 23)" />
                  <rect x="37" y="23" width="5" height="18" fill="#FFE4B5" rx="2" transform="rotate(40 39 23)" />
                </svg>
              )}
            </div>
          ))}

          {/* Beach Sand */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-blue-200 via-sky-100 to-transparent"></div>
        </div>

        {/* DARK MODE: NIGHT BEACH WITH STARS */}
        <div className="hidden dark:block w-full h-full relative">
          {/* Moon with blue glow */}
          <div className="absolute top-16 right-24 w-20 h-20 bg-blue-200 rounded-full shadow-[0_0_80px_#bfdbfe] opacity-90">
            <div className="absolute top-2 right-3 w-4 h-4 bg-blue-300 rounded-full opacity-40"></div>
            <div className="absolute top-6 right-8 w-3 h-3 bg-blue-300 rounded-full opacity-30"></div>
          </div>

          {/* Stars */}
          {stars.map((star) => (
            <div
              key={star.id}
              className="star"
              style={{
                left: `${star.left}%`,
                top: `${Math.random() * 60}%`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            >
              <svg width={`${12 * star.scale}`} height={`${12 * star.scale}`} viewBox="0 0 24 24" fill="#bfdbfe">
                <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
              </svg>
            </div>
          ))}

          {/* Shooting Stars with blue trails */}
          {shootingStars.map((star) => (
            <div
              key={star.id}
              className="shooting-star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                // @ts-ignore
                '--angle': `${star.angle}deg`,
                '--distance': Math.random() * 400 + 200,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            >
              <svg width="60" height="3" viewBox="0 0 60 3" fill="none">
                <defs>
                  <linearGradient id={`grad-${star.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0" />
                    <stop offset="50%" stopColor="#bfdbfe" stopOpacity="1" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="60" height="3" fill={`url(#grad-${star.id})`} />
                <circle cx="58" cy="1.5" r="2" fill="#bfdbfe" />
              </svg>
            </div>
          ))}

          {/* Palm Tree Silhouettes */}
          {palmTrees.slice(0, 5).map((tree) => (
            <div
              key={tree.id}
              className="palm-tree absolute opacity-40"
              style={{
                left: `${tree.left}%`,
                bottom: '5vh',
                animationDuration: `${tree.duration}s`,
                animationDelay: `${tree.delay}s`,
                width: `${80 * tree.scale}px`,
                height: `${120 * tree.scale}px`,
              }}
            >
              <svg viewBox="0 0 100 150" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="45" y="60" width="10" height="90" fill="#1a2840" rx="2" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#1e3a5f" transform="rotate(-30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#1e3a5f" transform="rotate(30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#2a4a70" transform="rotate(0 50 30)" />
              </svg>
            </div>
          ))}

          {/* Dark Ocean Waves with blue tint */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-950 via-indigo-950/50 to-transparent opacity-60">
            <svg className="absolute bottom-0 w-full h-full opacity-30" viewBox="0 0 1200 100" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,100 L0,100 Z" fill="rgba(30, 58, 138, 0.3)" />
            </svg>
          </div>

          {/* Night Beach Sand */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-indigo-950 via-blue-900/50 to-transparent opacity-50"></div>
        </div>
      </div>

      {/* Background Glows with student colors */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      {/* --- TOP BAR --- */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            StudentAuthManager.clearAuth()
            router.push("/")
          }}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Button>
        <ModeToggle />
      </div>

      {/* --- LOGIN CARD --- */}
      <div className="w-full max-w-md relative z-20">
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Student Portal
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Sign in to access your placement dashboard
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="enrollmentNumber">Enrollment Number</Label>
                <div className="flex gap-3 items-end">
                  <Input
                    id="enrollmentNumber"
                    placeholder="Enter your enrollment number"
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value)}
                    className="h-11 bg-background/50 border-2 focus:border-blue-500 flex-1"
                    required
                    disabled={lockoutTime > 0 || loading}
                  />
                  {/* Google Sign-In Icon Button */}
                  <button
                    type="button"
                    onClick={triggerGoogleSignIn}
                    disabled={googleLoading || lockoutTime > 0}
                    className="h-11 w-11 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-300 dark:border-gray-700"
                    title="Sign in with Google"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0 text-blue-600 hover:text-blue-700"
                    onClick={() => setForgotPasswordOpen(true)}
                    disabled={lockoutTime > 0 || loading}
                  >
                    Forgot Password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background/50 border-2 focus:border-blue-500 pr-10"
                    required
                    disabled={lockoutTime > 0 || loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={lockoutTime > 0 || loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Verify you are human</Label>
                <div
                  ref={turnstileContainerRef}
                  id="turnstile-container"
                  className={`flex justify-center ${lockoutTime > 0 ? "opacity-50" : ""}`}
                />
                {captchaError && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 text-xs">
                    <AlertDescription>{captchaError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {lockoutTime > 0 && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <AlertDescription>
                    Too many failed attempts. Try again in {Math.floor(lockoutTime / 60)}:
                    {String(lockoutTime % 60).padStart(2, "0")}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg"
                disabled={loading || lockoutTime > 0 || !turnstileReady}
              >
                {loading ? "Signing in..." : lockoutTime > 0 ? "Locked" : "Sign In"}
              </Button>
            </form>

            {googleLoading && (
              <div className="text-center text-sm text-muted-foreground">
                Signing in with Google...
              </div>
            )}
            {!googleInitialized && (
              <div className="text-center text-xs text-muted-foreground">
                Loading Google Sign-In...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        userType="student"
        identityFieldLabel="Enrollment Number"
        identityFieldPlaceholder="Enter your enrollment number"
      />

      <div className="absolute bottom-4 left-4 right-4 text-center z-20">
        <p className="text-xs text-muted-foreground">
          © 2025 Avinya Project by Simon Maity All Rights Reserved. | Samanvay ERP | Developed for GUCPC, Gujarat
          University.
        </p>
      </div>
    </div>
  )
}