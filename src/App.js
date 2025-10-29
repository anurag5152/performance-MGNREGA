import { useState, useEffect } from "react";
import { ClipboardList, Languages, Info } from "lucide-react";

export default function App() {
  const [districts, setDistricts] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedState] = useState("BIHAR");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [data, setData] = useState([]);
  const [showHindi, setShowHindi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const API_BASE =
    process.env.REACT_APP_API_BASE ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

  useEffect(() => {
    if (!selectedState) return;
    fetch(`${API_BASE}/api/mgnrega?state=${selectedState}`)
      .then(res => res.json())
      .then(json => {
        const records = json.records || [];
        setDistricts(
          [...new Set(records.map(r => r.district_name).filter(Boolean))].sort()
        );
        setYears(
          [...new Set(records.map(r => r.fin_year).filter(Boolean))].sort().reverse()
        );
      })
      .catch(err => console.error("Error loading metadata:", err));
  }, [selectedState]);

  const fetchData = async () => {
    setLoading(true);

    const query = new URLSearchParams({
      state: selectedState,
      ...(selectedDistrict && { district: selectedDistrict }),
      ...(selectedYear && { year: selectedYear }),
    }).toString();

    try {
      const res = await fetch(`${API_BASE}/api/mgnrega?${query}`);
      const json = await res.json();
      setData(json.records || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error loading data. Try again.");
    }
    setLoading(false);
  };

  const numericKeys = [
    "approved_labour_budget",
    "average_wage_rate_per_day_per_person",
    "average_days_of_employment_provided_per_household",
    "differently_abled_persons_worked",
    "number_of_completed_works",
    "number_of_ongoing_works",
    "total_no_of_workers",
  ];

  const hindiLabels = {
    approved_labour_budget: "स्वीकृत श्रम बजट",
    average_wage_rate_per_day_per_person: "औसत दैनिक मजदूरी दर",
    average_days_of_employment_provided_per_household: "प्रति परिवार औसत रोजगार दिवस",
    differently_abled_persons_worked: "विकलांग व्यक्तियों ने काम किया",
    number_of_completed_works: "पूर्ण कार्यों की संख्या",
    number_of_ongoing_works: "चल रहे कार्यों की संख्या",
    total_no_of_workers: "कुल श्रमिकों की संख्या",
  };

  const averages = {};
  numericKeys.forEach(key => {
    const nums = data.map(d => parseFloat(d[key])).filter(n => !isNaN(n));
    averages[key] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  });

  const getDotColor = (key, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "bg-gray-300";
    const avg = averages[key];
    if (num > avg * 1.1) return "bg-green-500"; 
    if (num < avg * 0.9) return "bg-red-500"; 
    return "bg-yellow-400"; 
  };

  const detectDistrict = async () => {
    if (!navigator.geolocation) {
      alert(showHindi ? "आपका ब्राउज़र लोकेशन का पता नहीं लगा सकता" : "Your browser doesn't support geolocation");
      return;
    }

    setLocationLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      
      const address = data.address;
      let detectedDistrict = address.city || address.town || address.district;
      
      detectedDistrict = detectedDistrict ? detectedDistrict.toUpperCase() : '';
      
      const matchingDistrict = districts.find(d => 
        d.includes(detectedDistrict) || detectedDistrict.includes(d)
      );

      if (matchingDistrict) {
        setSelectedDistrict(matchingDistrict);
      } else {
        alert(showHindi 
          ? "आपका जिला नहीं मिल सका। कृपया मैन्युअल रूप से चुनें।" 
          : "Couldn't detect your district. Please select manually.");
      }
    } catch (error) {
      console.error("Error getting location:", error);
      alert(showHindi 
        ? "लोकेशन का पता लगाने में त्रुटि। कृपया मैन्युअल रूप से चुनें।" 
        : "Error detecting location. Please select manually.");
    }
    setLocationLoading(false);
  };

  return (
    <div className="p-6 font-sans bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <ClipboardList className="text-blue-600" />
          {showHindi ? "मनरेगा डेटा डैशबोर्ड" : "MGNREGA Data Dashboard"}
        </h1>
        <button
          onClick={() => setShowHindi(!showHindi)}
          className="flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-gray-100"
        >
          <Languages size={18} />
          {showHindi ? "English" : "हिंदी"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            <option value="">{showHindi ? "ज़िला चुनें" : "Select District"}</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={detectDistrict}
            disabled={locationLoading || districts.length === 0}
            className="border px-3 py-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
            title={showHindi ? "वर्तमान स्थान का पता लगाएं" : "Detect current location"}
          >
            {locationLoading ? "📍..." : "📍"}
          </button>
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border px-3 py-2 rounded-md"
        >
          <option value="">{showHindi ? "वर्ष चुनें" : "Select Year"}</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>

        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showHindi ? "देखें" : "View"}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-gray-700">
        <Info className="text-blue-600" size={18} />
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          {showHindi ? "औसत से बेहतर" : "Above Average"}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
          {showHindi ? "औसत के समान" : "Average"}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          {showHindi ? "औसत से कम" : "Below Average"}
        </div>
      </div>

      {loading && <p className="text-gray-600">{showHindi ? "लोड हो रहा है..." : "Loading..."}</p>}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full border-collapse text-sm text-left">
            <thead className="bg-blue-100 text-gray-700">
              <tr>
                <th className="p-3">{showHindi ? "ज़िला" : "District"}</th>
                <th className="p-3">{showHindi ? "वर्ष" : "Year"}</th>
                <th className="p-3">{showHindi ? "महीना" : "Month"}</th>
                {numericKeys.map((key) => (
                  <th key={key} className="p-3">
                    {showHindi ? hindiLabels[key] : key.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3">{d.district_name}</td>
                  <td className="p-3">{d.fin_year}</td>
                  <td className="p-3">{d.month}</td>
                  {numericKeys.map((key) => (
                    <td key={key} className="p-3">
                      {d[key] ?? "-"}{" "}
                      <span
                        className={`inline-block w-2 h-2 rounded-full ml-2 ${getDotColor(
                          key,
                          d[key]
                        )}`}
                      ></span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.length === 0 && (
        <p className="text-gray-600">{showHindi ? "कोई डेटा नहीं मिला।" : "No data found."}</p>
      )}
    </div>
  );
}