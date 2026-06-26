ALTER TABLE properties
  ADD COLUMN video_url VARCHAR(500) NULL AFTER image,
  ADD COLUMN virtual_tour_url VARCHAR(500) NULL AFTER video_url,
  ADD COLUMN floor_plan_url VARCHAR(500) NULL AFTER virtual_tour_url;
