"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { toast } from "sonner"

interface FeedbackQuestions {
  q1_teaching_style: number
  q2_overcome_challenges: number
  q3_learning_objectives: number
  q4_real_world_examples: number
  q5_measure_progress: number
  q6_approachability: number
  q7_well_prepared: number
  q8_concept_understanding: number
  q9_resources_helpful: number
  q10_recommendation_nps: number
}

interface StudentFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  pending: Array<{
    id: number
    name: string
    tutor_id: number
    tutor_name: string
  }>
  submitted?: Array<{
    id: number
    subject_id: number
    tutor_id: number
  }>
  onSubmitSuccess: () => void
}

const FEEDBACK_QUESTIONS = [
  {
    key: "q1_teaching_style",
    label: "Does the teacher come well prepared for the topic in the class?",
  },
  {
    key: "q2_overcome_challenges",
    label: "Can the teacher communicate well in the class?",
  },
  {
    key: "q3_learning_objectives",
    label: " Does the teacher make the class interactive with the students?",
  },
  {
    key: "q4_real_world_examples",
    label: "Is the teacher able to solve your problems, queries, difficulties in the class?",
  },
  {
    key: "q5_measure_progress",
    label: " What is the discipline level maintained in your class when the teacher teaches in classs?",
  },
  {
    key: "q6_approachability",
    label: "Does the teacher make you aware of practical applications of the topic taught in real life or in relevant industry?",
  },
  {
    key: "q7_well_prepared",
    label: "How does the teacher plan the topic completion?",
  },
  {
    key: "q8_concept_understanding",
    label: "Does the teacher give relevant material to refer to for the topic either on net or suggest books?",
  },
  {
    key: "q9_resources_helpful",
    label: "16. Do you recommend the management to continue the teacher for further teaching of your subjects?",
  },
  {
    key: "q10_recommendation_nps",
    label: "Does the teacher make the class interactive with the students?",
  },
]

export function StudentFeedbackModal({
  open,
  onOpenChange,
  studentId,
  pending,
  submitted = [],
  onSubmitSuccess,
}: StudentFeedbackModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [ratings, setRatings] = useState<Partial<FeedbackQuestions>>({})
  const [hoverRating, setHoverRating] = useState<{ question: string; value: number }>({ question: "", value: 0 })
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Calculate overall rating from all questions
  const calculateOverallRating = () => {
    const values = Object.values(ratings).filter((v) => v > 0)
    if (values.length === 0) return 0
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
  }

  const overallRating = calculateOverallRating()

  const handleSubmit = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject")
      return
    }

    // Check if all 10 questions are answered
    const answeredQuestions = Object.values(ratings).filter((v) => v > 0).length
    if (answeredQuestions < 10) {
      toast.error(`Please answer all 10 questions (answered: ${answeredQuestions}/10)`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          tutorId: selectedSubject.tutor_id,
          subjectId: selectedSubject.id,
          ...ratings,
          overall_rating: parseFloat(overallRating),
          comments,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Feedback submitted successfully!")
        setSelectedSubject(null)
        setRatings({})
        setComments("")

        // Refetch pending feedback to update the list
        await onSubmitSuccess()

        // Check if there are still pending subjects after submission
        // The onSubmitSuccess will refetch pending feedback
        // So we'll let the parent component decide whether to close based on remaining pending subjects
      } else {
        toast.error(data.error || "Failed to submit feedback")
      }
    } catch (error) {
      toast.error("Error submitting feedback")
    } finally {
      setSubmitting(false)
    }
  }

  if (pending.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutor Feedback</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-gray-500">No pending feedback required at this time.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const answeredQuestions = Object.values(ratings).filter((v) => v > 0).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Structured Tutor Feedback (10 Questions)</DialogTitle>
          <DialogDescription>
            Please rate your tutoring experience on a scale of 1 (Poor) to 5 (Excellent)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subject Selection */}
          <div>
            <Label className="text-base font-semibold">Select Subject</Label>
            <div className="grid gap-2 mt-3">
              {pending.map((subject) => {
                const isSubmitted = submitted.some(
                  (s) => s.subject_id === subject.id && s.tutor_id === subject.tutor_id
                )
                return (
                  <Card
                    key={subject.id}
                    className={`p-3 transition-all ${isSubmitted
                      ? "border-gray-300 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                      : selectedSubject?.id === subject.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 cursor-pointer"
                        : "hover:border-gray-300 cursor-pointer"
                      }`}
                    onClick={() => !isSubmitted && setSelectedSubject(subject)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{subject.name}</p>
                        <p className="text-xs text-gray-500">Tutor: {subject.tutor_name}</p>
                      </div>
                      {isSubmitted && (
                        <Badge variant="secondary" className="ml-2 bg-green-600 text-white">
                          ✓ Given
                        </Badge>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* 10 Questions Form */}
          {selectedSubject && (
            <>
              {/* Overall Rating Display */}
              {answeredQuestions > 0 && (
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Overall Rating (Average)
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {overallRating} <span className="text-lg">⭐</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Progress: {answeredQuestions}/10
                      </p>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${(answeredQuestions / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Questions */}
              <div className="space-y-5">
                {FEEDBACK_QUESTIONS.map((question, idx) => (
                  <div key={question.key} className="space-y-2 pb-4 border-b last:border-b-0">
                    <div className="flex items-start justify-between">
                      <Label className="text-sm font-medium leading-relaxed">
                        <span className="inline-block mr-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs font-bold">
                          Q{idx + 1}
                        </span>
                        {question.label}
                      </Label>
                      {ratings[question.key as keyof FeedbackQuestions] > 0 && (
                        <Badge variant="secondary">
                          {ratings[question.key as keyof FeedbackQuestions]}/5
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            setRatings({
                              ...ratings,
                              [question.key]: star,
                            })
                          }
                          onMouseEnter={() =>
                            setHoverRating({ question: question.key, value: star })
                          }
                          onMouseLeave={() => setHoverRating({ question: "", value: 0 })}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={24}
                            className={`${star <=
                              (hoverRating.question === question.key
                                ? hoverRating.value
                                : ratings[question.key as keyof FeedbackQuestions] || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments */}
              <div>
                <Label className="text-base font-semibold">Additional Comments (Optional)</Label>
                <Textarea
                  placeholder="Share any additional feedback or suggestions..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="space-x-2">
            {answeredQuestions > 0 && answeredQuestions < 10 && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Please answer all 10 questions
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedSubject || answeredQuestions < 10}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? "Submitting..." : `Submit Feedback (${answeredQuestions}/10)`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
