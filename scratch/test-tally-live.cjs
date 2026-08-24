async function testMultipleGstins() {
  const testList = [
    '27AAPFU0939F1ZV', // Reliance
    '29AABCU9603R1ZX', // Infosys
    '07AAAAA0000A1Z5', // Airtel
    '33AAACI1607G1ZU', // ITC
    '33AABCS1429B1ZT', // Sundaram Fasteners
    '27AAACT2727Q1ZW', // TCS
    '24AABCA1234F1ZA', // Amul
    '27AABCB1518J1ZP', // Bajaj Auto
  ];

  for (const gstin of testList) {
    const res = await fetch('https://tallysolutions.com/wp-content/themes/tally/api/gstin-serach-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://tallysolutions.com/business-tools-templates/gstin-verification-search/',
        'Origin': 'https://tallysolutions.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: 'gstin=' + encodeURIComponent(gstin)
    });
    const text = await res.text();
    console.log(gstin, '->', text);
  }
}
testMultipleGstins();
