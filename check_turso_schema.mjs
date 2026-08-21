import { createClient } from "@libsql/client";

const client = createClient({
  url: "https://try-rudra030709.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicm8iLCJpYXQiOjE3ODY4MzY0MDEsImlkIjoiMDFhMDA3NzctZjYwMS03MDk2LTk3NjYtMDE5NmRkNjFjYjQ1Iiwia2lkIjoiS2drYWFTMHo0LWlBS3B6amRsQTFGWW5MSWZvNm5YNU5SdER4MllPV0cwVSIsInJpZCI6IjE2MzJmYzc3LWRjZWEtNGY4NS1iMjc0LWU2MzdmMWRjNjY5OSJ9.-iG2ufn4uv-Av5BLA5EBIwNomTk57hZo_hthceMi7kxpNfrWRebVOxtpgSB6E6v66nijpKZ99iaDchTOt_LWAQ"
});

async function checkSchema() {
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Tables:", JSON.stringify(tables.rows, null, 2));
    
    for (const row of tables.rows) {
      const tableName = row.name;
      const info = await client.execute(`PRAGMA table_info('${tableName}');`);
      console.log(`\nTable ${tableName} columns:`, JSON.stringify(info.rows, null, 2));
    }
  } catch(e) {
    console.error(e);
  }
}

checkSchema();
