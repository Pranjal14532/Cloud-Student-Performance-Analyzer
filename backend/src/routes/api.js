import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { pool } from "../config/db.js";
import { auth, admin } from "../middleware/auth.js";
import { analyzeStudent, percentage } from "../utils/analytics.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 8 * 60 * 60 * 1000, path: "/" };
}
function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role, studentId: user.student_id }, process.env.JWT_SECRET || "development-jwt-secret-change-me", { expiresIn: "8h" });
}

router.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = z.object({ username: z.string().trim().min(1), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Username and password are required" });
    const [rows] = await pool.execute("SELECT id, username, password_hash, role, student_id FROM users WHERE username = ? LIMIT 1", [parsed.data.username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ message: "Invalid username or password" });
    res.cookie("token", tokenFor(user), cookieOptions()).json({ user: { id: user.id, username: user.username, role: user.role, studentId: user.student_id } });
  } catch (error) { next(error); }
});
router.post("/auth/logout", auth, (_req, res) => res.clearCookie("token", { path: "/" }).json({ message: "Logged out" }));
router.get("/auth/me", auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, username, role, student_id FROM users WHERE id = ?", [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json({ user: rows[0] });
  } catch (error) { next(error); }
});

router.get("/dashboard", auth, admin, async (req, res, next) => {
  try {
    const [[counts]] = await pool.query("SELECT (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(DISTINCT subject) FROM marks) AS subjects, (SELECT COUNT(*) FROM marks) AS marks");
    const [[averageRow]] = await pool.query("SELECT COALESCE(AVG(marks/max_marks*100),0) AS average FROM marks");
    const [subjectRows] = await pool.query("SELECT subject, AVG(marks/max_marks*100) AS average FROM marks GROUP BY subject ORDER BY subject");
    const [semesterRows] = await pool.query("SELECT semester, AVG(marks/max_marks*100) AS average FROM marks GROUP BY semester");
    const [studentRows] = await pool.query("SELECT s.id,s.name,s.roll_no, AVG(m.marks/m.max_marks*100) AS average FROM students s JOIN marks m ON m.student_id=s.id GROUP BY s.id,s.name,s.roll_no ORDER BY average DESC");
    const [recent] = await pool.query("SELECT m.id,m.subject,m.semester,m.marks,m.max_marks,s.name,s.roll_no FROM marks m JOIN students s ON s.id=m.student_id ORDER BY m.id DESC LIMIT 8");
    const [distribution] = await pool.query("SELECT CASE WHEN marks/max_marks*100>=85 THEN 'Excellent' WHEN marks/max_marks*100>=70 THEN 'Good' WHEN marks/max_marks*100>=50 THEN 'Average' ELSE 'Needs Improvement' END AS label, COUNT(*) AS count FROM marks GROUP BY label");
    const [passFail] = await pool.query("SELECT subject, SUM(CASE WHEN marks/max_marks>=0.5 THEN 1 ELSE 0 END) AS passed, SUM(CASE WHEN marks/max_marks<0.5 THEN 1 ELSE 0 END) AS failed FROM marks GROUP BY subject");
    const attention = studentRows.filter(row => Number(row.average) < 50);
    res.json({
      counts: { ...counts, overallAverage: Number(Number(averageRow.average).toFixed(1)), attentionCount: attention.length },
      highest: studentRows[0] ? { name: studentRows[0].name, average: Number(Number(studentRows[0].average).toFixed(1)) } : null,
      lowest: studentRows.at(-1) ? { name: studentRows.at(-1).name, average: Number(Number(studentRows.at(-1).average).toFixed(1)) } : null,
      subjectAverages: subjectRows.map(r => ({ subject: r.subject, average: Number(Number(r.average).toFixed(1)) })),
      semesterAverages: semesterRows.map(r => ({ semester: r.semester, average: Number(Number(r.average).toFixed(1)) })),
      topStudents: studentRows.slice(0, 5).map(r => ({ name: r.name, average: Number(Number(r.average).toFixed(1)) })),
      needsImprovement: attention.map(r => ({ name: r.name, average: Number(Number(r.average).toFixed(1)) })),
      distribution,
      passFail: passFail.map(r => ({ subject: r.subject, passed: Number(r.passed), failed: Number(r.failed) })),
      recent: recent.map(r => ({ ...r, marks: Number(r.marks), max_marks: Number(r.max_marks), percentage: Number(percentage(r).toFixed(1)) }))
    });
  } catch (error) { next(error); }
});

