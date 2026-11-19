import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "analyzer",
  password: process.env.DB_PASSWORD || "localpass-change-me",
  database: process.env.DB_NAME || "performance",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});
