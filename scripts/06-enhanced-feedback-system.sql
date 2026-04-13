-- Enhanced Tutor Feedback System with 10-Question Rating Form
-- This adds support for structured feedback with 10 specific questions

-- Create table for storing 10-question feedback responses
CREATE TABLE IF NOT EXISTS tutor_feedback_questions (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    tutor_id INT NOT NULL,
    subject_id INT NOT NULL,
    
    -- 10 Questions with ratings (1-5 scale)
    q1_teaching_style INT CHECK (q1_teaching_style >= 1 AND q1_teaching_style <= 5),
    q2_overcome_challenges INT CHECK (q2_overcome_challenges >= 1 AND q2_overcome_challenges <= 5),
    q3_learning_objectives INT CHECK (q3_learning_objectives >= 1 AND q3_learning_objectives <= 5),
    q4_real_world_examples INT CHECK (q4_real_world_examples >= 1 AND q4_real_world_examples <= 5),
    q5_measure_progress INT CHECK (q5_measure_progress >= 1 AND q5_measure_progress <= 5),
    q6_approachability INT CHECK (q6_approachability >= 1 AND q6_approachability <= 5),
    q7_well_prepared INT CHECK (q7_well_prepared >= 1 AND q7_well_prepared <= 5),
    q8_concept_understanding INT CHECK (q8_concept_understanding >= 1 AND q8_concept_understanding <= 5),
    q9_resources_helpful INT CHECK (q9_resources_helpful >= 1 AND q9_resources_helpful <= 5),
    q10_recommendation_nps INT CHECK (q10_recommendation_nps >= 1 AND q10_recommendation_nps <= 5),
    
    -- Overall rating (calculated from average of 10 questions)
    overall_rating DECIMAL(3, 2),
    
    -- Open-ended comment
    comments TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one feedback per student-tutor-subject combination
    UNIQUE(student_id, tutor_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_questions_student ON tutor_feedback_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_tutor ON tutor_feedback_questions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_subject ON tutor_feedback_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_submitted ON tutor_feedback_questions(submitted_at);

-- Create view for question-wise analytics
CREATE OR REPLACE VIEW feedback_questions_summary AS
SELECT 
    tf.tutor_id,
    t.name as tutor_name,
    s.name as subject_name,
    COUNT(DISTINCT tf.student_id) as total_responses,
    ROUND(AVG(tf.overall_rating)::numeric, 2) as avg_overall_rating,
    ROUND(AVG(tf.q1_teaching_style)::numeric, 2) as avg_q1_teaching_style,
    ROUND(AVG(tf.q2_overcome_challenges)::numeric, 2) as avg_q2_overcome_challenges,
    ROUND(AVG(tf.q3_learning_objectives)::numeric, 2) as avg_q3_learning_objectives,
    ROUND(AVG(tf.q4_real_world_examples)::numeric, 2) as avg_q4_real_world_examples,
    ROUND(AVG(tf.q5_measure_progress)::numeric, 2) as avg_q5_measure_progress,
    ROUND(AVG(tf.q6_approachability)::numeric, 2) as avg_q6_approachability,
    ROUND(AVG(tf.q7_well_prepared)::numeric, 2) as avg_q7_well_prepared,
    ROUND(AVG(tf.q8_concept_understanding)::numeric, 2) as avg_q8_concept_understanding,
    ROUND(AVG(tf.q9_resources_helpful)::numeric, 2) as avg_q9_resources_helpful,
    ROUND(AVG(tf.q10_recommendation_nps)::numeric, 2) as avg_q10_recommendation_nps
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY tf.tutor_id, t.name, s.name;

-- Create view for identifying areas of improvement
CREATE OR REPLACE VIEW feedback_improvement_areas AS
SELECT 
    t.name as tutor_name,
    s.name as subject_name,
    'Teaching Style' as question_area,
    ROUND(AVG(tf.q1_teaching_style)::numeric, 2) as avg_rating,
    COUNT(*) as response_count
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Overcoming Challenges',
    ROUND(AVG(tf.q2_overcome_challenges)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Learning Objectives Clarity',
    ROUND(AVG(tf.q3_learning_objectives)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Real-World Examples',
    ROUND(AVG(tf.q4_real_world_examples)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Progress Measurement',
    ROUND(AVG(tf.q5_measure_progress)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Approachability',
    ROUND(AVG(tf.q6_approachability)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Preparation Level',
    ROUND(AVG(tf.q7_well_prepared)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Concept Understanding',
    ROUND(AVG(tf.q8_concept_understanding)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Resources Quality',
    ROUND(AVG(tf.q9_resources_helpful)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name
UNION ALL
SELECT 
    t.name,
    s.name,
    'Recommendation Likelihood',
    ROUND(AVG(tf.q10_recommendation_nps)::numeric, 2),
    COUNT(*)
FROM tutor_feedback_questions tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY t.name, s.name;
