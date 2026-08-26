import { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, PackageCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CompanySearchAutocomplete } from "@/components/CompanySearchAutocomplete";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  gstin: string;
}

interface ProductBatchInfo {
  id: string;
  batch_number: string;
  cost_price: number;
  mrp: number;
  expiry_date: string | null;
  stock: number;
}

interface ProductOption {
  id: string;
  name: string;
  barcode: string | null;
  brand: string | null;
  product_batches?: ProductBatchInfo[];
}

interface LineItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  mrp: number;
  expiryDate: string;
}

interface PurchaseInvoiceFormProps {
  organizationId: string;
  onClose: () => void;
  onSaved: () => void;
  initialSupplierId?: string;
  initialSupplier?: { name: string; phone?: string; address?: string; gstin?: string } | null;
}

export function PurchaseInvoiceForm({ organizationId, onClose, onSaved, initialSupplierId, initialSupplier }: PurchaseInvoiceFormProps) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: "", productName: "", batchNumber: "BATCH-01", quantity: 1, costPrice: 0, mrp: 0, expiryDate: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);

  // New supplier inline form
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState(initialSupplier?.name || "");
  const [newSupplierPhone, setNewSupplierPhone] = useState(initialSupplier?.phone || "");
  const [newSupplierGstin, setNewSupplierGstin] = useState(initialSupplier?.gstin || "");

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [organizationId]);

  useEffect(() => {
    if (initialSupplierId) {
      setSelectedSupplierId(initialSupplierId);
    } else if (initialSupplier?.name) {
      const existing = suppliers.find(
        (s) => s.name.toLowerCase() === initialSupplier.name.toLowerCase()
      );
      if (existing) {
        setSelectedSupplierId(existing.id);
      } else {
        setShowNewSupplier(true);
        setNewSupplierName(initialSupplier.name);
        if (initialSupplier.phone) setNewSupplierPhone(initialSupplier.phone);
        if (initialSupplier.gstin) setNewSupplierGstin(initialSupplier.gstin);
      }
    }
  }, [initialSupplierId, initialSupplier, suppliers]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, phone, gstin")
      .eq("organization_id", organizationId)
      .order("name");
    if (data) {
      setSuppliers(data);
      if (initialSupplierId && data.some((s) => s.id === initialSupplierId)) {
        setSelectedSupplierId(initialSupplierId);
      } else if (initialSupplier?.name) {
        const match = data.find(
          (s) => s.name.toLowerCase() === initialSupplier.name.toLowerCase()
        );
        if (match) {
          setSelectedSupplierId(match.id);
        }
      }
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        id, name, barcode, brand,
        product_batches ( id, batch_number, cost_price, mrp, expiry_date, stock )
      `)
      .eq("organization_id", organizationId)
      .order("name");
    if (data) setProducts(data as ProductOption[]);
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Please enter supplier name");
      return;
    }
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        organization_id: organizationId,
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        gstin: newSupplierGstin.trim().toUpperCase(),
      })
      .select("id, name, phone, gstin")
      .single();
    if (error) {
      toast.error(error.message || "Failed to add supplier");
      return;
    }
    setSuppliers((prev) => [...prev, data]);
    setSelectedSupplierId(data.id);
    setShowNewSupplier(false);
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierGstin("");
    toast.success("Supplier added and selected");
  };

  const generateBatchNumber = (index: number) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    updateLineItem(index, "batchNumber", `BN-${today}-${rand}`);
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { productId: "", productName: "", batchNumber: `BATCH-0${prev.length + 1}`, quantity: 1, costPrice: 0, mrp: 0, expiryDate: "" },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const selectProduct = (index: number, product: ProductOption) => {
    const latestBatch = product.product_batches?.[0];
    updateLineItem(index, "productId", product.id);
    updateLineItem(index, "productName", product.name);
    if (latestBatch) {
      if (latestBatch.cost_price) updateLineItem(index, "costPrice", Number(latestBatch.cost_price));
      if (latestBatch.mrp) updateLineItem(index, "mrp", Number(latestBatch.mrp));
      if (latestBatch.batch_number) updateLineItem(index, "batchNumber", latestBatch.batch_number);
      if (latestBatch.expiry_date) updateLineItem(index, "expiryDate", latestBatch.expiry_date);
    }
    setProductSearch((prev) => ({ ...prev, [index]: "" }));
    setShowProductDropdown(null);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.costPrice) || 0), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSave = async (markReceived: boolean) => {
    if (!user) { toast.error("User not authenticated"); return; }
    if (!selectedSupplierId) { toast.error("Please select a supplier"); return; }
    if (!invoiceNumber || !invoiceNumber.trim()) { toast.error("Please enter an invoice number"); return; }
    if (lineItems.some((li) => !li.productId || li.quantity <= 0)) {
      toast.error("Please select a product and enter a valid quantity (> 0) for all lines");
      return;
    }
    setSaving(true);
    try {
      // Always insert as draft first so the UPDATE trigger can fire for stock
      const { data: invoice, error: invError } = await supabase
        .from("purchase_invoices")
        .insert({
          organization_id: organizationId,
          supplier_id: selectedSupplierId,
          invoice_number: invoiceNumber.trim(),
          status: "draft",
          notes: notes ? `${notes} (GST: ${taxRate}%)` : (taxRate > 0 ? `GST: ${taxRate}%` : ""),
          total_amount: totalAmount,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (invError) throw invError;

      const items = lineItems.map((li) => ({
        purchase_invoice_id: invoice.id,
        product_id: li.productId,
        batch_number: li.batchNumber?.trim() || "BATCH-01",
        quantity: Number(li.quantity) || 1,
        cost_price: Number(li.costPrice) || 0,
        mrp: Number(li.mrp) || 0,
        expiry_date: li.expiryDate || null,
        received_quantity: markReceived ? (Number(li.quantity) || 1) : 0,
      }));

      const { error: itemsError } = await supabase.from("purchase_invoice_items").insert(items);
      if (itemsError) throw itemsError;

      // Update to 'received' triggers handle_purchase_receive() which auto-updates stock
      if (markReceived) {
        const { error: recvError } = await supabase
          .from("purchase_invoices")
          .update({ status: "received" })
          .eq("id", invoice.id);
        if (recvError) throw recvError;
      }

      toast.success(markReceived ? "Invoice saved & stock updated!" : "Invoice saved as draft");
      onSaved();
    } catch (err: any) {
      console.error("handleSave invoice failed:", err);
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = (index: number) => {
    const search = (productSearch[index] || "").toLowerCase();
    if (!search) return products.slice(0, 10);
    return products.filter(
      (p) => p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.toLowerCase().includes(search))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center px-3 sm:px-4 pt-3 sm:pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] overflow-y-auto">
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl shadow-xl w-full max-w-6xl w-[95vw] mb-0 sm:mb-8 max-h-[calc(100dvh-0.75rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">New Purchase Invoice</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Supplier & Invoice Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</Label>
              {!showNewSupplier ? (
                <div className="flex gap-2">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="icon" onClick={() => setShowNewSupplier(true)} title="Add new supplier">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30 mt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-primary uppercase tracking-wider">Smart Auto-fill</Label>
                    <CompanySearchAutocomplete 
                      onSelect={(comp) => {
                        setNewSupplierName(comp.name);
                        setNewSupplierPhone(comp.phone || newSupplierPhone);
                        // We are mapping CIN to GSTIN field as they often serve as Tax IDs, but user can edit.
                        setNewSupplierGstin(comp.cin || newSupplierGstin);
                      }}
                    />
                  </div>
                  <Input placeholder="Supplier name *" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Phone" value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                    <Input placeholder="GSTIN" value={newSupplierGstin} onChange={(e) => setNewSupplierGstin(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSupplier}>Add Supplier</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewSupplier(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice Number</Label>
              <Input placeholder="e.g. INV-2026-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>

            {/* Table header - desktop */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_0.7fr_0.8fr_0.8fr_1fr_auto] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              <span>Product</span>
              <span>Batch #</span>
              <span>Qty</span>
              <span>Cost ₹</span>
              <span>MRP ₹</span>
              <span>Expiry</span>
              <span></span>
            </div>

            <div className="space-y-2 max-h-[45dvh] sm:max-h-[300px] overflow-y-auto">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_0.7fr_0.8fr_0.8fr_1fr_auto] gap-2 p-2 rounded-lg border border-border bg-muted/20">
                  {/* Product selector */}
                  <div className="relative">
                    {item.productId ? (
                      <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background text-sm">
                        <span className="flex-1 truncate text-foreground">{item.productName}</span>
                        <button onClick={() => { updateLineItem(index, "productId", ""); updateLineItem(index, "productName", ""); }}>
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search product..."
                            className="pl-8"
                            value={productSearch[index] || ""}
                            onChange={(e) => {
                              setProductSearch((prev) => ({ ...prev, [index]: e.target.value }));
                              setShowProductDropdown(index);
                            }}
                            onFocus={() => setShowProductDropdown(index)}
                            onBlur={() => setTimeout(() => setShowProductDropdown(null), 200)}
                          />
                        </div>
                        {showProductDropdown === index && (
                          <div className="absolute z-[200] top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {filteredProducts(index).map((p) => (
                              <button
                                key={p.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-foreground"
                                onMouseDown={() => selectProduct(index, p)}
                              >
                                <span className="font-medium">{p.name}</span>
                                {p.barcode && <span className="text-muted-foreground ml-2 text-xs">({p.barcode})</span>}
                              </button>
                            ))}
                            {filteredProducts(index).length === 0 && (
                              <p className="px-3 py-2 text-sm text-muted-foreground">No products found</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Batch"
                      value={item.batchNumber}
                      onChange={(e) => updateLineItem(index, "batchNumber", e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-8 px-1 text-xs shrink-0 text-primary hover:bg-primary/10"
                      onClick={() => generateBatchNumber(index)}
                      title="Auto-generate Batch Number"
                    >
                      #
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity || ""}
                    onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Cost"
                    value={item.costPrice || ""}
                    onChange={(e) => updateLineItem(index, "costPrice", parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="MRP"
                    value={item.mrp || ""}
                    onChange={(e) => updateLineItem(index, "mrp", parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="date"
                    value={item.expiryDate}
                    onChange={(e) => updateLineItem(index, "expiryDate", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* GST & Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applicable GST / Tax Rate</Label>
              <div className="flex gap-2 items-center">
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                >
                  <option value={0}>0% (Tax Exempt / Nil)</option>
                  <option value={5}>5% (GST 5%)</option>
                  <option value={12}>12% (GST 12%)</option>
                  <option value={18}>18% (Standard GST 18%)</option>
                  <option value={28}>28% (GST 28%)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes & Remarks</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          {/* Total & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Subtotal: <strong className="text-foreground">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                {taxRate > 0 && (
                  <span>GST ({taxRate}%): <strong className="text-foreground">₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">
                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:flex gap-2 w-full sm:w-auto">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" /> Save as Draft
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => handleSave(true)} disabled={saving}>
                <PackageCheck className="w-4 h-4 mr-1.5" /> Save & Receive Stock
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
