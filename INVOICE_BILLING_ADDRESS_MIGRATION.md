# Invoice billing address migration notes

## Overview
The invoice flow now distinguishes between the party address and the billing address.

- `partyAddress` remains the customer/supplier address from the party record.
- `billingAddress` is the dedicated address used on the invoice when billing differs from the party contact details.
- `billingPincode` and `billingPlaceOfSupply` are optional, invoice-specific billing metadata.

## Data mapping

| Legacy / source field | New invoice field | Behavior |
| --- | --- | --- |
| `partyAddress` | `partyAddress` | Always preserved as the party record address. |
| `partyAddress` | `billingAddress` | Auto-filled when the user selects “Same as party address”. |
| `placeOfSupply` | `billingPlaceOfSupply` | Auto-filled from the party place of supply when the checkbox is active. |
| `billingAddress` | `billingAddress` | Manual override is stored as-is and kept when the checkbox is turned off. |

## Migration behavior
The app migrates older records at read time using the following rules:

1. If `billingAddress` is missing, use `partyAddress` as the fallback value.
2. If `billingPlaceOfSupply` is missing, use `placeOfSupply` as the fallback value.
3. If `billingPincode` is missing, leave it empty rather than guessing from the personal party record.
4. When the checkbox is checked, the UI re-syncs the billing fields from the party address; when the user edits the billing fields manually, the checkbox is turned off so the manual value is preserved.

## Storage compatibility
Saved invoice documents now include these optional fields in the local document storage cache and in the runtime `BusinessDocument` model.

This keeps older documents compatible without breaking the party-address flow while allowing a separate, explicit billing address when needed.
