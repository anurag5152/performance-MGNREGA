import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.REACT_APP_API_KEY;
const BASE_URL =
  "https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS mgnrega_data (
      id SERIAL PRIMARY KEY,
      state_name TEXT,
      district_name TEXT,
      fin_year TEXT,
      month TEXT,
      state_code TEXT,
      Approved_Labour_Budget NUMERIC,
      Average_Wage_rate_per_day_per_person NUMERIC,
      Average_days_of_employment_provided_per_Household NUMERIC,
      Differently_abled_persons_worked NUMERIC,
      Number_of_Completed_Works NUMERIC,
      Number_of_Ongoing_Works NUMERIC,
      Total_No_of_Workers NUMERIC
    );
  `;
  await pool.query(query);
  console.log("✅ Database ready");
}

const avg = (arr) => {
  const nums = arr
    .map((v) => parseFloat(v))
    .filter((n) => !isNaN(n) && n !== null);
  return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
};

app.get("/api/mgnrega", async (req, res) => {
  try {
    const { state, district, year } = req.query;
    const filters = [];
    const values = [];

    if (state) {
      filters.push(`state_name = $${filters.length + 1}`);
      values.push(state);
    }
    if (district) {
      filters.push(`district_name = $${filters.length + 1}`);
      values.push(district);
    }
    if (year) {
      filters.push(`fin_year = $${filters.length + 1}`);
      values.push(year);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const dbQuery = `SELECT * FROM mgnrega_data ${whereClause}`;
    const dbResult = await pool.query(dbQuery, values);
    if (dbResult.rows.length > 0) {
      console.log("📦 Served from local database");
      return res.json({ records: dbResult.rows });
    }

    console.log("🌐 Fetching from data.gov.in...");
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=10000`;
    if (state) url += `&filters[state_name]=${encodeURIComponent(state)}`;
    if (district) url += `&filters[district_name]=${encodeURIComponent(district)}`;
    if (year) url += `&filters[fin_year]=${encodeURIComponent(year)}`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.records) {
      console.error("⚠️ Invalid API response:", json);
      return res.status(400).json({ error: "Invalid API response" });
    }

    const records = json.records;

    const grouped = {};
    for (const r of records) {
      const month = r.month || r.Month || "N/A";
      const key = `${r.district_name}_${r.fin_year}_${month}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }

    const aggregated = Object.values(grouped).map((group) => {
      const sample = group[0];
      return {
        state_name: sample.state_name,
        district_name: sample.district_name,
        fin_year: sample.fin_year,
        month: sample.month || sample.Month || "N/A",
        state_code: sample.state_code,
        Approved_Labour_Budget: avg(group.map((g) => g.Approved_Labour_Budget)),
        Average_Wage_rate_per_day_per_person: avg(
          group.map((g) => g.Average_Wage_rate_per_day_per_person)
        ),
        Average_days_of_employment_provided_per_Household: avg(
          group.map((g) => g.Average_days_of_employment_provided_per_Household)
        ),
        Differently_abled_persons_worked: avg(
          group.map((g) => g.Differently_abled_persons_worked)
        ),
        Number_of_Completed_Works: avg(group.map((g) => g.Number_of_Completed_Works)),
        Number_of_Ongoing_Works: avg(group.map((g) => g.Number_of_Ongoing_Works)),
        Total_No_of_Workers: avg(group.map((g) => g.Total_No_of_Workers)),
      };
    });

    for (const r of aggregated) {
      await pool.query(
        `INSERT INTO mgnrega_data (
          state_name, district_name, fin_year, month, state_code,
          Approved_Labour_Budget, Average_Wage_rate_per_day_per_person,
          Average_days_of_employment_provided_per_Household, Differently_abled_persons_worked,
          Number_of_Completed_Works, Number_of_Ongoing_Works, Total_No_of_Workers
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING;`,
        [
          r.state_name,
          r.district_name,
          r.fin_year,
          r.month,
          r.state_code,
          r.Approved_Labour_Budget,
          r.Average_Wage_rate_per_day_per_person,
          r.Average_days_of_employment_provided_per_Household,
          r.Differently_abled_persons_worked,
          r.Number_of_Completed_Works,
          r.Number_of_Ongoing_Works,
          r.Total_No_of_Workers,
        ]
      );
    }

    console.log("✅ Data saved to local DB");
    res.json({ records: aggregated });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`✅ Server running at http://localhost:${PORT}`);
});