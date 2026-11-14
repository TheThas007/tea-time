import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Share2,
  RotateCcw,
  CreditCard,
  Banknote,
  QrCode,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  Receipt,
  TrendingUp,
} from "lucide-react";

export interface PosProduct {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
}

export interface PosBillItem {
  productId: string;
  name: string;
  barcode: string;
  price: number;
  qty: number;
  total: number;
}

export type PosPaymentMethod = "CASH" | "CARD" | "QR" | "CREDIT";

export interface PosBill {
  id: string;
  billNumber: string;
  createdAtMs: number;
  items: PosBillItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  cashGiven?: number;
  balanceChange?: number;
  customerName?: string;
  customerPhone?: string;
  returnedItems?: { productId: string; name: string; qty: number; refundAmount: number; restocked: boolean }[];
}

export interface PosCreditRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  balance: number;
  updatedAtMs: number;
  history: { id: string; type: "CREDIT" | "PAYMENT"; amount: number; note: string; atMs: number }[];
}

interface BillingSystemTabProps {
  businessId: string;
  businessName: string;
  logoUrl?: string;
  currency?: string;
  existingMenuProducts?: { id: string; name: string; priceMinor?: number }[];
  initialItems?: { productId: string; name: string; price: number; qty: number }[] | null;
  initialCustomerPhone?: string | null;
  onInitialItemsConsumed?: () => void;
}

