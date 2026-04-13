"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Activity, BarChart3, Users, Star, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { QuestionWiseAnalytics } from "@/components/question-wise-analytics"
import { QuestionAnalyticsModal } from "@/components/question-analytics-modal"

export default function AdminFeedbackPage() {
  const [adminData, setAdminData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [tutorwise, setTutorwise] = useState<any[]>([])
  const [studentwise, setStudentwise] = useState<any[]>([])
  const [attendanceFiltered, setAttendanceFiltered] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [attendanceThreshold, setAttendanceThreshold] = useState(0)
  const [managingFeedback, setManagingFeedback] = useState(false)
  const [expandedTutors, setExpandedTutors] = useState<Set<number>>(new Set())
  const [expandedCourseSem, setExpandedCourseSem] = useState<Set<string>>(new Set())
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackModalData, setFeedbackModalData] = useState<any>(null)
  const [feedbackDetails, setFeedbackDetails] = useState<any[]>([])
  const [questionwise, setQuestionwise] = useState<any[]>([])
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }

    try {
      const admin = JSON.parse(localStorage.getItem("adminData") || "{}")
      setAdminData(admin)
      fetchFeedbackData()
    } catch (error) {
      console.error("Failed to parse admin data:", error)
      localStorage.removeItem("adminAuth")
      router.push("/admin/login")
    }
  }, [router])

  useEffect(() => {
    if (attendanceThreshold >= 0) {
      fetchAttendanceFilteredData()
    }
  }, [attendanceThreshold])

  const fetchFeedbackData = async () => {
    try {
      setLoading(true)

      // Fetch settings
      const settingsRes = await fetch("/api/feedback?action=settings")
      const settingsData = await settingsRes.json()
      setSettings(settingsData.settings)

      // Fetch summary
      const summaryRes = await fetch("/api/admin/feedback?action=summary")
      const summaryData = await summaryRes.json()
      setSummary(summaryData.summary)

      // Fetch tutor-wise
      const tutorRes = await fetch("/api/admin/feedback?action=tutorwise")
      const tutorData = await tutorRes.json()
      console.log("[v0] Tutorwise response:", tutorData)
      setTutorwise(tutorData.tutorwise || [])

      // Fetch student-wise
      const studentRes = await fetch("/api/admin/feedback?action=studentwise")
      const studentData = await studentRes.json()
      console.log("[v0] Studentwise response:", studentData)
      setStudentwise(studentData.studentwise || [])

      // Fetch question-wise analytics (10-question feedback)
      const questionRes = await fetch("/api/admin/feedback?action=questionwise")
      const questionData = await questionRes.json()
      console.log("[v0] Questionwise response:", questionData)
      setQuestionwise(questionData.questionwise || [])
    } catch (error) {
      console.error("Error fetching feedback data:", error)
      toast.error("Failed to load feedback data")
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceFilteredData = async () => {
    try {
      // Refetch tutor-wise data with attendance filter applied
      const tutorRes = await fetch(`/api/admin/feedback?action=tutorwise&attendanceThreshold=${attendanceThreshold}`)
      const tutorData = await tutorRes.json()
      console.log("[v0] Filtered tutorwise response:", tutorData)
      setTutorwise(tutorData.tutorwise || [])
      
      // Also refetch summary with attendance filter
      const summaryRes = await fetch(`/api/admin/feedback?action=summary&attendanceThreshold=${attendanceThreshold}`)
      const summaryData = await summaryRes.json()
      console.log("[v0] Filtered summary response:", summaryData)
      setSummary(summaryData.summary)
    } catch (error) {
      console.error("[v0] Error fetching attendance filtered data:", error)
    }
  }

  const showFeedbackDetails = async (tutorId: number, tutorName: string, subjectId: number, subjectName: string, feedbackCount: number) => {
    try {
      const url = `/api/admin/feedback?action=subjectfeedback&tutorId=${tutorId}&subjectId=${subjectId}`
      console.log("[v0] Fetching feedback details from:", url)
      const res = await fetch(url)
      
      if (!res.ok) {
        console.error("[v0] API response not ok:", res.status, res.statusText)
        const errorData = await res.json()
        console.error("[v0] Error details:", errorData)
        toast.error(`Failed to load feedback: ${errorData?.error || 'Unknown error'}`)
        return
      }
      
      const data = await res.json()
      console.log("[v0] Feedback details response:", data)
      setFeedbackDetails(data.feedbackDetails || [])
      setFeedbackModalData({
        tutorName,
        subjectName,
        feedbackCount
      })
      setFeedbackModalOpen(true)
    } catch (error) {
      console.error("Error fetching feedback details:", error)
      toast.error("Failed to load feedback details")
    }
  }

  const showQuestionAnalytics = async (tutorId: number, tutorName: string, subjectId: number, subjectName: string) => {
    try {
      setAnalyticsLoading(true)
      const url = `/api/admin/feedback/question-distribution?tutorId=${tutorId}&subjectId=${subjectId}&attendanceFilter=${attendanceThreshold}`
      console.log("[v0] Fetching question distribution from:", url, "with attendance:", attendanceThreshold)
      const res = await fetch(url)

      if (!res.ok) {
        console.error("[v0] API response not ok:", res.status, res.statusText)
        const errorData = await res.json()
        console.error("[v0] Error details:", errorData)
        toast.error(`Failed to load analytics: ${errorData?.error || 'Unknown error'}`)
        setAnalyticsLoading(false)
        return
      }

      const data = await res.json()
      console.log("[v0] Question distribution response:", data)
      
      if (data.success && data.distribution) {
        setAnalyticsData({
          tutorName,
          subjectName,
          distribution: data.distribution,
          totalResponses: data.totalResponses,
          tutorId,
          subjectId
        })
        setAnalyticsModalOpen(true)
      } else {
        toast.error("No question-wise feedback available")
      }
      setAnalyticsLoading(false)
    } catch (error) {
      console.error("Error fetching question analytics:", error)
      toast.error("Failed to load question analytics")
      setAnalyticsLoading(false)
    }
  }

  const handleStartFeedback = async () => {
    try {
      setManagingFeedback(true)
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          adminId: adminData?.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Feedback period started!")
        setSettings(data.settings)
      } else {
        toast.error("Failed to start feedback period")
      }
    } catch (error) {
      toast.error("Error starting feedback period")
    } finally {
      setManagingFeedback(false)
    }
  }

  const handleEndFeedback = async () => {
    try {
      setManagingFeedback(true)
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          adminId: adminData?.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Feedback period ended!")
        setSettings(data.settings)
      } else {
        toast.error("Failed to end feedback period")
      }
    } catch (error) {
      toast.error("Error ending feedback period")
    } finally {
      setManagingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading feedback analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tutor Feedback Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and analyze student feedback for tutors</p>
          </div>
          <div className="flex gap-2">
            {settings?.is_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={managingFeedback}>
                    End Feedback Period
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End Feedback Period?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disable feedback submission. Historical data will remain accessible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndFeedback}>End Period</AlertDialogAction>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={handleStartFeedback} disabled={managingFeedback}>
                Start Feedback Period
              </Button>
            )}
          </div>
        </div>

        {/* Feedback Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Feedback Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Status</p>
                <Badge className={settings?.is_active ? "bg-green-600" : "bg-gray-600"}>
                  {settings?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {settings?.started_at && (
                <p className="text-sm text-gray-500">
                  Started: {new Date(settings.started_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Eligible Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_eligible_students}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Feedback Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_submitted}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.completion_percentage}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Average Rating
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <p className="text-2xl font-bold">{Number(summary.overall_avg_rating || 0).toFixed(2)}</p>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics */}
        <Tabs defaultValue="tutorwise" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tutorwise">Tutor-wise Breakdown</TabsTrigger>
            <TabsTrigger value="questionwise">Question-wise Analytics</TabsTrigger>
            <TabsTrigger value="studentwise">Student Tracking</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Filter</TabsTrigger>
          </TabsList>

          {/* Tutor-wise Tab */}
          <TabsContent value="tutorwise">
            <Card>
              <CardHeader>
                <CardTitle>Tutor-wise Feedback Summary</CardTitle>
                <CardDescription>Click on tutor names to view subject-wise feedback details</CardDescription>
              </CardHeader>
              
              {/* Attendance Filter Slider */}
              <div className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-900">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Minimum Attendance Filter</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[attendanceThreshold]}
                        onValueChange={(value) => setAttendanceThreshold(value[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <div className="text-right min-w-16">
                        <Badge className="text-base font-semibold">
                          {attendanceThreshold}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {attendanceThreshold === 0 
                      ? "Showing feedback from all students" 
                      : `Showing feedback from students with ${attendanceThreshold}% or higher attendance`}
                  </p>
                </div>
              </div>
              
              <CardContent className="pt-6">
                {tutorwise.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No feedback data available</p>
                ) : (
                  <div className="space-y-4">
                    {tutorwise.map((tutor, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        {/* Tutor Header */}
                        <div className="bg-gray-100 dark:bg-gray-800 p-4">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedTutors)
                              if (newExpanded.has(tutor.id)) {
                                newExpanded.delete(tutor.id)
                              } else {
                                newExpanded.add(tutor.id)
                              }
                              setExpandedTutors(newExpanded)
                            }}
                            className="w-full text-left flex items-center justify-between hover:text-blue-600"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{expandedTutors.has(tutor.id) ? "▼" : "▶"}</span>
                              <span className="font-semibold text-lg">{tutor.name}</span>
                            </div>
                            {tutor.subjects && tutor.subjects.length > 0 && (
                              <div className="flex items-center gap-4 text-sm">
                                <span>
                                  Total Feedback: <span className="font-bold">{tutor.subjects.reduce((sum, s) => sum + (s.feedback_count || 0), 0)}</span>
                                </span>
                                <Badge variant="outline" className="text-base">
                                  {(tutor.subjects.reduce((sum, s) => sum + (parseFloat(s.average_rating) || 0), 0) / tutor.subjects.length).toFixed(2)} ⭐
                                </Badge>
                              </div>
                            )}
                          </button>
                        </div>
                        
                        {/* Subject Details - Expanded */}
                        {expandedTutors.has(tutor.id) && (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Subject</TableHead>
                                  <TableHead className="text-right">Feedback Count</TableHead>
                                  <TableHead className="text-right">Avg Rating</TableHead>
                                  <TableHead className="text-right">Positive (≥4)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tutor.subjects && tutor.subjects.length > 0 ? (
                                  tutor.subjects.map((subject, sIdx) => (
                                    <TableRow key={sIdx}>
                                      <TableCell className="font-medium">{subject.subject_name}</TableCell>
                                      <TableCell className="text-right">
                                        <button
                                          onClick={() => showFeedbackDetails(tutor.id, tutor.name, subject.subject_id, subject.subject_name, subject.feedback_count)}
                                          className="font-semibold hover:text-blue-600 cursor-pointer underline"
                                        >
                                          {subject.feedback_count}
                                        </button>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <button
                                          onClick={() => showQuestionAnalytics(tutor.id, tutor.name, subject.subject_id, subject.subject_name)}
                                          className="cursor-pointer hover:opacity-80 transition-opacity"
                                          disabled={analyticsLoading}
                                        >
                                          <Badge variant="outline" className="cursor-pointer hover:bg-blue-50">
                                            {subject.average_rating || "N/A"} ⭐
                                          </Badge>
                                        </button>
                                      </TableCell>
                                      <TableCell className="text-right text-green-600">
                                        {subject.positive_count || 0}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500">
                                      No subject data available
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Question-wise Analytics Tab */}
          <TabsContent value="questionwise">
            <QuestionWiseAnalytics data={questionwise} loading={loading} />
          </TabsContent>

          {/* Student-wise Tab */}
          <TabsContent value="studentwise">
            <Card>
              <CardHeader>
                <CardTitle>Student Feedback Tracking</CardTitle>
                <CardDescription>View feedback submission status by course and semester</CardDescription>
              </CardHeader>
              <CardContent>
                {studentwise.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No student data available</p>
                ) : (
                  <div className="space-y-4">
                    {studentwise.map((courseGroup, idx) => {
                      const key = `${courseGroup.course_id}-${courseGroup.semester}`
                      const isExpanded = expandedCourseSem.has(key)
                      
                      return (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          {/* Course/Semester Header */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedCourseSem)
                                if (newExpanded.has(key)) {
                                  newExpanded.delete(key)
                                } else {
                                  newExpanded.add(key)
                                }
                                setExpandedCourseSem(newExpanded)
                              }}
                              className="w-full text-left flex items-center justify-between hover:text-blue-600"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="font-semibold">{isExpanded ? "▼" : "▶"}</span>
                                <div>
                                  <p className="font-bold text-lg">{courseGroup.course_name} - Semester {courseGroup.semester}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <Badge className="bg-green-600 mr-2">{courseGroup.submitted_count} Submitted</Badge>
                                    <Badge className="bg-red-600">{courseGroup.not_submitted_count} Pending</Badge>
                                  </p>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Student List - Expanded */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Enrollment #</TableHead>
                                    <TableHead>Feedback Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {courseGroup.students && courseGroup.students.length > 0 ? (
                                    courseGroup.students.map((student, sIdx) => (
                                      <TableRow key={sIdx}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="font-mono text-sm">{student.enrollment_number}</TableCell>
                                        <TableCell>
                                          {student.feedback_submitted ? (
                                            <Badge className="bg-green-600">✓ Submitted</Badge>
                                          ) : (
                                            <Badge className="bg-red-600">✗ Pending</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center text-gray-500">
                                        No student data
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Filter Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance-based Feedback Filter</CardTitle>
                <CardDescription>Filter feedback results by minimum student attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Minimum Attendance Threshold</Label>
                    <span className="text-lg font-semibold text-blue-600">{attendanceThreshold}%</span>
                  </div>
                  <Slider
                    value={[attendanceThreshold]}
                    onValueChange={(value) => setAttendanceThreshold(value[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Showing feedback only from students with ≥{attendanceThreshold}% attendance
                  </p>
                </div>

                {attendanceFiltered.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data matching this attendance threshold</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-right">Attendance %</TableHead>
                          <TableHead className="text-right">Submitted</TableHead>
                          <TableHead>Tutors Rated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceFiltered.map((student, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                className={
                                  student.attendance_percentage >= 75
                                    ? "bg-green-600"
                                    : student.attendance_percentage >= 50
                                      ? "bg-yellow-600"
                                      : "bg-red-600"
                                }
                              >
                                {student.attendance_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{student.submitted_count}</TableCell>
                            <TableCell className="text-sm">
                              {student.tutors_rated?.length > 0
                                ? student.tutors_rated.join(", ")
                                : "None"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Question Analytics Modal */}
        {analyticsData && (
          <QuestionAnalyticsModal
            open={analyticsModalOpen}
            onOpenChange={setAnalyticsModalOpen}
            tutorName={analyticsData.tutorName}
            subjectName={analyticsData.subjectName}
            distribution={analyticsData.distribution}
            totalResponses={analyticsData.totalResponses}
            tutorId={analyticsData.tutorId}
            subjectId={analyticsData.subjectId}
            initialAttendanceFilter={attendanceThreshold}
          />
        )}

        {/* Feedback Details Modal */}
        {feedbackModalOpen && feedbackModalData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{feedbackModalData.tutorName}</CardTitle>
                    <CardDescription className="mt-1">Subject: {feedbackModalData.subjectName}</CardDescription>
                  </div>
                  <button
                    onClick={() => setFeedbackModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Total Feedback Entries: <span className="font-semibold text-lg">{feedbackDetails.length}</span>
                  </p>
                </div>
                
                {feedbackDetails.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Enrollment #</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                          <TableHead>Comments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbackDetails.map((detail, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{detail.name}</TableCell>
                            <TableCell className="font-mono text-sm">{detail.enrollment_number}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-base">
                                {detail.rating} ⭐
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {detail.comments || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No feedback details available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
