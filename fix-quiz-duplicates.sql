-- First, see how many brand quiz questions have accumulated
SELECT COUNT(*) as total_brand_questions FROM trivia_questions WHERE category = 'brand';

-- Delete ALL brand quiz questions (the API route will regenerate clean ones on next visit)
DELETE FROM trivia_questions WHERE category = 'brand';

-- Verify cleanup
SELECT COUNT(*) as remaining FROM trivia_questions WHERE category = 'brand';
