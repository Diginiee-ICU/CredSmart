const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Import ReceiptModal if not present
  if (!content.includes('import { ReceiptModal }')) {
    content = content.replace(
      'import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";',
      'import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";\nimport { ReceiptModal } from "@/components/ReceiptModal";\nimport { ReceiptData } from "@/pages/Sales";'
    );
  }

  // Add state if not present
  if (!content.includes('const [receiptData, setReceiptData]')) {
    if (filepath.includes('AppLayout')) {
      content = content.replace(
        'const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);',
        'const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);'
      );
    } else {
      content = content.replace(
        'const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);',
        'const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);'
      );
    }
  }

  // Add handleOpenReceipt
  if (!content.includes('const handleOpenReceipt')) {
    const fn = `
  const handleOpenReceipt = (doc: any) => {
    const receipt: ReceiptData = {
      docType: doc.docType,
      invoiceNumber: doc.documentNumber,
      referenceNumber: doc.referenceNumber,
      items: doc.items.map((it: any) => ({
        product: {
          id: it.productId || it.id,
          name: it.productName,
          barcode: it.barcode || "",
          brand: "",
          category: "",
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altUnitConversion: it.altUnitConversion,
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
          batches: [],
        },
        batch: {
          id: it.id,
          productId: it.productId || it.id,
          batchNumber: it.batchNumber || "",
          mrp: 0,
          purchaseRate: 0,
          salesRate: it.rate,
          stock: it.quantity,
          expiryDate: it.expiryDate,
        },
        quantity: it.quantity,
        rate: it.rate,
        discount: (it.discountTotal || 0) / (it.quantity || 1),
        discountType: "amount",
        tax: it.taxRate,
        lineTotal: it.lineTotal,
      })),
      subtotal: doc.subtotal,
      discountAmount: doc.discountTotal || 0,
      tax: doc.taxTotal || 0,
      roundOff: doc.roundOff || 0,
      total: doc.grandTotal,
      paymentMethod: doc.paymentMethod || "Cash",
      notes: doc.notes || "",
      terms: doc.terms,
      date: doc.docDate,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
    };
    setReceiptData(receipt);
  };
`;
    // Find the end of states
    if (filepath.includes('AppLayout')) {
      content = content.replace('const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);', 'const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);\n' + fn);
    } else {
      content = content.replace('const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);', 'const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);\n  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);\n' + fn);
    }
  }

  // Add onPrintRequest
  if (filepath.includes('AppLayout')) {
    content = content.replace(
      '<SalesInvoiceModal\n          open={salesInvoiceModalOpen}\n          onOpenChange={setSalesInvoiceModalOpen}\n          orgId={orgId}\n          onSaved={() => {\n            toast.success("Invoice created successfully!");\n          }}\n        />',
      '<SalesInvoiceModal\n          open={salesInvoiceModalOpen}\n          onOpenChange={setSalesInvoiceModalOpen}\n          orgId={orgId}\n          onSaved={() => {\n            toast.success("Invoice created successfully!");\n          }}\n          onPrintRequest={handleOpenReceipt}\n        />'
    );
  } else {
    content = content.replace(
      '<SalesInvoiceModal\n          open={showSalesInvoiceModal}\n          onOpenChange={setShowSalesInvoiceModal}\n          orgId={orgId}\n          onSaved={() => {\n            fetchDashboardData();\n            toast({ title: "Invoice Created", description: "Successfully generated and recorded." });\n          }}\n        />',
      '<SalesInvoiceModal\n          open={showSalesInvoiceModal}\n          onOpenChange={setShowSalesInvoiceModal}\n          orgId={orgId}\n          onSaved={() => {\n            fetchDashboardData();\n            toast({ title: "Invoice Created", description: "Successfully generated and recorded." });\n          }}\n          onPrintRequest={handleOpenReceipt}\n        />'
    );
  }

  // Add ReceiptModal UI component at bottom
  if (!content.includes('<ReceiptModal')) {
    if (filepath.includes('AppLayout')) {
      content = content.replace(
        '        {/* ──────',
        `        {receiptData && (
          <ReceiptModal
            data={receiptData}
            onClose={() => setReceiptData(null)}
            onNewSale={() => {
              setReceiptData(null);
              setSalesInvoiceModalOpen(true);
            }}
          />
        )}
        {/* ──────`
      );
    } else {
      content = content.replace(
        '      </div>\\n    </div>\\n  );\\n}\\n',
        `      </div>
        {receiptData && (
          <ReceiptModal
            data={receiptData}
            onClose={() => setReceiptData(null)}
            onNewSale={() => {
              setReceiptData(null);
              setShowSalesInvoiceModal(true);
            }}
          />
        )}
    </div>
  );
}
`
      );
    }
  }

  fs.writeFileSync(filepath, content);
  console.log('Patched', filepath);
}

patchFile('src/components/AppLayout.tsx');
try { patchFile('src/pages/Dashboard.tsx'); } catch(e) {}
