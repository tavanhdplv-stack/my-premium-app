// app/statusConfig.ts

export interface OrderStatus {
  id: string;
  label: string;
  english: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  order: number;
  description: string;
  isCancelled: boolean;
}

export const ORDER_STATUSES: OrderStatus[] = [
  {
    id: 'ຮັບອໍເດີແລ້ວ',
    label: 'ຮັບອໍເດີແລ້ວ',
    english: 'Order Received',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'Inbox',
    order: 1,
    description: 'ຮັບອໍເດີຈາກລູກຄ້າ ລໍຖ້າການດຳເນີນການ',
    isCancelled: false,
  },
  {
    id: 'ສົ່ງບິນແລ້ວ',
    label: 'ສົ່ງບິນແລ້ວ',
    english: 'Invoice Sent',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'FileText',
    order: 2,
    description: 'ສົ່ງບິນຫຼືແຈ້ງຍອດໃຫ້ລູກຄ້າແລ້ວ',
    isCancelled: false,
  },
  {
    id: 'ກວດສອບແລ້ວ',
    label: 'ກວດສອບແລ້ວ',
    english: 'Verified',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'CheckCircle',
    order: 3,
    description: 'ກວດສອບຂໍ້ມູນອໍເດີຖືກຕ້ອງ',
    isCancelled: false,
  },
  {
    id: 'ໂອນມັດຈຳແລ້ວ',
    label: 'ໂອນມັດຈຳແລ້ວ',
    english: 'Deposit Received',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'Wallet',
    order: 4,
    description: 'ລູກຄ້າໂອນເງິນມັດຈຳຮຽບຮ້ອຍ',
    isCancelled: false,
  },
  {
    id: 'ສັ່ງເຄື່ອງແລ້ວ',
    label: 'ສັ່ງເຄື່ອງແລ້ວ',
    english: 'Order Placed',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'ShoppingCart',
    order: 5,
    description: 'ສັ່ງສິນຄ້າຈາກຮ້ານຫຼືຊັບພະຍາກອນແລ້ວ',
    isCancelled: false,
  },
  {
    id: 'ເຄື່ອງມາຮອດແລ້ວ',
    label: 'ເຄື່ອງມາຮອດແລ້ວ',
    english: 'Items Arrived',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'Package',
    order: 6,
    description: 'ສິນຄ້າມາຮອດສາງ ພ້ອມຈັດສົ່ງ',
    isCancelled: false,
  },
  {
    id: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ',
    label: 'ສົ່ງເຄື່ອງໃຫ້ລູກຄ້າແລ້ວ',
    english: 'Delivered to Customer',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'Truck',
    order: 7,
    description: 'ສົ່ງສິນຄ້າໃຫ້ລູກຄ້າແລ້ວ',
    isCancelled: false,
  },
  {
    id: 'ໄດ້ຮັບເງິນແລ້ວ',
    label: 'ໄດ້ຮັບເງິນແລ້ວ',
    english: 'Payment Received',
    color: 'text-teal-700',
    bg: 'bg-teal-100',
    border: 'border-teal-300',
    icon: 'Check',
    order: 8,
    description: 'ໄດ້ຮັບຊຳລະເງິນຄົບຖ້ວນ ປິດອໍເດີ',
    isCancelled: false,
  },
  {
    id: 'ຍົກເລີກອໍເດີ',
    label: 'ຍົກເລີກອໍເດີ',
    english: 'Cancelled',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: 'XCircle',
    order: 9,
    description: 'ຍົກເລີກອໍເດີນີ້',
    isCancelled: true,
  },
];

// ============================================
// Helper Functions
// ============================================

export const getStatusById = (id: string): OrderStatus | undefined => {
  return ORDER_STATUSES.find((s) => s.id === id);
};

export const getStatusByOrder = (order: number): OrderStatus | undefined => {
  return ORDER_STATUSES.find((s) => s.order === order);
};

export const getDefaultStatus = (): OrderStatus => {
  return ORDER_STATUSES.find((s) => !s.isCancelled) || ORDER_STATUSES[0];
};

export const getCancelledStatus = (): OrderStatus => {
  return ORDER_STATUSES.find((s) => s.isCancelled)!;
};

export const isCancelled = (statusId: string): boolean => {
  return getStatusById(statusId)?.isCancelled || false;
};

export const getActiveStatuses = (): OrderStatus[] => {
  return ORDER_STATUSES.filter((s) => !s.isCancelled);
};

export const getStatusOptions = () => {
  return ORDER_STATUSES.map((s) => ({
    value: s.id,
    label: s.label,
  }));
};

export const getStatusColor = (statusId: string): string => {
  return getStatusById(statusId)?.color || 'text-slate-600';
};

export const getStatusBg = (statusId: string): string => {
  return getStatusById(statusId)?.bg || 'bg-slate-50';
};