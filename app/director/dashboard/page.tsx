"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DirectorStatCard } from "@/components/director-stat-card"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Users,
  GraduationCap,
  Calendar,
  School,
  Activity,
  Star,
  LogOut,
  ChevronRight,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 },
  },
}

interface DashboardStats {
  totalStudents: number
  totalTutors: number
  todayLectures: number
  activeExams: number
  attendancePercentage: number
  avgFeedbackRating: number
  feedbackCount: number
}

export default function DirectorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [directorData, setDirectorData] = useState<any>(null)
  const [greeting, setGreeting] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Dynamic Greeting
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")

    // Check authentication
    const directorAuth = localStorage.getItem("directorAuth")
    if (!directorAuth) {
      router.push("/director/login")
      return
    }

    try {
      const director = JSON.parse(localStorage.getItem("directorData") || "{}")
      setDirectorData(director)
      fetchStats(directorAuth)
    } catch (error) {
      console.error("[v0] Failed to parse director auth:", error)
      localStorage.removeItem("directorAuth")
      localStorage.removeItem("directorData")
      router.push("/director/login")
    }
  }, [router])

  const fetchStats = async (token?: string) => {
    try {
      const response = await fetch("/api/director/dashboard/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("directorAuth")
    localStorage.removeItem("directorData")
    router.push("/director/login")
  }

  if (loading || !stats || !directorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 dark:text-slate-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />

      {/* Header */}
      <div className="relative z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2">
                <School className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Director Portal</h1>
            </div>

            <div className="flex items-center gap-4">
              <ModeToggle />
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2 text-slate-600 dark:text-slate-400"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            {greeting}, {directorData.username}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Here&apos;s an overview of your campus activities
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          <DirectorStatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Students"
            value={stats.totalStudents}
            color="blue"
            index={0}
          />
          <DirectorStatCard
            icon={<GraduationCap className="w-6 h-6" />}
            label="Total Tutors"
            value={stats.totalTutors}
            color="purple"
            index={1}
          />
          <DirectorStatCard
            icon={<Calendar className="w-6 h-6" />}
            label="Today's Lectures"
            value={stats.todayLectures}
            color="green"
            index={2}
          />
          <DirectorStatCard
            icon={<School className="w-6 h-6" />}
            label="Active Exams Today"
            value={stats.activeExams}
            color="indigo"
            index={3}
          />
          <DirectorStatCard
            icon={<Activity className="w-6 h-6" />}
            label="Attendance Rate"
            value={`${stats.attendancePercentage}%`}
            color="orange"
            index={4}
          />
          <DirectorStatCard
            icon={<Star className="w-6 h-6" />}
            label="Avg. Feedback Rating"
            value={stats.avgFeedbackRating.toFixed(1)}
            color="pink"
            index={5}
          />
        </motion.div>

        {/* Action Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Link href="/director/dashboard/lectures">
            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Lecture Activity
                </CardTitle>
                <CardDescription>View lectures by date with breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Explore course-wise, semester-wise, and subject-wise lecture distribution
                </p>
                <div className="mt-4 flex items-center text-blue-500">
                  <span className="text-sm font-medium">View Details</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/director/dashboard/feedback">
            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-pink-500" />
                  Feedback Analytics
                </CardTitle>
                <CardDescription>View feedback performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tutor-wise ratings, subject performance, and detailed feedback breakdown
                </p>
                <div className="mt-4 flex items-center text-pink-500">
                  <span className="text-sm font-medium">View Analytics</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
