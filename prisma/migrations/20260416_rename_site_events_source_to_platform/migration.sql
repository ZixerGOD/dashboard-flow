ALTER TABLE site_events RENAME COLUMN source TO platform;

UPDATE site_events
SET platform = UPPER(platform)
WHERE platform IS NOT NULL;
