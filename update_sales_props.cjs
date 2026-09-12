const fs = require('fs');
const path = 'src/components/SalesInvoiceModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `              onAddSelectedItems={handleBatchAddItemsAtTarget}`;
const replaceStr = `              onAddSelectedItems={handleBatchAddItemsAtTarget}
              onUpdateAdditionalCharges={(amt, reason) => {
                setShowAdditionalCharges(true);
                setAdditionalChargesAmount(amt);
                setAdditionalChargesReason(reason);
              }}
              onUpdateDiscount={(type, val) => {
                setShowDiscount(true);
                setOverallDiscountType(type);
                setOverallDiscountValue(val);
              }}
              onUpdateRoundOff={(auto, val) => {
                setAutoRoundOff(auto);
                if (!auto) setManualRoundOff(val);
              }}
              onUpdateNotes={(txt) => {
                setShowNotes(true);
                setNotes(txt);
              }}`;
content = content.replace(targetStr, replaceStr);
fs.writeFileSync(path, content);
console.log("Passed props in SalesInvoiceModal!");
