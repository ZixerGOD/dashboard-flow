ALTER TABLE site_events
ADD COLUMN IF NOT EXISTS utm_id varchar(255);
