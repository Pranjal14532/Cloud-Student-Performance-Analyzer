import app from "./app.js";
import { pool } from "./config/db.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const port = Number(process.env.PORT || 4000);
async function waitForDatabase(attempt = 1) {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    if (attempt >= 30) throw error;
    await new Promise(resolve => setTimeout(resolve, 2000));
    return waitForDatabase(attempt + 1);
  }
}
await waitForDatabase();
const [tables] = await pool.query("SHOW TABLES");
if (tables.length === 0) {
  const migration = fs.readFileSync(path.resolve("migrations/001_init.sql"), "utf8");
  for (const statement of migration.split(";").map(s => s.trim()).filter(Boolean)) await pool.query(statement);
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12);
  await pool.execute("INSERT IGNORE INTO users (username,password_hash,role) VALUES (?, ?, 'admin')", [process.env.ADMIN_USERNAME || "admin", adminPassword]);
  const demo = [
    ["STU-001","Aarav Mehta","aarav@example.com","aarav"],
    ["STU-002","Mira Patel","mira@example.com","mira"],
    ["STU-003","Kabir Rao","kabir@example.com","kabir"],
    ["STU-004","Isha Nair","isha@example.com","isha"]
  ];
  const results = {
    "STU-001":[["Semester 1","Mathematics",84],["Semester 1","Cloud Computing",91],["Semester 1","Database Systems",78],["Semester 2","Mathematics",89],["Semester 2","Cloud Computing",94],["Semester 2","Database Systems",86]],
    "STU-002":[["Semester 1","Mathematics",87],["Semester 1","Cloud Computing",95],["Semester 1","Database Systems",82],["Semester 2","Mathematics",91],["Semester 2","Cloud Computing",92],["Semester 2","Database Systems",89]],
    "STU-003":[["Semester 1","Mathematics",72],["Semester 1","Cloud Computing",83],["Semester 1","Database Systems",79],["Semester 2","Mathematics",80],["Semester 2","Cloud Computing",88],["Semester 2","Database Systems",84]],
    "STU-004":[["Semester 1","Mathematics",93],["Semester 1","Cloud Computing",90],["Semester 1","Database Systems",96],["Semester 2","Mathematics",95],["Semester 2","Cloud Computing",94],["Semester 2","Database Systems",98]]
  };
  for (const [roll,name,email,username] of demo) {
    const [insert] = await pool.execute("INSERT IGNORE INTO students (roll_no,name,email) VALUES (?,?,?)", [roll,name,email]);
    let studentId;
    if (insert.insertId) studentId = insert.insertId;
    else {
      const [found] = await pool.execute("SELECT id FROM students WHERE roll_no=?", [roll]);
      studentId = found[0]?.id;
    }
    await pool.execute("INSERT IGNORE INTO users (username,password_hash,role,student_id) VALUES (?,?, 'student',?)", [username, await bcrypt.hash("student123",12), studentId]);
    for (const [semester,subject,score] of results[roll]) await pool.execute("INSERT IGNORE INTO marks (student_id,semester,subject,marks,max_marks) VALUES (?,?,?,?,100)", [studentId,semester,subject,score]);
  }
}
app.listen(port, "0.0.0.0", () => console.log(`API listening on port ${port}`));
