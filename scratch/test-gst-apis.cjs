async function testApis() {
  const gstin = "27AAPFU0939F1ZV"; // Reliance Retail
  const testGstins = [
    "27AAPFU0939F1ZV", // Reliance Retail (Maharashtra)
    "29AABCU9603R1ZX", // Infosys (Karnataka)
    "07AAAAA0000A1Z5", // Airtel (Delhi)
    "24AABCA1234F1ZA", // Amul (Gujarat)
  ];

  const apis = [
    {
      name: "Razorpay Public GST Search",
      url: `https://api.razorpay.com/v1/payments/gstin/${gstin}`,
      headers: { "User-Agent": "Mozilla/5.0" },
    },
    {
      name: "GSTIN Check API",
      url: `https://gstin-lookup.onrender.com/api/gstin/${gstin}`,
      headers: { "User-Agent": "Mozilla/5.0" },
    },
    {
      name: "Taxpayer Public API",
      url: `https://api.taxpayer.in/v1/gstin/${gstin}`,
      headers: { "User-Agent": "Mozilla/5.0" },
    },
    {
      name: "ClearTax Open Search",
      url: `https://cleartax.in/f/api/gstin-search?gstin=${gstin}`,
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://cleartax.in" },
    },
    {
      name: "GST Zen Public Search",
      url: `https://my.gstzen.in/p/gstin-validator/${gstin}/`,
      headers: { "User-Agent": "Mozilla/5.0" },
    },
    {
      name: "Sheetrock Open GST",
      url: `https://api.sheetrock.in/v1/gst/${gstin}`,
      headers: { "User-Agent": "Mozilla/5.0" },
    }
  ];

  for (const api of apis) {
    try {
      console.log(`\n=== Testing: ${api.name} ===`);
      const res = await fetch(api.url, { headers: api.headers, method: "GET" });
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response: ${text.slice(0, 300)}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}
testApis();
