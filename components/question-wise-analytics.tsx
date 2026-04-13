"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const QUESTION_LABELS = [
  { key: "avg_q1_teaching_style", label: "Teaching Style" },
  { key: "avg_q2_overcome_challenges", label: "Overcoming Challenges" },
  { key: "avg_q3_learning_objectives", label: "Learning Objectives" },
  { key: "avg_q4_real_world_examples", label: "Real-World Examples" },
  { key: "avg_q5_measure_progress", label: "Progress Measurement" },
  { key: "avg_q6_approachability", label: "Approachability" },
  { key: "avg_q7_well_prepared", label: "Preparation Level" },
  { key: "avg_q8_concept_understanding", label: "Concept Understanding" },
  { key: "avg_q9_resources_helpful", label: "Resources Quality" },
  { key: "avg_q10_recommendation_nps", label: "Recommendation" },
]

interface QuestionWiseData {
  tutor_id: number
  tutor_name: string
  subject_id: number
  subject_name: string
  total_responses: number
  avg_overall_rating: number
  avg_q1_teaching_style: number
  avg_q2_overcome_challenges: number
  avg_q3_learning_objectives: number
  avg_q4_real_world_examples: number
  avg_q5_measure_progress: number
  avg_q6_approachability: number
  avg_q7_well_prepared: number
  avg_q8_concept_understanding: number
  avg_q9_resources_helpful: number
  avg_q10_recommendation_nps: number
}

interface QuestionWiseAnalyticsProps {
  data: QuestionWiseData[]
  loading?: boolean
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  if (rating >= 4) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  if (rating >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  if (rating >= 2) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
}

export function QuestionWiseAnalytics({ data, loading }: QuestionWiseAnalyticsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question-Wise Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question-Wise Analytics</CardTitle>
          <CardDescription>Detailed ratings for each of the 10 feedback questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No question-wise feedback data available yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question-Wise Analytics</CardTitle>
        <CardDescription>Average ratings for each feedback question by tutor and subject</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Overall Summary by Tutor */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tutor Summary</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(new Map(data.map((d) => [d.tutor_id, d])).values()).map((tutor) => {
                const tutorData = data.filter((d) => d.tutor_id === tutor.tutor_id)
                const avgOverallRating =
                  tutorData.reduce((sum, d) => sum + d.avg_overall_rating, 0) / tutorData.length

                return (
                  <Card key={tutor.tutor_id} className="border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {tutor.tutor_name}
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {avgOverallRating.toFixed(2)} ⭐
                          </p>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <p>Total Subjects: {tutorData.length}</p>
                          <p>Total Responses: {tutorData.reduce((sum, d) => sum + d.total_responses, 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Detailed Question Ratings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Question Ratings by Tutor & Subject</h3>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Tutor</TableHead>
                    <TableHead className="min-w-[120px]">Subject</TableHead>
                    <TableHead className="text-center">Responses</TableHead>
                    <TableHead className="text-center">Overall</TableHead>
                    {QUESTION_LABELS.map((q) => (
                      <TableHead key={q.key} className="text-center min-w-[80px]">
                        <span title={q.label} className="text-xs">
                          Q{QUESTION_LABELS.indexOf(q) + 1}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <TableCell className="font-medium">{item.tutor_name}</TableCell>
                      <TableCell>{item.subject_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.total_responses}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getRatingColor(item.avg_overall_rating)}>
                          {item.avg_overall_rating.toFixed(2)}
                        </Badge>
                      </TableCell>
                      {QUESTION_LABELS.map((q) => (
                        <TableCell key={q.key} className="text-center">
                          <Badge className={getRatingColor(item[q.key as keyof QuestionWiseData] as number)}>
                            {(item[q.key as keyof QuestionWiseData] as number)?.toFixed(1) || "-"}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Question Legend */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 text-sm">Question Legend</h4>
            <div className="grid gap-2 md:grid-cols-2 text-xs">
              {QUESTION_LABELS.map((q, idx) => (
                <div key={q.key} className="flex gap-2">
                  <span className="font-semibold text-blue-600 min-w-[30px]">Q{idx + 1}:</span>
                  <span className="text-gray-600 dark:text-gray-400">{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating Scale Info */}
          <div className="pt-4 border-t bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs font-semibold mb-2">Rating Scale:</p>
            <div className="flex gap-2 flex-wrap text-xs">
              <Badge className="bg-red-100 text-red-800">1 = Poor</Badge>
              <Badge className="bg-orange-100 text-orange-800">2 = Fair</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">3 = Good</Badge>
              <Badge className="bg-blue-100 text-blue-800">4 = Very Good</Badge>
              <Badge className="bg-green-100 text-green-800">5 = Excellent</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
