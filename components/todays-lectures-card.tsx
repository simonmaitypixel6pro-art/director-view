"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, Calendar, X } from "lucide-react"
import { motion } from "framer-motion"

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 },
  },
}

interface LectureGroup {
  course_name: string
  course_id: number
  semester: number
  lecture_count: number
  lectures: any[]
}

interface Course {
  id: number
  name: string
  semester: number
}

export function TodaysLecturesCard() {
  const [lectureGroups, setLectureGroups] = useState<LectureGroup[]>([])
  const [totalLectures, setTotalLectures] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedSemester, setSelectedSemester] = useState<string>("all")
  const [courses, setCourses] = useState<Course[]>([])
  const [semesters, setSemesters] = useState<number[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchLectures()
  }, [selectedDate, selectedCourse, selectedSemester])

  useEffect(() => {
    // Update available semesters based on selected course
    if (selectedCourse === "all") {
      const uniqueSems = [...new Set(courses.map((c) => c.semester))].sort((a, b) => a - b)
      setSemesters(uniqueSems)
    } else {
      const courseId = parseInt(selectedCourse)
      const courseSemesters = courses
        .filter((c) => c.id === courseId)
        .map((c) => c.semester)
        .sort((a, b) => a - b)
      setSemesters([...new Set(courseSemesters)])
    }
  }, [selectedCourse, courses])

  const fetchLectures = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append("date", selectedDate)
      if (selectedCourse !== "all") params.append("course", selectedCourse)
      if (selectedSemester !== "all") params.append("semester", selectedSemester)

      const response = await fetch(`/api/admin/today-lectures?${params}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const transformed = data.data?.map((group: any) => ({
          ...group,
          lecture_count: parseInt(group.lecture_count || 0),
          lectures: Array.isArray(group.lectures) ? group.lectures : [],
        })) || []

        setLectureGroups(transformed)
        setTotalLectures(data.totalLectures || 0)

        if (data.courses && Array.isArray(data.courses)) {
          setCourses(data.courses)
        }
      } else {
        setLectureGroups([])
        setTotalLectures(0)
      }
    } catch (error) {
      console.error("[v0] Error fetching lectures:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      setLectureGroups([])
      setTotalLectures(0)
    } finally {
      setLoading(false)
    }
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  }

  // Get unique courses for dropdown
  const uniqueCourses = Array.from(new Map(courses.map((c) => [c.id, c])).values())

  return (
    <>
      {/* Main Button */}
      <motion.div initial="hidden" animate="visible" variants={itemVariants}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full px-6 py-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-md hover:shadow-lg"
        >
          <Calendar className="h-5 w-5" />
          See Lectures by Date
        </button>
      </motion.div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-7xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 px-6 py-4 text-white border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">Lectures by Date</h2>
                  <p className="text-sm text-white/80">Select date, course, and semester to view lectures breakdown</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Date and Filter Section */}
              <div className="space-y-3 rounded-lg bg-slate-50 dark:bg-white/5 p-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <label className="font-medium text-sm text-foreground dark:text-white min-w-fit">Select Date:</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-800 text-foreground dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{formatDateDisplay(selectedDate)}</span>
                  </div>
                </div>

                {/* Course and Semester Dropdowns */}
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-foreground dark:text-white min-w-fit">Course:</span>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="px-3 py-2 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-800 text-foreground dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Courses</option>
                      {uniqueCourses.map((course) => (
                        <option key={course.id} value={String(course.id)}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-foreground dark:text-white min-w-fit">Semester:</span>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="px-3 py-2 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-800 text-foreground dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Semesters</option>
                      {semesters.map((sem) => (
                        <option key={sem} value={String(sem)}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Total Lectures */}
              {!loading && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Lectures</p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalLectures}</p>
                  </div>
                  <BookOpen className="h-12 w-12 text-indigo-200 dark:text-indigo-900" />
                </motion.div>
              )}

              {/* Lectures Display */}
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                </div>
              ) : error ? (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400 text-sm">
                  Error: {error}
                </div>
              ) : lectureGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No lectures scheduled for the selected criteria</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {lectureGroups.map((group) => (
                    <motion.div key={`${group.course_id}-${group.semester}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/10">
                        <h3 className="font-semibold text-foreground dark:text-white">{group.course_name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Semester {group.semester} • {group.lecture_count} lecture{group.lecture_count !== 1 ? 's' : ''}</p>
                      </div>

                      {/* 4-Column Grid Layout with Scrolling */}
                      <div className="p-4 overflow-x-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-max lg:min-w-0">
                          {group.lectures.map((lecture) => (
                            <div key={lecture.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3 hover:shadow-md dark:hover:shadow-lg transition-all hover:bg-white dark:hover:bg-white/10 bg-white dark:bg-white/5 w-72 lg:w-auto">
                              {/* Header with title and tutor */}
                              <div className="mb-3">
                                <h4 className="font-semibold text-sm text-foreground dark:text-white line-clamp-2 mb-1">{lecture.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{lecture.subject}</p>
                                <span className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                  {lecture.tutor}
                                </span>
                              </div>

                              {/* Attendance Stats - Compact Color-Coded Numbers */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center py-2 px-1.5 rounded bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                  <p className="text-base font-bold text-slate-900 dark:text-white">{lecture.attendance.total}</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Total</p>
                                </div>
                                <div className="text-center py-2 px-1.5 rounded bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800">
                                  <p className="text-base font-bold text-green-700 dark:text-green-400">{lecture.attendance.present}</p>
                                  <p className="text-xs text-green-700 dark:text-green-400">Present</p>
                                </div>
                                <div className="text-center py-2 px-1.5 rounded bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800">
                                  <p className="text-base font-bold text-red-700 dark:text-red-400">{lecture.attendance.absent}</p>
                                  <p className="text-xs text-red-700 dark:text-red-400">Absent</p>
                                </div>
                                <div className="text-center py-2 px-1.5 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800">
                                  <p className="text-base font-bold text-yellow-700 dark:text-yellow-400">{lecture.attendance.not_marked}</p>
                                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Not Marked</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
