"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

interface QuestionAnalyticsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tutorName: string
  subjectName: string
  distribution: Array<{
    id: string
    label: string
    ratings: Record<number, number>
    total: number
  }>
  totalResponses: number
  tutorId?: number
  subjectId?: number
  initialAttendanceFilter?: number
}

export function QuestionAnalyticsModal({
  open,
  onOpenChange,
  tutorName,
  subjectName,
  distribution,
  totalResponses,
  tutorId,
  subjectId,
  initialAttendanceFilter = 0
}: QuestionAnalyticsModalProps) {
  const [attendanceFilter, setAttendanceFilter] = useState([initialAttendanceFilter])
  const [filteredDistribution, setFilteredDistribution] = useState(distribution)
  const [filteredResponses, setFilteredResponses] = useState(totalResponses)
  const [isLoading, setIsLoading] = useState(false)

  const handleAttendanceChange = async (value: number[]) => {
    const filterValue = value[0]
    setAttendanceFilter(value)
    setIsLoading(true)

    try {
      const url = `/api/admin/feedback/question-distribution?tutorId=${tutorId}&subjectId=${subjectId}&attendanceFilter=${filterValue}`
      console.log("[v0] Fetching filtered data with attendance:", filterValue)
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log("[v0] Filtered distribution received:", data)
          setFilteredDistribution(data.distribution || distribution)
          setFilteredResponses(data.totalResponses || totalResponses)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching filtered distribution:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (count: number) => {
    return "⭐".repeat(count)
  }

  const getQuestionNumber = (id: string) => {
    const match = id.match(/q(\d+)/)
    return match ? match[1] : "?"
  }

  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) return 0
    return Math.round((count / total) * 100)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Question-wise Feedback Analysis</DialogTitle>
          <div className="text-sm text-gray-500 mt-2">
            <p className="font-medium">{tutorName} - {subjectName}</p>
            <p>Total Responses: {filteredResponses}</p>
          </div>
        </DialogHeader>

        {/* Attendance Filter Slider */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Minimum Attendance Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Slider
                  value={attendanceFilter}
                  onValueChange={handleAttendanceChange}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isLoading}
                  className="flex-1"
                />
                <div className="text-right min-w-16">
                  <Badge className="text-base font-semibold">
                    {attendanceFilter[0]}%
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {attendanceFilter[0] === 0 
                  ? "Showing feedback from all students" 
                  : `Showing feedback from students with ${attendanceFilter[0]}% or higher attendance`}
              </p>
              {isLoading && (
                <p className="text-xs text-blue-500 animate-pulse">Updating analytics...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 py-4">
          {filteredDistribution.map((question) => (
            <Card key={question.id} className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Question {getQuestionNumber(question.id)}: {question.label}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Total responses for this question: {question.total}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = question.ratings[rating] || 0
                    const percentage = calculatePercentage(count, question.total)
                    const maxCount = Math.max(...Object.values(question.ratings))

                    return (
                      <div key={rating} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-24">
                          <span className="text-sm font-medium text-yellow-500">
                            {renderStars(rating)}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full flex items-center justify-center transition-all"
                                style={{
                                  width: maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%"
                                }}
                              >
                                {count > 0 && (
                                  <span className="text-xs font-semibold text-white px-2">
                                    {count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right w-20">
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {count} {count === 1 ? "student" : "students"}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {percentage}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
