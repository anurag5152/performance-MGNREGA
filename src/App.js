import { useState, useEffect } from "react";

function App() {
  const [states] = useState([
    "UTTAR PRADESH", "MADHYA PRADESH", "BIHAR", "ASSAM",
    "MAHARASHTRA", "GUJARAT", "RAJASTHAN", "TAMIL NADU",
    "CHHATTISGARH", "KARNATAKA", "TELANGANA", "ODISHA",
    "ANDHRA PRADESH", "PUNJAB", "JHARKHAND", "HARYANA",
    "ARUNACHAL PRADESH", "JAMMU AND KASHMIR", "MANIPUR",
    "UTTARAKHAND", "KERALA", "HIMACHAL PRADESH", "MEGHALAYA",
    "WEST BENGAL", "MIZORAM", "NAGALAND", "TRIPURA",
    "SIKKIM", "ANDAMAN AND NICOBAR", "LADAKH", "PUDUCHERRY",
    "GOA", "DN HAVELI AND DD", "LAKSHADWEEP"
  ]);

  const [districts, setDistricts] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-fetch district/year for state
  useEffect(() => {
    if (!selectedState) return;
    fetch(`http://localhost:5000/api/mgnrega?state=${selectedState}`)
      .then((res) => res.json())
      .then((json) => {
        const records = json?.records || [];
        const dList = [...new Set(records.map((r) => r.district_name).filter(Boolean))].sort();
        const yList = [...new Set(records.map((r) => r.fin_year).filter(Boolean))].sort().reverse();
        setDistricts(dList);
        setYears(yList);
      })
      .catch((err) => console.error("Error fetching districts:", err));
  }, [selectedState]);

  // Fetch filtered data
  const fetchData = async () => {
    if (!selectedState) return alert("Please select a State first!");
    setLoading(true);

    const query = new URLSearchParams({
      state: selectedState,
      ...(selectedDistrict && { district: selectedDistrict }),
      ...(selectedYear && { year: selectedYear }),
    }).toString();

    const res = await fetch(`http://localhost:5000/api/mgnrega?${query}`);
    const json = await res.json();
    setData(json.records || []);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>MGNREGA District Data Viewer</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
          <option value="">Select State</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
          <option value="">Select District</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">Select Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button onClick={fetchData}>Fetch</button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && data.length > 0 && (
        <table border="1" cellPadding="8" style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>District</th>
              <th>Financial Year</th>
              <th>Month</th>
              <th>State Code</th>
              <th>Approved Budget</th>
              <th>Average Wage</th>
              <th>Average Days Of Employment Provided Per Household</th>
              <th>Differently Abled Persons Worked</th>
              <th>Completed Works</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.district_name}</td>
                <td>{d.fin_year}</td>
                <td>{d.month}</td>
                <td>{d.state_code}</td>
                <td>{d.Approved_Labour_Budget}</td>
                <td>{d.Average_Wage_rate_per_day_per_person}</td>
                <td>{d.Average_days_of_employment_provided_per_Household}</td>
                <td>{d.Differently_abled_persons_worked}</td>
                <td>{d.Number_of_Completed_Works}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