export const BillingSystemTab: React.FC<BillingSystemTabProps> = ({
  businessId,
  businessName,
  logoUrl,
  currency = "Rs.",
  existingMenuProducts = [],
  initialItems,
  initialCustomerPhone,
  onInitialItemsConsumed,
}) => {
  const productsKey = `menyo_pos_products_${businessId}`;
  const billsKey = `menyo_pos_bills_${businessId}`;
  const creditsKey = `menyo_pos_credits_${businessId}`;

  const [subTab, setSubTab] = useState<"pos" | "products" | "credits" | "returns" | "reports">("pos");
  const [reportRange, setReportRange] = useState<"daily" | "monthly" | "3months">("daily");

  const [products, setProducts] = useState<PosProduct[]>(() => {
    try {
      const raw = localStorage.getItem(productsKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return existingMenuProducts.map((p, idx) => ({
      id: p.id,
      name: p.name,
      barcode: `890${1000 + idx}`,
      price: Math.round((p.priceMinor || 0) / 100),
      stock: 50,
    }));
  });

  const [bills, setBills] = useState<PosBill[]>(() => {
    try {
      const raw = localStorage.getItem(billsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [credits, setCredits] = useState<PosCreditRecord[]>(() => {
    try {
      const raw = localStorage.getItem(creditsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(productsKey, JSON.stringify(products));
  }, [products, productsKey]);

  useEffect(() => {
    localStorage.setItem(billsKey, JSON.stringify(bills));
  }, [bills, billsKey]);

  useEffect(() => {
    localStorage.setItem(creditsKey, JSON.stringify(credits));
  }, [credits, creditsKey]);

  // POS Cashier State
  const [scanInput, setScanInput] = useState("");
  const [billItems, setBillItems] = useState<PosBillItem[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [creditCustomerName, setCreditCustomerName] = useState("");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState("");
  const [lastConfirmedBill, setLastConfirmedBill] = useState<PosBill | null>(null);
  const [billCustomerPhone, setBillCustomerPhone] = useState<string>("");
  const [posNotice, setPosNotice] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Thermal Receipt Customization
  const receiptCfgKey = `menyo_pos_receipt_cfg_${businessId}`;
  const [showReceiptCfg, setShowReceiptCfg] = useState(false);
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<"80mm" | "58mm">(() => {
    try {
      const raw = localStorage.getItem(receiptCfgKey);
      if (raw) return JSON.parse(raw).paperWidth || "80mm";
    } catch {}
    return "80mm";
  });
  const [receiptHeaderNote, setReceiptHeaderNote] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(receiptCfgKey);
      if (raw) return JSON.parse(raw).headerNote ?? "";
    } catch {}
    return "";
  });
  const [receiptFooterMsg, setReceiptFooterMsg] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(receiptCfgKey);
      if (raw) return JSON.parse(raw).footerMsg ?? "Thank you for visiting! Have a lovely day.";
    } catch {}
    return "Thank you for visiting! Have a lovely day.";
  });

  useEffect(() => {
    localStorage.setItem(
      receiptCfgKey,
      JSON.stringify({ paperWidth: receiptPaperWidth, headerNote: receiptHeaderNote, footerMsg: receiptFooterMsg })
    );
  }, [receiptCfgKey, receiptPaperWidth, receiptHeaderNote, receiptFooterMsg]);

  // E-Bill Setup (Message, WhatsApp Group, Google Review)
  const ebillCfgKey = `menyo_pos_ebill_cfg_${businessId}`;
  const [showEbillCfg, setShowEbillCfg] = useState(false);
  const [ebillMessage, setEbillMessage] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(ebillCfgKey);
      if (raw) return JSON.parse(raw).message ?? "Thank you for visiting! Here is your E-Bill:";
    } catch {}
    return "Thank you for visiting! Here is your E-Bill:";
  });
  const [ebillWhatsappGroup, setEbillWhatsappGroup] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(ebillCfgKey);
      if (raw) return JSON.parse(raw).whatsappGroup ?? "";
    } catch {}
    return "";
  });
  const [ebillGoogleReview, setEbillGoogleReview] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(ebillCfgKey);
      if (raw) return JSON.parse(raw).googleReview ?? "";
    } catch {}
    return "";
  });

  useEffect(() => {
    localStorage.setItem(
      ebillCfgKey,
      JSON.stringify({ message: ebillMessage, whatsappGroup: ebillWhatsappGroup, googleReview: ebillGoogleReview })
    );
  }, [ebillCfgKey, ebillMessage, ebillWhatsappGroup, ebillGoogleReview]);

  const sendEbill = (bill: PosBill) => {
    const lines = [
      `*${businessName.toUpperCase()}*`,
      `Bill: ${bill.billNumber}`,
      `Date: ${new Date(bill.createdAtMs).toLocaleString()}`,
      `------------------------------`,
      ...bill.items.map((i) => `${i.name} (${i.qty} x ${currency} ${i.price}) = ${currency} ${i.total.toLocaleString()}`),
      `------------------------------`,
      `Subtotal: ${currency} ${bill.subtotal.toLocaleString()}`,
      ...(bill.discount > 0 ? [`Discount: -${currency} ${bill.discount.toLocaleString()}`] : []),
      `*TOTAL: ${currency} ${bill.total.toLocaleString()}* (${bill.paymentMethod})`,
      ...(bill.balanceChange ? [`Balance Change: ${currency} ${bill.balanceChange.toLocaleString()}`] : []),
      ``,
      ebillMessage,
      ...(ebillWhatsappGroup.trim() ? [`Join our WhatsApp Group: ${ebillWhatsappGroup.trim()}`] : []),
      ...(ebillGoogleReview.trim() ? [`Rate us on Google: ${ebillGoogleReview.trim()}`] : []),
    ];
    const text = lines.join("\n");
    const cleanPhone = (bill.customerPhone || "").replace(/[^0-9]/g, "");
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } else if (navigator.share) {
      navigator.share({ title: `${businessName} - ${bill.billNumber}`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
  };

  const printThermalReceipt = (bill: PosBill) => {
    const win = window.open("", "_blank", "width=380,height=640");
    if (!win) return;
    const dateStr = new Date(bill.createdAtMs).toLocaleString();
    const itemsHtml = bill.items
      .map(
        (i) => `
        <tr>
          <td style="padding:3px 0;">${i.name}<br/><span style="font-size:10px;color:#555;">${i.qty} x ${currency} ${i.price.toLocaleString()}</span></td>
          <td style="text-align:right;vertical-align:top;padding:3px 0;font-weight:bold;">${currency} ${i.total.toLocaleString()}</td>
        </tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${bill.billNumber}</title>
  <style>
    @page { size: ${receiptPaperWidth} auto; margin: 3mm; }
    body { font-family: 'Courier New', Courier, monospace; width: ${receiptPaperWidth === "58mm" ? "52mm" : "72mm"}; margin: 0 auto; color: #000; font-size: 12px; line-height: 1.35; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="center">
    ${logoUrl ? `<img src="${logoUrl}" alt="${businessName}" style="max-height:48px;max-width:140px;margin:0 auto 4px;display:block;object-fit:contain;" />` : ""}
    <div class="bold" style="font-size:16px;text-transform:uppercase;">${businessName}</div>
    ${receiptHeaderNote ? `<div style="font-size:10px;margin-top:2px;">${receiptHeaderNote}</div>` : ""}
    <div style="font-size:10px;margin-top:3px;">${bill.billNumber} • ${dateStr}</div>
  </div>
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right;">${currency} ${bill.subtotal.toLocaleString()}</td></tr>
    ${bill.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-${currency} ${bill.discount.toLocaleString()}</td></tr>` : ""}
    <tr class="bold" style="font-size:14px;"><td>TOTAL</td><td style="text-align:right;">${currency} ${bill.total.toLocaleString()}</td></tr>
    <tr><td>Payment (${bill.paymentMethod})</td><td style="text-align:right;">${bill.cashGiven !== undefined ? `${currency} ${bill.cashGiven.toLocaleString()}` : `${currency} ${bill.total.toLocaleString()}`}</td></tr>
    ${bill.balanceChange !== undefined && bill.balanceChange > 0 ? `<tr><td>Balance Change</td><td style="text-align:right;">${currency} ${bill.balanceChange.toLocaleString()}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <div class="center" style="font-size:11px;margin-top:6px;">${receiptFooterMsg}</div>
  <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 300); };</script>
</body>
</html>`);
    win.document.close();
  };

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setBillItems(
        initialItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          barcode: "",
          price: i.price,
          qty: i.qty,
          total: i.price * i.qty,
        }))
      );
      setBillCustomerPhone(initialCustomerPhone || "");
      setSubTab("pos");
      onInitialItemsConsumed?.();
    }
  }, [initialItems, initialCustomerPhone, onInitialItemsConsumed]);

  // Add Product Form State
  const [newProdName, setNewProdName] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");

  // Credit Payment Modal/Inline State
  const [payCreditId, setPayCreditId] = useState<string | null>(null);
  const [payCreditAmount, setPayCreditAmount] = useState("");

  // Return / Refund State
  const [returnBillSearch, setReturnBillSearch] = useState("");
  const [selectedReturnBillId, setSelectedReturnBillId] = useState<string | null>(null);
  const [restockOnReturn, setRestockOnReturn] = useState(true);

  const subtotal = useMemo(() => billItems.reduce((sum, i) => sum + i.total, 0), [billItems]);
  const discountNum = Math.max(0, Number(discount) || 0);
  const billTotal = Math.max(0, subtotal - discountNum);
  const cashGivenNum = cashGiven.trim() === "" ? billTotal : Number(cashGiven) || 0;
  const balanceChange = paymentMethod === "CASH" ? Math.max(0, cashGivenNum - billTotal) : 0;

  const addProductToBill = (prod: PosProduct) => {
    if (prod.stock <= 0) {
      setPosNotice(`"${prod.name}" is out of stock!`);
      return;
    }
    setPosNotice(null);
    setBillItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        if (existing.qty + 1 > prod.stock) {
          setPosNotice(`Only ${prod.stock} left in stock for "${prod.name}".`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i
        );
      }
      return [
        ...prev,
        { productId: prod.id, name: prod.name, barcode: prod.barcode, price: prod.price, qty: 1, total: prod.price },
      ];
    });
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scanInput.trim().toLowerCase();
    if (!q) return;
    const exactBarcode = products.find((p) => p.barcode.toLowerCase() === q);
    if (exactBarcode) {
      addProductToBill(exactBarcode);
      setScanInput("");
      return;
    }
    const nameMatch = products.find((p) => p.name.toLowerCase().includes(q));
    if (nameMatch) {
      addProductToBill(nameMatch);
      setScanInput("");
      return;
    }
    setPosNotice(`No product found matching "${scanInput}".`);
  };

  const updateBillQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    setBillItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const nextQty = i.qty + delta;
          if (nextQty <= 0) return null;
          if (prod && nextQty > prod.stock) {
            setPosNotice(`Only ${prod.stock} in stock for "${prod.name}".`);
            return i;
          }
          return { ...i, qty: nextQty, total: nextQty * i.price };
        })
        .filter(Boolean) as PosBillItem[]
    );
  };

  const handleConfirmSale = () => {
    if (billItems.length === 0) return;
    if (paymentMethod === "CASH" && cashGivenNum < billTotal) {
      setPosNotice(`Cash given (${currency} ${cashGivenNum}) is less than Bill Total (${currency} ${billTotal}).`);
      return;
    }
    if (paymentMethod === "CREDIT" && (!creditCustomerName.trim() || !creditCustomerPhone.trim())) {
      setPosNotice("Please enter customer name and mobile number for Shop Credit.");
      return;
    }

    const billNumber = `INV-${1001 + bills.length}`;
    const newBill: PosBill = {
      id: `bill_${Date.now()}`,
      billNumber,
      createdAtMs: Date.now(),
      items: billItems,
      subtotal,
      discount: discountNum,
      total: billTotal,
      paymentMethod,
      cashGiven: paymentMethod === "CASH" ? cashGivenNum : undefined,
      balanceChange: paymentMethod === "CASH" ? balanceChange : undefined,
      customerName: paymentMethod === "CREDIT" ? creditCustomerName.trim() : undefined,
      customerPhone: paymentMethod === "CREDIT" ? creditCustomerPhone.trim() : (billCustomerPhone.trim() || undefined),
    };

    // Deduct stock
    setProducts((prev) =>
      prev.map((p) => {
        const sold = billItems.find((i) => i.productId === p.id);
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
      })
    );

    // Record credit if Shop Credit
    if (paymentMethod === "CREDIT") {
      const phone = creditCustomerPhone.trim();
      const name = creditCustomerName.trim();
      setCredits((prev) => {
        const existing = prev.find((c) => c.customerPhone === phone);
        const entry = {
          id: `hist_${Date.now()}`,
          type: "CREDIT" as const,
          amount: billTotal,
          note: `Bill ${billNumber}`,
          atMs: Date.now(),
        };
        if (existing) {
          return prev.map((c) =>
            c.customerPhone === phone
              ? { ...c, customerName: name, balance: c.balance + billTotal, updatedAtMs: Date.now(), history: [entry, ...c.history] }
              : c
          );
        }
        return [
          {
            id: `cred_${Date.now()}`,
            customerName: name,
            customerPhone: phone,
            balance: billTotal,
            updatedAtMs: Date.now(),
            history: [entry],
          },
          ...prev,
        ];
      });
    }

    setBills((prev) => [newBill, ...prev]);
    setLastConfirmedBill(newBill);
    setBillItems([]);
    setDiscount("0");
    setCashGiven("");
    setCreditCustomerName("");
    setCreditCustomerPhone("");
    setPosNotice(null);
    scanRef.current?.focus();
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;
    const prod: PosProduct = {
      id: `pos_${Date.now()}`,
      name: newProdName.trim(),
      barcode: newProdBarcode.trim() || `${Math.floor(100000 + Math.random() * 900000)}`,
      price: Math.max(0, Number(newProdPrice) || 0),
      stock: Math.max(0, Number(newProdStock) || 0),
    };
    setProducts((prev) => [prod, ...prev]);
    setNewProdName("");
    setNewProdBarcode("");
    setNewProdPrice("");
    setNewProdStock("");
  };

  const handleRecordCreditPayment = (creditId: string) => {
    const amt = Number(payCreditAmount) || 0;
    if (amt <= 0) return;
    setCredits((prev) =>
      prev.map((c) => {
        if (c.id !== creditId) return c;
        const paid = Math.min(c.balance, amt);
        return {
          ...c,
          balance: Math.max(0, c.balance - paid),
          updatedAtMs: Date.now(),
          history: [
            { id: `pay_${Date.now()}`, type: "PAYMENT", amount: paid, note: "Credit Payment", atMs: Date.now() },
            ...c.history,
          ],
        };
      })
    );
    setPayCreditId(null);
    setPayCreditAmount("");
  };

  const handleReturnItem = (bill: PosBill, item: PosBillItem) => {
    const returnQty = 1;
    const refundAmount = item.price * returnQty;
    if (restockOnReturn) {
      setProducts((prev) =>
        prev.map((p) => (p.id === item.productId ? { ...p, stock: p.stock + returnQty } : p))
      );
    }
    setBills((prev) =>
      prev.map((b) =>
        b.id === bill.id
          ? {
              ...b,
              returnedItems: [
                ...(b.returnedItems || []),
                { productId: item.productId, name: item.name, qty: returnQty, refundAmount, restocked: restockOnReturn },
              ],
            }
          : b
      )
    );
  };

  // Reports calculations (Daily / Monthly / 3 Months)
  const reportStartMs = useMemo(() => {
    const now = new Date();
    if (reportRange === "daily") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    }
    if (reportRange === "monthly") {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    }
    return new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0).getTime();
  }, [reportRange]);

  const filteredReportBills = bills.filter((b) => b.createdAtMs >= reportStartMs);
  const dailySales = filteredReportBills.reduce((s, b) => s + b.total, 0);
  const cashSales = filteredReportBills.filter((b) => b.paymentMethod === "CASH").reduce((s, b) => s + b.total, 0);
  const cardSales = filteredReportBills.filter((b) => b.paymentMethod === "CARD").reduce((s, b) => s + b.total, 0);
  const qrSales = filteredReportBills.filter((b) => b.paymentMethod === "QR").reduce((s, b) => s + b.total, 0);
  const creditSales = filteredReportBills.filter((b) => b.paymentMethod === "CREDIT").reduce((s, b) => s + b.total, 0);
  const totalOutstandingCredit = credits.reduce((s, c) => s + c.balance, 0);
  const lowStockProducts = products.filter((p) => p.stock <= 5);

  const searchMatches = scanInput.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(scanInput.toLowerCase()) ||
          p.barcode.toLowerCase().includes(scanInput.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#050F2A]/10 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "pos", label: "Cashier Billing", icon: Barcode },
            { id: "products", label: `Stock & Barcodes (${products.length})`, icon: PackagePlus },
            { id: "credits", label: `Customer Credit (${credits.filter((c) => c.balance > 0).length})`, icon: UserCheck },
            { id: "returns", label: "Returns & Refunds", icon: RotateCcw },
            { id: "reports", label: "Daily Reports", icon: TrendingUp },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                subTab === t.id
                  ? "bg-[#050F2A] text-white shadow-sm"
                  : "bg-[#050F2A]/[0.04] text-[#050F2A]/75 hover:bg-[#050F2A]/[0.08]"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowReceiptCfg((s) => !s);
              setShowEbillCfg(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F2FDFF] text-[#050F2A] border border-[#7BBBFF]/40 hover:bg-[#7BBBFF]/15 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Customize Bill ({receiptPaperWidth})
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEbillCfg((s) => !s);
              setShowReceiptCfg(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            E-Bill Setup
          </button>
        </div>
      </div>

      {showEbillCfg && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">E-Bill Message</label>
            <input
              type="text"
              value={ebillMessage}
              onChange={(e) => setEbillMessage(e.target.value)}
              placeholder="Thank you for visiting! Here is your E-Bill:"
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">Shop WhatsApp Group Link</label>
            <input
              type="url"
              value={ebillWhatsappGroup}
              onChange={(e) => setEbillWhatsappGroup(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">Google Review Link</label>
            <input
              type="url"
              value={ebillGoogleReview}
              onChange={(e) => setEbillGoogleReview(e.target.value)}
              placeholder="https://g.page/r/..."
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}

      {showReceiptCfg && (
        <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">Thermal Paper Size</label>
            <select
              value={receiptPaperWidth}
              onChange={(e) => setReceiptPaperWidth(e.target.value as "80mm" | "58mm")}
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs font-semibold"
            >
              <option value="80mm">80mm (Standard Restaurant Receipt)</option>
              <option value="58mm">58mm (Compact Mini Receipt)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">Header Note (Address / Tel)</label>
            <input
              type="text"
              value={receiptHeaderNote}
              onChange={(e) => setReceiptHeaderNote(e.target.value)}
              placeholder="e.g. No. 12, Main St • Tel: 077 123 4567"
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#050F2A]/70 mb-1">Lovely Visit Message (Footer)</label>
            <input
              type="text"
              value={receiptFooterMsg}
              onChange={(e) => setReceiptFooterMsg(e.target.value)}
              placeholder="Thank you for visiting! Have a lovely day."
              className="w-full rounded-xl border border-[#050F2A]/15 px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}

      {/* 1. CASHIER BILLING */}
      {subTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scan & Items */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm space-y-4">
              <form onSubmit={handleScanSubmit} className="relative">
                <Search className="w-4 h-4 text-[#050F2A]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={scanRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan barcode or search product name (press Enter)..."
                  className="w-full rounded-xl border border-[#050F2A]/15 bg-[#F2FDFF]/40 pl-10 pr-4 py-3 text-sm text-[#050F2A] focus:border-[#050F2A] focus:outline-none"
                />
                {searchMatches.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#050F2A]/10 bg-white shadow-lg divide-y divide-[#050F2A]/5">
                    {searchMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          addProductToBill(p);
                          setScanInput("");
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-[#F2FDFF] transition"
                      >
                        <div>
                          <span className="font-semibold text-[#050F2A]">{p.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-[#050F2A]/50">#{p.barcode}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-[#050F2A]/60">Stock: {p.stock}</span>
                          <span className="font-bold text-[#050F2A]">
                            {currency} {p.price.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {posNotice && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                  {posNotice}
                </div>
              )}

              {/* Bill Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#050F2A]/10 text-[10px] uppercase tracking-wider text-[#050F2A]/60">
                    <tr>
                      <th className="py-2.5">Item</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Total</th>
                      <th className="py-2.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#050F2A]/10">
                    {billItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#050F2A]/45">
                          Scan a barcode or search a product above to start billing.
                        </td>
                      </tr>
                    ) : (
                      billItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="py-3">
                            <div className="font-semibold text-[#050F2A]">{item.name}</div>
                            <div className="text-[11px] text-[#050F2A]/50">
                              {currency} {item.price.toLocaleString()} each
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateBillQty(item.productId, -1)}
                                className="w-6 h-6 rounded-lg bg-[#050F2A]/[0.06] flex items-center justify-center hover:bg-[#050F2A]/15"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold w-6 text-center">{item.qty}</span>
                              <button
                                onClick={() => updateBillQty(item.productId, 1)}
                                className="w-6 h-6 rounded-lg bg-[#050F2A]/[0.06] flex items-center justify-center hover:bg-[#050F2A]/15"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-right font-bold text-[#050F2A]">
                            {currency} {item.total.toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => updateBillQty(item.productId, -item.qty)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Last Confirmed Receipt */}
            {lastConfirmedBill && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Sale Confirmed • {lastConfirmedBill.billNumber}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printThermalReceipt(lastConfirmedBill)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#050F2A] ring-1 ring-black/10 hover:bg-slate-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    {lastConfirmedBill.customerPhone && (
                      <button
                        onClick={() => sendEbill(lastConfirmedBill)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#050F2A] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Send E-Bill
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-emerald-700">
                  Total: <strong>{currency} {lastConfirmedBill.total.toLocaleString()}</strong> ({lastConfirmedBill.paymentMethod})
                  {lastConfirmedBill.balanceChange !== undefined && ` • Balance Change: ${currency} ${lastConfirmedBill.balanceChange.toLocaleString()}`}
                </p>
              </div>
            )}
          </div>

          {/* Right: Totals & Payment */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#050F2A] flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Payment Summary
              </h3>

              <div className="space-y-2 text-xs border-b border-[#050F2A]/10 pb-3">
                <div className="flex justify-between text-[#050F2A]/70">
                  <span>Subtotal</span>
                  <span>{currency} {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#050F2A]/70">
                  <span>Discount ({currency})</span>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 rounded-lg border border-[#050F2A]/15 px-2 py-1 text-right text-xs font-semibold text-[#050F2A]"
                  />
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#050F2A] pt-1">
                  <span>Bill Total</span>
                  <span>{currency} {billTotal.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#050F2A]/60 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "CARD", label: "Card", icon: CreditCard },
                    { id: "QR", label: "QR Pay", icon: QrCode },
                    { id: "CREDIT", label: "Shop Credit", icon: UserCheck },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PosPaymentMethod)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold border transition ${
                        paymentMethod === m.id
                          ? "bg-[#050F2A] text-white border-[#050F2A]"
                          : "bg-white text-[#050F2A]/80 border-[#050F2A]/15 hover:bg-slate-50"
                      }`}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "CASH" && (
                <div className="space-y-2 rounded-xl bg-[#F2FDFF] p-3.5 border border-[#7BBBFF]/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#050F2A]">Cash Given ({currency}) <span className="font-normal text-[#050F2A]/50">(Optional)</span></span>
                    <input
                      type="number"
                      min={0}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder={String(billTotal)}
                      className="w-28 rounded-lg border border-[#050F2A]/20 bg-white px-2.5 py-1.5 text-right font-bold text-[#050F2A]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm font-extrabold text-emerald-700">
                    <span>Balance Change</span>
                    <span>{currency} {balanceChange.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "CREDIT" && (
                <div className="space-y-2.5 rounded-xl bg-amber-50 p-3.5 border border-amber-200">
                  <input
                    type="text"
                    value={creditCustomerName}
                    onChange={(e) => setCreditCustomerName(e.target.value)}
                    placeholder="Customer Name *"
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="tel"
                    value={creditCustomerPhone}
                    onChange={(e) => setCreditCustomerPhone(e.target.value)}
                    placeholder="Mobile Number *"
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={billItems.length === 0}
                onClick={handleConfirmSale}
                className="w-full rounded-xl bg-[#050F2A] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0B1F4D] disabled:opacity-40 transition"
              >
                Confirm Sale • {currency} {billTotal.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STOCK & BARCODES */}
      {subTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleAddProduct} className="lg:col-span-4 bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm space-y-3 h-fit">
            <h3 className="font-bold text-sm text-[#050F2A]">Add POS Product & Stock</h3>
            <input
              type="text"
              required
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="Product Name (e.g. Milk)"
              className="w-full rounded-xl border border-[#050F2A]/15 px-3.5 py-2.5 text-xs"
            />
            <input
              type="text"
              value={newProdBarcode}
              onChange={(e) => setNewProdBarcode(e.target.value)}
              placeholder="Barcode (leave blank to auto-generate)"
              className="w-full rounded-xl border border-[#050F2A]/15 px-3.5 py-2.5 text-xs font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                required
                min={0}
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                placeholder={`Selling Price (${currency})`}
                className="w-full rounded-xl border border-[#050F2A]/15 px-3.5 py-2.5 text-xs"
              />
              <input
                type="number"
                required
                min={0}
                value={newProdStock}
                onChange={(e) => setNewProdStock(e.target.value)}
                placeholder="Opening Stock"
                className="w-full rounded-xl border border-[#050F2A]/15 px-3.5 py-2.5 text-xs"
              />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#050F2A] py-2.5 text-xs font-bold text-white">
              Save Product
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#050F2A]/10 text-[10px] uppercase text-[#050F2A]/60">
                <tr>
                  <th className="py-2.5">Product</th>
                  <th className="py-2.5">Barcode</th>
                  <th className="py-2.5">Price</th>
                  <th className="py-2.5">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#050F2A]/10">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-semibold text-[#050F2A]">{p.name}</td>
                    <td className="py-3 font-mono text-[#050F2A]/60">{p.barcode}</td>
                    <td className="py-3 font-bold">{currency} {p.price.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${p.stock <= 5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {p.stock} left
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER CREDIT */}
      {subTab === "credits" && (
        <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#050F2A]">Customer Credit Accounts</h3>
          {credits.length === 0 ? (
            <p className="text-xs text-[#050F2A]/50 py-8 text-center">No customer credit records yet.</p>
          ) : (
            <div className="divide-y divide-[#050F2A]/10">
              {credits.map((c) => (
                <div key={c.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-[#050F2A]">{c.customerName}</div>
                    <div className="text-xs text-[#050F2A]/60">{c.customerPhone}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-rose-600">
                      Balance: {currency} {c.balance.toLocaleString()}
                    </span>
                    {c.balance > 0 && (
                      payCreditId === c.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={payCreditAmount}
                            onChange={(e) => setPayCreditAmount(e.target.value)}
                            placeholder="Amount"
                            className="w-24 rounded-lg border px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleRecordCreditPayment(c.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPayCreditId(c.id);
                            setPayCreditAmount(String(c.balance));
                          }}
                          className="rounded-xl bg-[#050F2A] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Record Payment
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. RETURNS & REFUNDS */}
      {subTab === "returns" && (
        <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-[#050F2A]">Returns & Refunds</h3>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#050F2A]">
              <input
                type="checkbox"
                checked={restockOnReturn}
                onChange={(e) => setRestockOnReturn(e.target.checked)}
              />
              Restock item if in resalable condition
            </label>
          </div>
          <input
            type="text"
            value={returnBillSearch}
            onChange={(e) => setReturnBillSearch(e.target.value)}
            placeholder="Search by Bill Number (e.g. INV-1001)..."
            className="w-full max-w-sm rounded-xl border border-[#050F2A]/15 px-3.5 py-2 text-xs"
          />
          <div className="divide-y divide-[#050F2A]/10">
            {bills
              .filter((b) => !returnBillSearch.trim() || b.billNumber.toLowerCase().includes(returnBillSearch.toLowerCase()))
              .slice(0, 10)
              .map((b) => (
                <div key={b.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#050F2A]">
                      {b.billNumber} • {currency} {b.total.toLocaleString()} ({b.paymentMethod})
                    </span>
                    <button
                      onClick={() => setSelectedReturnBillId(selectedReturnBillId === b.id ? null : b.id)}
                      className="text-xs font-semibold text-indigo-600"
                    >
                      {selectedReturnBillId === b.id ? "Hide Items" : "Select Items to Return"}
                    </button>
                  </div>
                  {selectedReturnBillId === b.id && (
                    <div className="pl-4 space-y-1.5">
                      {b.items.map((it) => (
                        <div key={it.productId} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg">
                          <span>{it.name} (Qty: {it.qty})</span>
                          <button
                            onClick={() => handleReturnItem(b, it)}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Refund 1 ({currency} {it.price})
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. DAILY / MONTHLY / 3-MONTH REPORTS */}
      {subTab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[
                { id: "daily", label: "Daily Report" },
                { id: "monthly", label: "Monthly Report" },
                { id: "3months", label: "3-Month Report" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReportRange(r.id as "daily" | "monthly" | "3months")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    reportRange === r.id
                      ? "bg-[#050F2A] text-white shadow-sm"
                      : "bg-white text-[#050F2A]/70 border border-[#050F2A]/10 hover:bg-slate-50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-[#050F2A]/60">
              {filteredReportBills.length} bill(s)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-4">
              <div className="text-[11px] font-semibold text-[#050F2A]/55">
                {reportRange === "daily" ? "Daily Sales" : reportRange === "monthly" ? "Monthly Sales" : "3-Month Sales"}
              </div>
              <div className="text-xl font-extrabold text-[#050F2A] mt-1">{currency} {dailySales.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-4">
              <div className="text-[11px] font-semibold text-[#050F2A]/55">Cash / Card / QR</div>
              <div className="text-xs font-bold text-[#050F2A] mt-1">
                Cash: {currency} {cashSales.toLocaleString()} • Card: {currency} {cardSales.toLocaleString()} • QR: {currency} {qrSales.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-4">
              <div className="text-[11px] font-semibold text-[#050F2A]/55">Customer Credit</div>
              <div className="text-xl font-extrabold text-amber-600 mt-1">{currency} {totalOutstandingCredit.toLocaleString()}</div>
              <div className="text-[10px] text-[#050F2A]/50">Today Credit: {currency} {creditSales.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#050F2A]/10 p-4">
              <div className="text-[11px] font-semibold text-[#050F2A]/55">Low-Stock Alerts</div>
              <div className="text-xl font-extrabold text-rose-600 mt-1">{lowStockProducts.length}</div>
            </div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" /> Low-Stock Items (5 or fewer left)
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((p) => (
                  <span key={p.id} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                    {p.name}: {p.stock} left
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

