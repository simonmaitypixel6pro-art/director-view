"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Star, ArrowLeft, LogOut, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface TutorFeedback {
  id: number
  full_name: string
  subject_id: number
  subject_name: string
  avg_rating: number
  feedback_count: number
}

interface SubjectFeedback {
  id: number
  subject_name: string
  avg_rating: number
  feedback_count: number
}

interface TutorOverall {
  id: number
  full_name: string
  avg_rating: number
  feedback_count: number
}

interface FeedbackData {
  tutorWise: TutorFeedback[]
  subjectWise: SubjectFeedback[]
  tutorOverall: TutorOverall[]
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"]

export default function DirectorFeedbackPage() {
  const [directorData, setDirectorData] = useState<any>(null)
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const directorAuth = localStorage.getItem("directorAuth")
    if (!directorAuth) {
      router.push("/director/login")
      return
    }

    try {
      const director = JSON.parse(localStorage.getItem("directorData") || "{}")
      setDirectorData(director)
      fetchFeedbackData()
    } catch (error) {
      console.error("[v0] Failed to parse director data:", error)
      router.push("/director/login")
    }
  }, [router])

  const fetchFeedbackData = async () => {
    try {
      const response = await fetch("/api/director/dashboard/feedback")
      const data = await response.json()
      if (data.success) {
        setFeedbackData(data.feedback)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch feedback data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("directorAuth")
    localStorage.removeItem("directorData")
    router.push("/director/login")
  }

  if (!directorData || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 dark:text-slate-400">Loading feedback analytics...</div>
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
            <div className="flex items-center gap-4">
              <Link href="/director/dashboard">
                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 p-2">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feedback Analytics</h1>
              </div>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Overall Stats */}
        <motion.div
          className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Feedback Entries</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {feedbackData?.tutorWise.reduce((sum, t) => sum + t.feedback_count, 0) || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tutors Rated</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {feedbackData?.tutorOverall.length || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Overall Rating</p>
                <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 mt-2">
                  {(
                    feedbackData?.tutorOverall.reduce((sum, t) => sum + t.avg_rating, 0) / (feedbackData?.tutorOverall.length || 1)
                  ).toFixed(2) || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tutor Overall Ratings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Tutor-wise Ratings
              </CardTitle>
              <CardDescription>Average feedback rating per tutor</CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackData?.tutorOverall && feedbackData.tutorOverall.length > 0 ? (
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={feedbackData.tutorOverall}
                      margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" />
                      <XAxis
                        dataKey="full_name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12, fill: "currentColor" }}
                      />
                      <YAxis
                        domain={[0, 5]}
                        tick={{ fontSize: 12, fill: "currentColor" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(100, 116, 139, 0.3)",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [value.toFixed(2), "Avg Rating"]}
                      />
                      <Bar dataKey="avg_rating" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No feedback data available</p>
              )}

              {/* Table View */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-2 font-semibold text-slate-900 dark:text-white">Tutor Name</th>
                      <th className="text-center p-2 font-semibold text-slate-900 dark:text-white">Avg Rating</th>
                      <th className="text-center p-2 font-semibold text-slate-900 dark:text-white">Feedback Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackData?.tutorOverall.map((tutor) => (
                      <tr key={tutor.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="p-2 text-slate-900 dark:text-white">{tutor.full_name}</td>
                        <td className="text-center p-2">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
                            {tutor.avg_rating.toFixed(2)} / 5
                          </span>
                        </td>
                        <td className="text-center p-2 text-slate-600 dark:text-slate-400">{tutor.feedback_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subject-wise Ratings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Subject-wise Ratings
              </CardTitle>
              <CardDescription>Average feedback rating per subject</CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackData?.subjectWise && feedbackData.subjectWise.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart */}
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={feedbackData.subjectWise}
                          dataKey="avg_rating"
                          nameKey="subject_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {feedbackData.subjectWise.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toFixed(2)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Table */}
                  <div className="flex flex-col">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left p-2 font-semibold text-slate-900 dark:text-white">Subject</th>
                          <th className="text-center p-2 font-semibold text-slate-900 dark:text-white">Avg Rating</th>
                          <th className="text-center p-2 font-semibold text-slate-900 dark:text-white">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedbackData?.subjectWise.map((subject) => (
                          <tr key={subject.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="p-2 text-slate-900 dark:text-white">{subject.subject_name}</td>
                            <td className="text-center p-2">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                {subject.avg_rating.toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center p-2 text-slate-600 dark:text-slate-400">
                              {subject.feedback_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No feedback data available</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
