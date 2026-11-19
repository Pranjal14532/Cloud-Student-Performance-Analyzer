-- Optional demo seed matching the original application's clearly identified demo accounts.
-- Run against a new database only; existing records are preserved with INSERT IGNORE.
INSERT IGNORE INTO students (roll_no,name,email) VALUES
  ('STU-001','Aarav Mehta','aarav@example.com'),
  ('STU-002','Mira Patel','mira@example.com'),
  ('STU-003','Kabir Rao','kabir@example.com'),
  ('STU-004','Isha Nair','isha@example.com');
