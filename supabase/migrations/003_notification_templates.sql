-- Editable email/SMS notification templates (owner-managed from /admin)
CREATE TABLE IF NOT EXISTS notification_templates (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed defaults from current Apple-clean English copy (do not overwrite edits)
INSERT INTO notification_templates (key, value) VALUES
  ('email_pro_subject', 'New booking · {{ref}} · {{service}}'),
  ('email_pro_headline', 'New booking'),
  ('email_pro_intro', E'A client just requested an appointment with you.\n\n{{clientName}} · {{clientPhone}} · {{when}} (Houston)'),
  ('email_pro_footer', 'Questions? Reply to this email or WhatsApp your professional.'),
  ('email_owner_subject', 'Booking · {{ref}} · {{professionalName}}'),
  ('email_owner_headline', 'Marketplace booking'),
  ('email_owner_intro', E'New booking on Anak.Studio.\n\n{{professionalName}} with {{clientName}}'),
  ('email_owner_footer', 'Questions? Reply to this email or WhatsApp your professional.'),
  ('email_client_subject', 'You''re booked · {{service}}'),
  ('email_client_headline', 'Request received'),
  ('email_client_intro', E'Thanks — your booking request is in.\n\nHi {{clientName}}, your professional will confirm soon.'),
  ('email_client_footer', 'Questions? Reply to this email or WhatsApp your professional.'),
  ('sms_pro', 'New booking — Anak.Studio {{ref}}: {{service}} · {{when}} Houston · {{place}} · {{price}} · {{clientName}}'),
  ('sms_client', 'Hi {{clientName}}, your Anak.Studio appointment is confirmed. {{service}} on {{when}} (Houston time). See you there!')
ON CONFLICT (key) DO NOTHING;
