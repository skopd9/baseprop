-- Check what's in user_current_nutrition_targets for our test user
SELECT 
  u.whatsapp_number,
  c.created_at,
  c.updated_at,
  c.effective_from,
  c.target_calories,
  c.target_protein_g,
  c.target_fiber_g,
  c.target_iron_mg,
  c.target_vitamin_c_mg,
  c.target_vitamin_d_mcg
FROM user_current_nutrition_targets c
JOIN users u ON c.user_id = u.user_id
WHERE u.whatsapp_number = 'final_test_user';

-- Also check if there are multiple history rows
SELECT 
  COUNT(*) as history_count,
  MIN(created_at) as first_entry,
  MAX(created_at) as last_entry
FROM user_nutrition_targets_history h
JOIN users u ON h.user_id = WHERE u.whatsapp_number = 'final_test_user';
