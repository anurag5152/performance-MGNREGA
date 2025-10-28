// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const PORT = 5000;
const API_KEY = process.env.REACT_APP_API_KEY;
const BASE_URL = "https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722";

// Helper: average numeric array
function avg(arr) {
  const nums = arr.map(Number).filter((n) => !isNaN(n));
  return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null;
}

app.get("/api/mgnrega", async (req, res) => {
  try {
    const { state, district, year } = req.query;
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=1000`;

    if (state) url += `&filters[state_name]=${encodeURIComponent(state)}`;
    if (district) url += `&filters[district_name]=${encodeURIComponent(district)}`;
    if (year) url += `&filters[fin_year]=${encodeURIComponent(year)}`;

    const response = await fetch(url);
    const json = await response.json();
    const records = json.records || [];

    // Group by (district_name + fin_year + month)
    const grouped = {};
    for (const r of records) {
      const key = `${r.district_name}_${r.fin_year}_${r.Month || "Unknown"}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }

    // Aggregate each group into one record
    const aggregated = Object.values(grouped).map((group) => {
      const sample = group[0];
      return {
        district_name: sample.district_name,
        fin_year: sample.fin_year,
        month: sample.Month || "N/A",
        state_code: sample.state_code,
        Approved_Labour_Budget: avg(group.map(g => g.Approved_Labour_Budget)),
        Average_Wage_rate_per_day_per_person: avg(group.map(g => g.Average_Wage_rate_per_day_per_person)),
        Average_days_of_employment_provided_per_Household: avg(group.map(g => g.Average_days_of_employment_provided_per_Household)),
        Differently_abled_persons_worked: avg(group.map(g => g.Differently_abled_persons_worked)),
        Number_of_Completed_Works: avg(group.map(g => g.Number_of_Completed_Works)),
      };
    });

    res.json({ records: aggregated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => console.log(`✅ Local proxy running at http://localhost:${PORT}`));