router.get("/students", auth, admin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 10), offset = (page - 1) * limit;
    const search = `%${String(req.query.search || "").trim()}%`;
    const semester = req.query.semester ? String(req.query.semester) : null;
    let sql = "FROM students s LEFT JOIN marks m ON m.student_id=s.id WHERE (s.name LIKE ? OR s.roll_no LIKE ?)";
    const params = [search, search];
    if (semester) { sql += " AND m.semester = ?"; params.push(semester); }
    sql += " GROUP BY s.id";
    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM (${`SELECT s.id ${sql}`}) AS filtered`, params);
    const [rows] = await pool.execute(`SELECT s.id,s.roll_no,s.name,s.email,COUNT(m.id) AS marks_count ${sql} ORDER BY s.name LIMIT ? OFFSET ?`, [...params, limit, offset]);
    res.json({ rows, page, limit, total: countRows[0].total });
  } catch (error) { next(error); }
});

router.post("/students", auth, admin, async (req, res, next) => {
  try {
    const parsed = z.object({ rollNo: z.string().trim().min(1), name: z.string().trim().min(1), email: z.string().email().or(z.literal("")).default("") }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    const [result] = await pool.execute("INSERT INTO students (roll_no,name,email) VALUES (?,?,?)", [parsed.data.rollNo, parsed.data.name, parsed.data.email]);
    res.status(201).json({ id: result.insertId, rollNo: parsed.data.rollNo, name: parsed.data.name, email: parsed.data.email });
  } catch (error) { next(error); }
});
router.put("/students/:id", auth, admin, async (req, res, next) => {
  try {
    const parsed = z.object({ rollNo: z.string().trim().min(1), name: z.string().trim().min(1), email: z.string().email().or(z.literal("")) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    await pool.execute("UPDATE students SET roll_no=?,name=?,email=? WHERE id=?", [parsed.data.rollNo, parsed.data.name, parsed.data.email, req.params.id]);
    res.json({ id: Number(req.params.id), ...parsed.data });
  } catch (error) { next(error); }
});
router.delete("/students/:id", auth, admin, async (req, res, next) => {
  try { await pool.execute("DELETE FROM students WHERE id=?", [req.params.id]); res.status(204).end(); } catch (error) { next(error); }
});
router.get("/students/:id", auth, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.studentId !== Number(req.params.id)) return res.status(403).json({ message: "You may only access your own records" });
    const [[student]] = await pool.execute("SELECT id,roll_no,name,email FROM students WHERE id=?", [req.params.id]);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const [marks] = await pool.execute("SELECT id,semester,subject,marks,max_marks FROM marks WHERE student_id=? ORDER BY semester,subject", [req.params.id]);
    const [[avg]] = await pool.query("SELECT COALESCE(AVG(marks/max_marks*100),0) AS average FROM marks");
    res.json({ student, marks, analytics: analyzeStudent(marks, Number(avg.average)) });
  } catch (error) { next(error); }
});
router.get("/analytics/student/:id", auth, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.studentId !== Number(req.params.id)) return res.status(403).json({ message: "You may only access your own analytics" });
    const [marks] = await pool.execute("SELECT semester,subject,marks,max_marks FROM marks WHERE student_id=?", [req.params.id]);
    const [[avg]] = await pool.query("SELECT COALESCE(AVG(marks/max_marks*100),0) AS average FROM marks");
    res.json(analyzeStudent(marks, Number(avg.average)));
  } catch (error) { next(error); }
});

router.get("/marks", auth, async (req, res, next) => {
  try {
    let sql = "SELECT m.id,m.student_id,m.semester,m.subject,m.marks,m.max_marks,s.name,s.roll_no FROM marks m JOIN students s ON s.id=m.student_id";
    const params = [], clauses = [];
    if (req.user.role !== "admin") clauses.push("m.student_id=?"), params.push(req.user.studentId);
    if (req.query.student) clauses.push("s.name LIKE ?"), params.push(`%${req.query.student}%`);
    if (req.query.subject) clauses.push("m.subject=?"), params.push(req.query.subject);
    if (req.query.semester) clauses.push("m.semester=?"), params.push(req.query.semester);
    if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    sql += " ORDER BY m.id DESC";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) { next(error); }
});
router.post("/marks", auth, admin, async (req, res, next) => {
  try {
    const parsed = z.object({ studentId: z.number().int().positive(), semester: z.string().trim().min(1), subject: z.string().trim().min(1), marks: z.number().nonnegative(), maxMarks: z.number().positive() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (parsed.data.marks > parsed.data.maxMarks) return res.status(400).json({ message: "Marks cannot exceed maximum marks" });
    await pool.execute("INSERT INTO marks (student_id,semester,subject,marks,max_marks) VALUES (?,?,?,?,?)", [parsed.data.studentId, parsed.data.semester, parsed.data.subject, parsed.data.marks, parsed.data.maxMarks]);
    res.status(201).json({ message: "Mark saved" });
  } catch (error) { next(error); }
});
router.put("/marks/:id", auth, admin, async (req, res, next) => {
  try {
    const parsed = z.object({ studentId: z.number().int().positive(), semester: z.string().trim().min(1), subject: z.string().trim().min(1), marks: z.number().nonnegative(), maxMarks: z.number().positive() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (parsed.data.marks > parsed.data.maxMarks) return res.status(400).json({ message: "Marks cannot exceed maximum marks" });
    await pool.execute("UPDATE marks SET student_id=?,semester=?,subject=?,marks=?,max_marks=? WHERE id=?", [parsed.data.studentId, parsed.data.semester, parsed.data.subject, parsed.data.marks, parsed.data.maxMarks, req.params.id]);
    res.json({ message: "Mark updated" });
  } catch (error) { next(error); }
});
router.delete("/marks/:id", auth, admin, async (req, res, next) => {
  try { await pool.execute("DELETE FROM marks WHERE id=?", [req.params.id]); res.status(204).end(); } catch (error) { next(error); }
});

router.get("/users", auth, admin, async (req, res, next) => {
  try { const [rows] = await pool.execute("SELECT u.id,u.username,u.role,u.student_id,s.name AS student_name FROM users u LEFT JOIN students s ON s.id=u.student_id ORDER BY u.role,u.username"); res.json(rows); } catch (error) { next(error); }
});
router.post("/users", auth, admin, async (req, res, next) => {
  try {
    const parsed = z.object({ username: z.string().trim().min(1), password: z.string().min(8), role: z.enum(["admin","student"]), studentId: z.number().int().positive().nullable().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    if (parsed.data.role === "student" && !parsed.data.studentId) return res.status(400).json({ message: "Student account must be linked to a student" });
    await pool.execute("INSERT INTO users (username,password_hash,role,student_id) VALUES (?,?,?,?)", [parsed.data.username, await bcrypt.hash(parsed.data.password, 12), parsed.data.role, parsed.data.role === "student" ? parsed.data.studentId : null]);
    res.status(201).json({ message: "User created" });
  } catch (error) { next(error); }
});
router.delete("/users/:id", auth, admin, async (req, res, next) => {
  try { await pool.execute("DELETE FROM users WHERE id=?", [req.params.id]); res.status(204).end(); } catch (error) { next(error); }
});

async function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer).pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on("data", row => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}
router.post("/imports/preview", auth, admin, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file || !req.file.originalname.toLowerCase().endsWith(".csv")) return res.status(400).json({ message: "A CSV file is required" });
    const rows = await parseCsv(req.file.buffer);
    const required = ["roll_no","name","email","semester","subject","marks","max_marks"];
    const accepted = [], rejected = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], missing = required.filter(key => row[key] === undefined);
      const score = Number(row.marks), maximum = Number(row.max_marks);
      if (missing.length) rejected.push({ row: i + 2, reason: "Missing required columns", data: row });
      else if (!row.roll_no?.trim() || !row.name?.trim() || !row.semester?.trim() || !row.subject?.trim()) rejected.push({ row: i + 2, reason: "Required field is empty", data: row });
      else if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) rejected.push({ row: i + 2, reason: "Marks are outside the valid range", data: row });
      else accepted.push({ rollNo: row.roll_no.trim(), name: row.name.trim(), email: row.email?.trim() || "", semester: row.semester.trim(), subject: row.subject.trim(), marks: score, maxMarks: maximum });
    }
    const keys = accepted.map(r => `${r.rollNo}|${r.semester}|${r.subject}`);
    accepted.forEach((row, index) => {
      if (keys.indexOf(`${row.rollNo}|${row.semester}|${row.subject}`) !== index) rejected.push({ row: index + 2, reason: "Duplicate record in CSV", data: row });
    });
    res.json({ accepted: accepted.filter(r => !rejected.some(x => x.data?.rollNo === r.rollNo && x.data?.semester === r.semester && x.data?.subject === r.subject)), rejected, preview: accepted.slice(0, 20) });
  } catch (error) { next(error); }
});
router.post("/imports/csv", auth, admin, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "A CSV file is required" });
    const rows = await parseCsv(req.file.buffer);
    const connection = await pool.getConnection();
    let imported = 0, rejected = [];
    try {
      await connection.beginTransaction();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], score = Number(row.marks), maximum = Number(row.max_marks);
        if (!row.roll_no || !row.name || !row.semester || !row.subject || !Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) {
          rejected.push({ row: i + 2, reason: "Invalid row", data: row }); continue;
        }
        let [students] = await connection.execute("SELECT id FROM students WHERE roll_no=?", [row.roll_no.trim()]);
        let studentId;
        if (students[0]) {
          studentId = students[0].id;
          await connection.execute("UPDATE students SET name=?,email=? WHERE id=?", [row.name.trim(), row.email?.trim() || "", studentId]);
        } else {
          const [result] = await connection.execute("INSERT INTO students (roll_no,name,email) VALUES (?,?,?)", [row.roll_no.trim(), row.name.trim(), row.email?.trim() || ""]);
          studentId = result.insertId;
        }
        try {
          await connection.execute("INSERT INTO marks (student_id,semester,subject,marks,max_marks) VALUES (?,?,?,?,?)", [studentId, row.semester.trim(), row.subject.trim(), score, maximum]);
          imported++;
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") rejected.push({ row: i + 2, reason: "Duplicate student subject record", data: row });
          else throw error;
        }
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    res.json({ imported, rejected });
  } catch (error) { next(error); }
});

router.get("/notifications", auth, async (req, res, next) => {
  try {
    const params = []; let sql = "SELECT s.name,m.subject,m.semester,m.marks,m.max_marks FROM marks m JOIN students s ON s.id=m.student_id";
    if (req.user.role !== "admin") { sql += " WHERE m.student_id=?"; params.push(req.user.studentId); }
    sql += " AND m.marks/m.max_marks<0.5 ORDER BY m.id DESC LIMIT 20";
    if (req.user.role !== "admin") {
      sql = "SELECT s.name,m.subject,m.semester,m.marks,m.max_marks FROM marks m JOIN students s ON s.id=m.student_id WHERE m.student_id=? AND m.marks/m.max_marks<0.5 ORDER BY m.id DESC LIMIT 20";
    } else {
      sql = "SELECT s.name,m.subject,m.semester,m.marks,m.max_marks FROM marks m JOIN students s ON s.id=m.student_id WHERE m.marks/m.max_marks<0.5 ORDER BY m.id DESC LIMIT 20";
    }
    const [lowMarks] = await pool.execute(sql, params);
    const [subjectLow] = await pool.query("SELECT subject,AVG(marks/max_marks*100) AS average FROM marks GROUP BY subject HAVING average<50");
    const notifications = lowMarks.map(r => ({ type: "declined", title: `${r.name} scored below 50%`, detail: `${r.subject} (${r.semester})`, severity: "warning" }));
    if (req.user.role === "admin") notifications.push(...subjectLow.map(r => ({ type: "subject", title: `${r.subject} average is below 50%`, detail: `Current average: ${Number(r.average).toFixed(1)}%`, severity: "warning" })));
    res.json(notifications);
  } catch (error) { next(error); }
});

router.get("/reports/export", auth, async (req, res, next) => {
  try {
    const format = String(req.query.format || "xlsx").toLowerCase();
    const params = [];
    let sql = "SELECT s.roll_no,s.name,s.email,m.semester,m.subject,m.marks,m.max_marks,ROUND(m.marks/m.max_marks*100,1) AS percentage FROM marks m JOIN students s ON s.id=m.student_id";
    if (req.user.role !== "admin") { sql += " WHERE m.student_id=?"; params.push(req.user.studentId); }
    sql += " ORDER BY s.name,m.semester,m.subject";
    const [rows] = await pool.execute(sql, params);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv"); res.setHeader("Content-Disposition", "attachment; filename=\"academic-records.csv\"");
      res.send("roll_no,name,email,semester,subject,marks,max_marks,percentage\n" + rows.map(r => [r.roll_no,r.name,r.email,r.semester,r.subject,r.marks,r.max_marks,r.percentage].map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"));
      return;
    }
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", "attachment; filename=\"academic-records.pdf\"");
      const doc = new PDFDocument({ margin: 40 }); doc.pipe(res); doc.fontSize(18).text("Academic Records Report");
      rows.forEach(r => doc.moveDown(0.4).fontSize(10).text(`${r.roll_no} | ${r.name} | ${r.semester} | ${r.subject} | ${r.marks}/${r.max_marks} | ${r.percentage}%`));
      doc.end(); return;
    }
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Academic Records");
    sheet.columns = [{header:"Roll Number",key:"roll_no"},{header:"Name",key:"name"},{header:"Email",key:"email"},{header:"Semester",key:"semester"},{header:"Subject",key:"subject"},{header:"Marks",key:"marks"},{header:"Maximum",key:"max_marks"},{header:"Percentage",key:"percentage"}];
    sheet.addRows(rows); res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition","attachment; filename=\"academic-records.xlsx\"");
    await workbook.xlsx.write(res); res.end();
  } catch (error) { next(error); }
});

export default router;
