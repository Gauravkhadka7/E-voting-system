// config/db.js
"use strict";

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "evoting",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "Z",       // store/retrieve UTC
  decimalNumbers:     true,
});

/**
 * Run a query and return [rows, fields].
 * Usage: const [rows] = await query("SELECT ...", [params]);
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

/**
 * Get a raw connection for transactions.
 * Remember to conn.release() when done.
 */
async function getConnection() {
  return pool.getConnection();
}

async function testConnection() {
  const conn = await pool.getConnection();
  console.log("✅  MySQL connected —", process.env.DB_NAME);
  conn.release();
}
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
module.exports = { pool, query, getConnection, testConnection };