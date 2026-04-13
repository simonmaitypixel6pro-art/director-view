# Enhanced 10-Question Tutor Feedback System

## Overview

The tutor feedback system has been enhanced to include a structured 10-question rating form with advanced analytics. Each question is rated on a 1-5 scale, and an overall rating is calculated as the average of all 10 questions.

## Student Feedback Form

### 10 Structured Questions

Students are presented with the following 10 questions, each rated on a 1-5 scale (1 = Poor, 5 = Excellent):

1. **Teaching Style**: "What is your teaching style and how do you tailor it to my learning pace?"
2. **Overcoming Challenges**: "How do you help me overcome fear or frustration with challenging subjects?"
3. **Learning Objectives**: "Are my current learning objectives clear and being met?"
4. **Real-World Examples**: "Do you use real-world examples to make the material more engaging?"
5. **Progress Measurement**: "How do you measure my progress throughout our sessions?"
6. **Approachability**: "Are you approachable for questions and clarifications?"
7. **Preparation Level**: "Are you well prepared for our sessions?"
8. **Concept Understanding**: "How do you ensure I understand a concept before moving on?"
9. **Resources Quality**: "Are the resources/materials (notes, slides, etc.) used in our sessions helpful?"
10. **Recommendation (NPS)**: "How likely are you to recommend these tutoring sessions to others?"

### Features

- **Real-time Overall Rating Calculation**: As students rate each question, the overall rating (average of all 10) is displayed and updated in real-time
- **Progress Indicator**: Visual progress bar shows how many questions have been answered (e.g., "5/10")
- **Color-coded Stars**: Yellow stars indicate selected ratings, gray stars indicate unrated questions
- **Mandatory All Questions**: Students must answer all 10 questions before submission is enabled
- **Optional Comments**: An optional text field for open-ended feedback

## Database Schema

### New Table: `tutor_feedback_questions`

Stores all 10-question feedback responses with the following columns:

```sql
- id (PRIMARY KEY)
- student_id (FK to students)
- tutor_id (FK to tutors)
- subject_id (FK to subjects)
- q1_teaching_style to q10_recommendation_nps (INT, 1-5)
- overall_rating (DECIMAL, calculated average)
- comments (TEXT, optional)
- submitted_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### New Views

1. **feedback_questions_summary**: Aggregates question-wise ratings by tutor and subject
2. **feedback_improvement_areas**: Breaks down average ratings by question area for identifying improvement opportunities

## Admin Dashboard Features

### Three Analytics Tabs

1. **Tutor-wise Breakdown**: Legacy view showing overall feedback by tutor and subject
2. **Question-wise Analytics**: NEW - Detailed breakdown of ratings for each of the 10 questions
3. **Student Tracking**: View submission status by course and semester
4. **Attendance Filter**: Filter feedback by student attendance percentage

### Question-wise Analytics Tab

Displays:

- **Tutor Summary Cards**: Overall average rating per tutor with total subjects and responses
- **Detailed Question Rating Table**: 
  - Shows average rating for each question by tutor and subject
  - Color-coded badges: Green (4.5+), Blue (4-4.5), Yellow (3-4), Orange (2-3), Red (<2)
  - 10 columns for each question rating
  - Response count for each tutor-subject pair

- **Question Legend**: Quick reference for what each question represents
- **Rating Scale Reference**: Visual guide for rating meanings (1 = Poor to 5 = Excellent)

## API Endpoints

### Student Feedback Submission

**POST /api/feedback**

Supports both legacy single-rating and new 10-question format:

```json
{
  "studentId": 1,
  "tutorId": 5,
  "subjectId": 10,
  "q1_teaching_style": 4,
  "q2_overcome_challenges": 5,
  "q3_learning_objectives": 4,
  "q4_real_world_examples": 5,
  "q5_measure_progress": 4,
  "q6_approachability": 5,
  "q7_well_prepared": 4,
  "q8_concept_understanding": 4,
  "q9_resources_helpful": 5,
  "q10_recommendation_nps": 5,
  "overall_rating": 4.4,
  "comments": "Excellent tutoring!"
}
```

### Admin Analytics

**GET /api/admin/feedback?action=questionwise**

Returns question-wise analytics data grouped by tutor and subject with average ratings for each question.

## Components

### StudentFeedbackModal (`components/student-feedback-modal.tsx`)

Enhanced modal component that:
- Displays the 10-question form
- Calculates and displays overall rating in real-time
- Shows progress indicator
- Prevents submission until all questions are answered
- Supports optional comments

### QuestionWiseAnalytics (`components/question-wise-analytics.tsx`)

Admin dashboard component that:
- Displays tutor summary cards with overall ratings
- Shows detailed question ratings in a table
- Provides question legend and rating scale reference
- Color-codes ratings for quick visual assessment

## Migration Script

**scripts/06-enhanced-feedback-system.sql**

Creates:
1. `tutor_feedback_questions` table with 10 question columns
2. Indexes for performance optimization
3. Two views for analytics queries

Run this script to enable the enhanced feedback system.

## Backward Compatibility

The system supports both:
- **Legacy format**: Single overall rating (stored in `tutor_feedback` table)
- **New format**: 10-question structured feedback (stored in `tutor_feedback_questions` table)

The API automatically detects which format is being used based on the presence of question fields.

## Rating Scale Reference

- **5 - Excellent**: Outstanding performance, exceeds expectations
- **4 - Very Good**: Strong performance, meets expectations well
- **3 - Good**: Adequate performance, meets basic expectations
- **2 - Fair**: Below expectations, needs improvement
- **1 - Poor**: Significantly below expectations, major concerns

## Improvement Insights

The `feedback_improvement_areas` view helps identify:
- Questions with consistently low ratings
- Areas where specific tutors need development
- Subject areas with feedback concerns

Query the view to identify actionable improvement areas for tutor training and development.
