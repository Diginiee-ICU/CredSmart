const http = require('http');
const { parseTallyXml } = require('./dist/assets/index-dv6EpkTg.js'); // Or require src via tsx

async function fetchFromTally(xml) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9000,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'Content-Length': Buffer.byteLength(xml)
      },
      timeout: 10000
    }, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

async function run() {
  const mastersXml = '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><ACCOUNTTYPE>All Masters</ACCOUNTTYPE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';
  const daybookXml = '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><EXPLODEFLAG>Yes</EXPLODEFLAG></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>';

  console.log('Querying Masters...');
  const mRes = await fetchFromTally(mastersXml);
  console.log('Querying DayBook...');
  const dRes = await fetchFromTally(daybookXml);

  console.log('Masters XML Size:', mRes.length);
  console.log('DayBook XML Size:', dRes.length);
}

run();
