const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8006';
const API = `${BACKEND_URL}/api`;

export type Role = 'admin' | 'master' | 'chef';
export type ItemTag = 'most_selling' | 'must_buy';

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  tag?: ItemTag | null;
  image_base64?: string | null;
  created_at: string;
};

export type OrderItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_base64?: string | null;
};

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export type Order = {
  id: string;
  token_number: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment?: Record<string, any> | null;
  table_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type RazorpayIntent = {
  intent_id: string;
  razorpay_order_id: string;
  key_id: string;
  amount: number;
  currency: string;
  checkout_url: string;
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  verifyRole: (role: Role, password: string) =>
    fetch(`${API}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
    }).then(r => handle<{ ok: boolean; role: Role }>(r)),

  listCategories: () => fetch(`${API}/categories`).then(r => handle<Category[]>(r)),
  createCategory: (name: string) =>
    fetch(`${API}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => handle<Category>(r)),
  updateCategory: (id: string, name: string) =>
    fetch(`${API}/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => handle<Category>(r)),
  deleteCategory: (id: string) =>
    fetch(`${API}/categories/${id}`, { method: 'DELETE' }).then(r => handle<{ ok: boolean }>(r)),

  listMenu: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetch(`${API}/menu${q}`).then(r => handle<MenuItem[]>(r));
  },
  createMenuItem: (body: {
    name: string;
    price: number;
    category: string;
    tag?: ItemTag | null;
    image_base64?: string | null;
  }) =>
    fetch(`${API}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<MenuItem>(r)),
  updateMenuItem: (id: string, body: {
    name: string;
    price: number;
    tag?: ItemTag | null;
    image_base64?: string | null;
  }) =>
    fetch(`${API}/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<MenuItem>(r)),
  deleteMenuItem: (id: string) =>
    fetch(`${API}/menu/${id}`, { method: 'DELETE' }).then(r => handle<{ ok: boolean }>(r)),

  listOrders: (status?: OrderStatus) => {
    const q = status ? `?status=${status}` : '';
    return fetch(`${API}/orders${q}`).then(r => handle<Order[]>(r));
  },
  createOrder: (body: {
    items: OrderItem[];
    table_number?: string;
    notes?: string;
  }) =>
    fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<Order>(r)),
  updateStatus: (id: string, status: OrderStatus) =>
    fetch(`${API}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(r => handle<Order>(r)),

  // Razorpay
  rzpStatus: () =>
    fetch(`${API}/razorpay/settings/status`).then(r =>
      handle<{ configured: boolean; key_id_masked: string | null }>(r),
    ),
  rzpSaveSettings: (key_id: string, key_secret: string) =>
    fetch(`${API}/razorpay/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_id, key_secret }),
    }).then(r => handle<{ ok: boolean; key_id_masked: string }>(r)),
  rzpClearSettings: () =>
    fetch(`${API}/razorpay/settings`, { method: 'DELETE' }).then(r =>
      handle<{ ok: boolean }>(r),
    ),
  rzpCreateIntent: (body: {
    items: OrderItem[];
    table_number?: string;
    notes?: string;
  }) =>
    fetch(`${API}/razorpay/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<RazorpayIntent>(r)),
  rzpGetIntent: (id: string) =>
    fetch(`${API}/razorpay/intent/${id}`).then(r =>
      handle<{
        id: string;
        status: 'pending' | 'completed' | 'failed';
        created_order_id: string | null;
      }>(r),
    ),

  dailyReportUrl: (dateISO?: string) => {
    const q = dateISO ? `?date=${dateISO}` : '';
    return `${API}/reports/daily.xlsx${q}`;
  },
};
