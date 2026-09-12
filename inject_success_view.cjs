const fs = require('fs');
const path = 'src/components/SalesInvoiceModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Inject setMobileSuccessInvoice into handleSave
const handleSaveTarget = `        if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();`;

const handleSaveReplace = `        if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();`;
        
const fullHandleSaveTarget = `        if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
        setInvoiceNumberSeq(nextSeq);
        setPartyName("");
        setCustomerSearch("");
        setSelectedCustomerId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setBillingAddress("");
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setSameAsParty(false);
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(false);
      } else {
        onOpenChange(false);
      }`;

const fullHandleSaveReplace = `        if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
        setInvoiceNumberSeq(nextSeq);
        setPartyName("");
        setCustomerSearch("");
        setSelectedCustomerId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setBillingAddress("");
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setSameAsParty(false);
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(false);
      } else if (window.innerWidth < 1024) {
        setMobileSuccessInvoice(saved);
      } else {
        onOpenChange(false);
      }`;

content = content.replace(fullHandleSaveTarget, fullHandleSaveReplace);


// 2. Inject ternary rendering
const jsxTarget = `          <MobileCreateInvoice
            onClose={() => onOpenChange(false)}`;

const jsxReplace = `          {mobileSuccessInvoice ? (
            <MobileInvoiceSuccessView
              invoice={mobileSuccessInvoice}
              onClose={() => {
                setMobileSuccessInvoice(null);
                onOpenChange(false);
              }}
            />
          ) : (
            <MobileCreateInvoice
              onClose={() => onOpenChange(false)}`;

content = content.replace(jsxTarget, jsxReplace);

fs.writeFileSync(path, content);
console.log("Success View injected!");
