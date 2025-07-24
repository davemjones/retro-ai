-- Seed default templates for all deployments
-- This migration ensures templates are available in all environments without manual seeding

-- Insert default templates
INSERT INTO "Template" (id, name, description, columns, "isDefault", "createdAt")
VALUES 
  (
    gen_random_uuid(),
    'Start/Stop/Continue',
    'Classic retrospective format to identify what to start doing, stop doing, and continue doing',
    '[
      {"title": "Start", "order": 0, "color": "#10B981"},
      {"title": "Stop", "order": 1, "color": "#EF4444"},
      {"title": "Continue", "order": 2, "color": "#3B82F6"}
    ]'::jsonb,
    true,
    NOW()
  ),
  (
    gen_random_uuid(),
    'Mad/Sad/Glad',
    'Emotional retrospective to express feelings about the sprint',
    '[
      {"title": "Mad", "order": 0, "color": "#EF4444"},
      {"title": "Sad", "order": 1, "color": "#F59E0B"},
      {"title": "Glad", "order": 2, "color": "#10B981"}
    ]'::jsonb,
    true,
    NOW()
  ),
  (
    gen_random_uuid(),
    '4Ls',
    'Reflect on what you Liked, Learned, Lacked, and Longed For',
    '[
      {"title": "Liked", "order": 0, "color": "#10B981"},
      {"title": "Learned", "order": 1, "color": "#3B82F6"},
      {"title": "Lacked", "order": 2, "color": "#F59E0B"},
      {"title": "Longed For", "order": 3, "color": "#8B5CF6"}
    ]'::jsonb,
    true,
    NOW()
  )
ON CONFLICT (name) DO NOTHING;