import { useState } from "react";
import { StorefrontOrder } from "@/types/storefront";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
  MessageCircle,
  Receipt,
  Eye,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface StorefrontOrdersTabProps {
  orders: StorefrontOrder[];
  ordersLoading: boolean;
  onUpdateStatus: (orderId: string, status: "pending" | "confirmed" | "completed" | "cancelled") => Promise<void>;
  onRefresh: () => void;
}

export function StorefrontOrdersTab({
  orders,
  ordersLoading,
  onUpdateStatus,
  onRefresh,
}: StorefrontOrdersTabProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<StorefrontOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.status === statusFilter;
  });

  const getStatusBadge = (status: StorefrontOrder["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">Confirmed</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const handleConvertToInvoice = (order: StorefrontOrder) => {
    // Navigate to POS or Sales with pre-filled state
    toast.success(`Preparing invoice for Order #${order.order_number}...`);
    navigate(ROUTE_PATHS.checkout, {
      state: {
        fromStorefrontOrder: true,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        items: order.items.map((it) => ({
          productId: it.product_id,
          name: it.name,
          qty: it.quantity,
          rate: it.price,
          unit: it.unit,
        })),
        total: order.total_amount,
      },
    });
  };

  const openWhatsAppChat = (phone: string, orderNumber: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const target = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Namaste! Regarding your order #${orderNumber} placed on our CredSmart Digital Storefront:`;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Orders</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {orders.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-amber-700 font-medium">Pending Orders</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {orders.filter((o) => o.status === "pending").length}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-blue-700 font-medium">Confirmed / In Prep</span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {orders.filter((o) => o.status === "confirmed").length}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs text-emerald-700 font-medium">Completed</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {orders.filter((o) => o.status === "completed").length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["all", "pending", "confirmed", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          className="h-8 text-xs rounded-xl border-slate-200"
        >
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {ordersLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No orders received yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Share your digital catalogue link on WhatsApp or print your counter QR standee to start receiving customer orders!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Order Header & Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 font-mono">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      {order.delivery_type === "home_delivery" ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Home Delivery</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Store Pickup</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Customer Details */}
                  <div className="mt-1.5">
                    <span className="text-sm font-bold text-slate-900 mr-2">
                      {order.customer_name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({order.customer_phone})
                    </span>
                    {order.customer_address && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                        📍 {order.customer_address}
                      </p>
                    )}
                  </div>

                  {/* Item preview */}
                  <p className="text-xs text-slate-500 mt-1">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}:{" "}
                    <span className="text-slate-700 font-medium">
                      {order.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                    </span>
                  </p>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900 block leading-none">
                      ₹{order.total_amount}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {order.delivery_charge > 0 ? `Incl. ₹${order.delivery_charge} delivery` : "Free Delivery"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp Chat button */}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => openWhatsAppChat(order.customer_phone, order.order_number)}
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>

                    {/* Convert to Invoice */}
                    <Button
                      size="sm"
                      onClick={() => handleConvertToInvoice(order)}
                      className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Create Bill</span>
                    </Button>

                    {/* Status Dropdown */}
                    <Select
                      value={order.status}
                      onValueChange={(val) =>
                        onUpdateStatus(
                          order.id,
                          val as "pending" | "confirmed" | "completed" | "cancelled"
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-28 rounded-xl text-xs border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
