"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Calendar, ArrowLeft, LogOut, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Lecture {
  id: number
  subject_id: number
  subject_name: string
  course_id: number
  course_name: string
  semester: number
  tutor_id: number
  tutor_name: string
  scheduled_at: string
  status: string
}

interface GroupedData {
  [course: string]: {
    course: string
    semesters: {
      [semester: string]: {
        semester: number
        lectures: Lecture[]
      }
    }
  }
}

export default function DirectorLecturesPage() {
  const [directorData, setDirectorData] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [lecturesData, setLecturesData] = useState<GroupedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalLectures, setTotalLectures] = useState(0)
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
    } catch (error) {
      console.error("[v0] Failed to parse director data:", error)
      router.push("/director/login")
    }
  }, [router])

  useEffect(() => {
    if (selectedDate) {
      fetchLectures(selectedDate)
    }
  }, [selectedDate])

  const fetchLectures = async (date: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/director/dashboard/lectures?date=${date}`)
      const data = await response.json()
      if (data.success) {
        setLecturesData(data.data)
        setTotalLectures(data.totalLectures)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch lectures:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("directorAuth")
    localStorage.removeItem("directorData")
    router.push("/director/login")
  }

  if (!directorData) {
    return null
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
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lecture Activity</h1>
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
        {/* Date Selector */}
        <Card className="mb-8 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view lectures conducted on that day</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs border-slate-200 dark:border-slate-700"
            />
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <motion.div
          className="mb-8 p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-semibold">
              {selectedDate && new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Total Lectures: <span className="font-bold text-slate-900 dark:text-white">{totalLectures}</span>
          </p>
        </motion.div>

        {/* Lectures by Course */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-slate-600 dark:text-slate-400">Loading lectures...</div>
          </div>
        ) : lecturesData && Object.keys(lecturesData).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(lecturesData).map(([courseKey, courseData], courseIdx) => (
              <motion.div
                key={courseKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + courseIdx * 0.05 }}
              >
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-blue-600 dark:text-blue-400">{courseData.course}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(courseData.semesters).map(([semesterKey, semesterData]) => (
                        <div key={semesterKey} className="border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                            Semester {semesterData.semester}
                          </h4>
                          <div className="space-y-2">
                            {semesterData.lectures.map((lecture) => (
                              <div
                                key={lecture.id}
                                className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  <BookOpen className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {lecture.subject_name}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                      Tutor: {lecture.tutor_name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                      {new Date(lecture.scheduled_at).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  {lecture.status || "Scheduled"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-center">
                No lectures scheduled for this date
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
