const http = require('http');

const probeEnvelope = <ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>CompanyInfo</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>;

const req = http.request({
  hostname: '127.0.0.1',
  port: 9000,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml;charset=utf-8',
    'Content-Length': Buffer.byteLength(probeEnvelope)
  },
  timeout: 3000
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('TALLY STATUS CODE:', res.statusCode);
    console.log('TALLY RESPONSE PREVIEW:', data.substring(0, 300));
  });
});

req.on('error', (e) => {
  console.error('TALLY ERROR:', e.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('TALLY TIMEOUT');
});

req.write(probeEnvelope);
req.end();
