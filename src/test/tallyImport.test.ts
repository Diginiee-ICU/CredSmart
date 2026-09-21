import { describe, it, expect } from "vitest";
import {
  parseTallyXml,
  autoDetectAndParseTally,
  parseTallyDaybookCsv,
} from "../utils/tallyXmlParser";
import { parseUniversalFile } from "../utils/universalDataImporter";

describe("Tally Import - Deep XML & Daybook Extraction Engine", () => {
  describe("Stock Items Parsing", () => {
    it("parses stock items with standard prices, opening stock, GST rates, and HSN codes", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                  <STOCKITEM NAME="Basmati Rice 5kg">
                    <PARENT>Grains &amp; Cereals</PARENT>
                    <BASEUNITS>BAG</BASEUNITS>
                    <OPENINGBALANCE>25 BAG</OPENINGBALANCE>
                    <OPENINGRATE>350/BAG</OPENINGRATE>
                    <OPENINGVALUE>8750.00</OPENINGVALUE>
                    <STANDARDPRICELIST.LIST>
                      <RATE>450.00/BAG</RATE>
                    </STANDARDPRICELIST.LIST>
                    <STANDARDCOSTLIST.LIST>
                      <RATE>360.00/BAG</RATE>
                    </STANDARDCOSTLIST.LIST>
                    <GSTDETAILS.LIST>
                      <RATEDETAILS.LIST>
                        <GSTRATE>5</GSTRATE>
                      </RATEDETAILS.LIST>
                    </GSTDETAILS.LIST>
                    <GSTREPDETAILS.LIST>
                      <HSNCODE>10063020</HSNCODE>
                    </GSTREPDETAILS.LIST>
                  </STOCKITEM>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = parseTallyXml(xml);
      expect(result.items.length).toBe(1);

      const item = result.items[0];
      expect(item.name).toBe("Basmati Rice 5kg");
      expect(item.category).toBe("Grains & Cereals");
      expect(item.unit).toBe("BAG");
      expect(item.openingStock).toBe(25);
      expect(item.sellingPrice).toBe(450);
      expect(item.purchasePrice).toBe(360);
      expect(item.gstRate).toBe(5);
      expect(item.hsnCode).toBe("10063020");
    });

    it("handles currency symbols, comma separators, and fallback pricing", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <STOCKITEM NAME="Premium Mustard Oil 1L">
                    <OPENINGBALANCE>1,500 PCS</OPENINGBALANCE>
                    <OPENINGRATE>₹ 145.50/PCS</OPENINGRATE>
                    <OPENINGVALUE>₹ 2,18,250.00</OPENINGVALUE>
                  </STOCKITEM>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = parseTallyXml(xml);
      expect(result.items.length).toBe(1);

      const item = result.items[0];
      expect(item.name).toBe("Premium Mustard Oil 1L");
      expect(item.openingStock).toBe(1500);
      expect(item.purchasePrice).toBe(145.5);
      expect(item.sellingPrice).toBe(167); // Standard 15% retail markup when selling price is absent in Tally
    });
  });

  describe("Group Hierarchy Resolution & Party Classification", () => {
    it("recursively resolves nested customer and vendor groups to root categories", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <!-- Group Definitions -->
                <TALLYMESSAGE>
                  <GROUP NAME="North India Trade">
                    <PARENT>Sundry Debtors</PARENT>
                  </GROUP>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <GROUP NAME="Delhi Retailers Club">
                    <PARENT>North India Trade</PARENT>
                  </GROUP>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <GROUP NAME="Raw Material Vendors">
                    <PARENT>Sundry Creditors</PARENT>
                  </GROUP>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <GROUP NAME="Factory Suppliers">
                    <PARENT>Raw Material Vendors</PARENT>
                  </GROUP>
                </TALLYMESSAGE>

                <!-- Ledgers using Nested Groups -->
                <TALLYMESSAGE>
                  <LEDGER NAME="Aggarwal Brothers">
                    <PARENT>Delhi Retailers Club</PARENT>
                    <OPENINGBALANCE>45000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                    <PARTYGSTIN>07AAAAA0000A1Z5</PARTYGSTIN>
                    <INCOMETAXNUMBER>AAAAA0000A</INCOMETAXNUMBER>
                    <ADDRESS.LIST>
                      <ADDRESS>Shop 42, Chandni Chowk</ADDRESS>
                      <ADDRESS>Delhi - 110006</ADDRESS>
                    </ADDRESS.LIST>
                  </LEDGER>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="Bharat Steel Mills">
                    <PARENT>Factory Suppliers</PARENT>
                    <OPENINGBALANCE>125000.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                    <PARTYGSTIN>06BBBBB1111B1Z2</PARTYGSTIN>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = parseTallyXml(xml);
      expect(result.parties.length).toBe(2);

      const customer = result.parties.find((p) => p.name === "Aggarwal Brothers");
      expect(customer).toBeDefined();
      expect(customer?.partyType).toBe("customer");
      expect(customer?.balance).toBe(45000); // Debit balance (customer owes us)
      expect(customer?.gstin).toBe("07AAAAA0000A1Z5");
      expect(customer?.pan).toBe("AAAAA0000A");
      expect(customer?.address).toBe("Shop 42, Chandni Chowk, Delhi - 110006");

      const supplier = result.parties.find((p) => p.name === "Bharat Steel Mills");
      expect(supplier).toBeDefined();
      expect(supplier?.partyType).toBe("supplier");
      expect(supplier?.balance).toBe(-125000); // Credit balance (we owe supplier)
      expect(supplier?.gstin).toBe("06BBBBB1111B1Z2");
    });

    it("identifies bank accounts and cash-in-hand accounts with nested hierarchies", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <GROUP NAME="Current Operational Accounts">
                    <PARENT>Bank Accounts</PARENT>
                  </GROUP>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <GROUP NAME="Retail Counter Cash">
                    <PARENT>Cash-in-Hand</PARENT>
                  </GROUP>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="HDFC Main Current A/c">
                    <PARENT>Current Operational Accounts</PARENT>
                    <OPENINGBALANCE>540250.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                    <BANKACCOUNTNUMBER>50200012345678</BANKACCOUNTNUMBER>
                    <IFSCODE>HDFC0001234</IFSCODE>
                  </LEDGER>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="Counter Register Cash">
                    <PARENT>Retail Counter Cash</PARENT>
                    <OPENINGBALANCE>28500.00</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = parseTallyXml(xml);
      expect(result.bankAccounts.length).toBe(1);
      expect(result.bankAccounts[0].accountName).toBe("HDFC Main Current A/c");
      expect(result.bankAccounts[0].accountNumber).toBe("50200012345678");
      expect(result.bankAccounts[0].ifsc).toBe("HDFC0001234");
      expect(result.bankAccounts[0].balance).toBe(540250);

      expect(result.cashInHand).toBe(28500);
    });
  });

  describe("Vouchers and Inventory Line Item Breakdown", () => {
    it("extracts full inventory line items and tax ledgers from sales vouchers", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Sales" ACTION="Create">
                    <DATE>20260815</DATE>
                    <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                    <VOUCHERNUMBER>INV/26-27/0042</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Sharma Trading Co.</PARTYLEDGERNAME>
                    <NARRATION>Goods supplied against PO #889</NARRATION>
                    
                    <!-- Item 1 -->
                    <ALLINVENTORYENTRIES.LIST>
                      <STOCKITEMNAME>Refined Sunflower Oil 1L</STOCKITEMNAME>
                      <ACTUALQTY>10 PCS</ACTUALQTY>
                      <RATE>140.00/PCS</RATE>
                      <AMOUNT>-1400.00</AMOUNT>
                      <BATCHALLOCATIONS.LIST>
                        <BATCHNAME>BATCH-AUG-01</BATCHNAME>
                        <EXPIRYPERIOD>2027-08-31</EXPIRYPERIOD>
                      </BATCHALLOCATIONS.LIST>
                    </ALLINVENTORYENTRIES.LIST>

                    <!-- Item 2 -->
                    <ALLINVENTORYENTRIES.LIST>
                      <STOCKITEMNAME>Wheat Flour 10kg</STOCKITEMNAME>
                      <ACTUALQTY>5 BAG</ACTUALQTY>
                      <RATE>420.00/BAG</RATE>
                      <AMOUNT>-2100.00</AMOUNT>
                    </ALLINVENTORYENTRIES.LIST>

                    <!-- Ledger entries for GST and total -->
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Sharma Trading Co.</LEDGERNAME>
                      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                      <AMOUNT>3675.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Output CGST 2.5%</LEDGERNAME>
                      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                      <AMOUNT>-87.50</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Output SGST 2.5%</LEDGERNAME>
                      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                      <AMOUNT>-87.50</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>

                <!-- Receipt Voucher -->
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Receipt">
                    <DATE>20260820</DATE>
                    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
                    <VOUCHERNUMBER>RCT-991</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Sharma Trading Co.</PARTYLEDGERNAME>
                    <NARRATION>Payment received via NEFT</NARRATION>
                    <ALLLEDGERENTRIES.LIST>
                      <LEDGERNAME>Sharma Trading Co.</LEDGERNAME>
                      <AMOUNT>3675.00</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = parseTallyXml(xml);
      expect(result.salesVouchers.length).toBe(1);
      const sale = result.salesVouchers[0];

      expect(sale.voucherNumber).toBe("INV/26-27/0042");
      expect(sale.partyName).toBe("Sharma Trading Co.");
      expect(sale.date).toBe("2026-08-15");
      expect(sale.amount).toBe(3675);
      expect(sale.narration).toBe("Goods supplied against PO #889");

      // Verify line items
      expect(sale.items).toBeDefined();
      expect(sale.items?.length).toBe(2);

      const item1 = sale.items![0];
      expect(item1.itemName).toBe("Refined Sunflower Oil 1L");
      expect(item1.quantity).toBe(10);
      expect(item1.unit).toBe("PCS");
      expect(item1.rate).toBe(140);
      expect(item1.amount).toBe(1400);
      expect(item1.batchNumber).toBe("BATCH-AUG-01");
      expect(item1.expiryDate).toBe("2027-08-31");

      const item2 = sale.items![1];
      expect(item2.itemName).toBe("Wheat Flour 10kg");
      expect(item2.quantity).toBe(5);
      expect(item2.rate).toBe(420);
      expect(item2.amount).toBe(2100);

      // Verify receipt voucher
      expect(result.receiptVouchers.length).toBe(1);
      const rct = result.receiptVouchers[0];
      expect(rct.voucherNumber).toBe("RCT-991");
      expect(rct.partyName).toBe("Sharma Trading Co.");
      expect(rct.amount).toBe(3675);
    });
  });

  describe("Tally Daybook CSV Parser", () => {
    it("parses Tally Daybook CSV exports accurately", () => {
      const csv = `Date,Voucher Type,Voucher No.,Particulars,Gross Total,Narration
01-09-2026,Sales,SL-101,Gupta General Store,"₹ 15,200.00",Full payment expected in 15 days
02-09-2026,Purchase,PUR-505,Amul India Ltd,"₹ 48,000.00",Milk and dairy supply
03-09-2026,Receipt,REC-202,Gupta General Store,"₹ 10,000.00",Part payment via UPI
04-09-2026,Payment,PAY-303,Amul India Ltd,"₹ 25,000.00",Advance for next delivery`;

      const vouchers = parseTallyDaybookCsv(csv);
      expect(vouchers.length).toBe(4);

      const sales = vouchers.find((v) => v.voucherType === "Sales");
      expect(sales).toBeDefined();
      expect(sales?.voucherNumber).toBe("SL-101");
      expect(sales?.partyName).toBe("Gupta General Store");
      expect(sales?.amount).toBe(15200);

      const pur = vouchers.find((v) => v.voucherType === "Purchase");
      expect(pur).toBeDefined();
      expect(pur?.voucherNumber).toBe("PUR-505");
      expect(pur?.partyName).toBe("Amul India Ltd");
      expect(pur?.amount).toBe(48000);

      const rct = vouchers.find((v) => v.voucherType === "Receipt");
      expect(rct).toBeDefined();
      expect(rct?.voucherNumber).toBe("REC-202");
      expect(rct?.amount).toBe(10000);

      const pay = vouchers.find((v) => v.voucherType === "Payment");
      expect(pay).toBeDefined();
      expect(pay?.voucherNumber).toBe("PAY-303");
      expect(pay?.amount).toBe(25000);
    });
  });

  describe("Auto-detection & Universal Pipeline Integration", () => {
    it("autoDetectAndParseTally automatically detects XML format and parses correctly", () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <STOCKITEM NAME="Chana Dal 1kg">
                    <BASEUNITS>KG</BASEUNITS>
                    <OPENINGBALANCE>50 KG</OPENINGBALANCE>
                    <OPENINGRATE>90/KG</OPENINGRATE>
                  </STOCKITEM>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const result = autoDetectAndParseTally(xml);
      expect(result.source).toBe("xml");
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe("Chana Dal 1kg");
      expect(result.items[0].openingStock).toBe(50);
    });

    it("universalDataImporter preserves all vouchers and bank accounts without resetting counts", async () => {
      const xml = `
        <ENVELOPE>
          <BODY>
            <IMPORTDATA>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <STOCKITEM NAME="Item A">
                    <OPENINGBALANCE>10 PCS</OPENINGBALANCE>
                  </STOCKITEM>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="Customer X">
                    <PARENT>Sundry Debtors</PARENT>
                    <OPENINGBALANCE>5000</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  </LEDGER>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <LEDGER NAME="State Bank of India">
                    <PARENT>Bank Accounts</PARENT>
                    <OPENINGBALANCE>75000</OPENINGBALANCE>
                    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                    <BANKACCOUNTNUMBER>123456789</BANKACCOUNTNUMBER>
                  </LEDGER>
                </TALLYMESSAGE>
                <TALLYMESSAGE>
                  <VOUCHER VCHTYPE="Sales">
                    <DATE>20260901</DATE>
                    <VOUCHERNUMBER>INV-001</VOUCHERNUMBER>
                    <PARTYLEDGERNAME>Customer X</PARTYLEDGERNAME>
                    <ALLLEDGERENTRIES.LIST>
                      <AMOUNT>2500</AMOUNT>
                    </ALLLEDGERENTRIES.LIST>
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </BODY>
        </ENVELOPE>
      `;

      const file = new File([xml], "tally_export.xml", { type: "text/xml" });
      const data = await parseUniversalFile(file, "tally");

      expect(data.items.length).toBe(1);
      expect(data.parties.all.length).toBe(1);
      expect(data.bankAccounts.length).toBe(1);
      expect(data.bankAccounts[0].accountName).toBe("State Bank of India");
      expect(data.summary.totalBankAccounts).toBe(1);
      expect(data.vouchers.length).toBe(1);
      expect(data.vouchers[0].voucherNumber).toBe("INV-001");
      expect(data.summary.totalVouchers).toBe(1);
    });
  });
});
