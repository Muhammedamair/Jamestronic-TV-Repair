export type TicketStatus =
    | 'CREATED'
    | 'DIAGNOSED'
    | 'PICKUP_SCHEDULED'
    | 'PICKED_UP'
    | 'IN_REPAIR'
    | 'QUOTATION_SENT'
    | 'APPROVED'
    | 'REPAIRED'
    | 'DELIVERY_SCHEDULED'
    | 'DELIVERED'
    | 'CLOSED';

export const TICKET_STATUS_ORDER: TicketStatus[] = [
    'CREATED',
    'DIAGNOSED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_REPAIR',
    'QUOTATION_SENT',
    'APPROVED',
    'REPAIRED',
    'DELIVERY_SCHEDULED',
    'DELIVERED',
    'CLOSED',
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    CREATED: 'Created',
    DIAGNOSED: 'Diagnosed',
    PICKUP_SCHEDULED: 'Pickup Scheduled',
    PICKED_UP: 'Picked Up',
    IN_REPAIR: 'In Repair',
    QUOTATION_SENT: 'Quotation Sent',
    APPROVED: 'Approved',
    REPAIRED: 'Repaired',
    DELIVERY_SCHEDULED: 'Delivery Scheduled',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
    CREATED: '#6C63FF',
    DIAGNOSED: '#8B85FF',
    PICKUP_SCHEDULED: '#F59E0B',
    PICKED_UP: '#F59E0B',
    IN_REPAIR: '#00D9FF',
    QUOTATION_SENT: '#F97316',
    APPROVED: '#10B981',
    REPAIRED: '#10B981',
    DELIVERY_SCHEDULED: '#3B82F6',
    DELIVERED: '#10B981',
    CLOSED: '#6B7280',
};

export const TV_BRANDS = [
    'Samsung', 'LG', 'Sony', 'Panasonic', 'TCL', 'Hisense',
    'Mi (Xiaomi)', 'OnePlus', 'Vu', 'Toshiba', 'Philips',
    'Micromax', 'Haier', 'Thomson', 'Realme', 'Motorola',
    'Nokia', 'Sansui', 'BPL', 'Videocon', 'Other'
];

export interface Customer {
    id: string;
    name: string;
    mobile: string;
    alt_mobile?: string;
    address: string;
    area?: string;
    created_at: string;
    updated_at: string;
}

export type TicketServiceType = 'REPAIR' | 'INSTALLATION';

export interface Ticket {
    id: string;
    ticket_number: string;
    service_type: TicketServiceType;
    customer_id: string;
    customer?: Customer;
    tv_brand: string;
    tv_model?: string;
    tv_size?: string;
    issue_description: string;
    diagnosed_issue?: string;
    status: TicketStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimated_cost?: number;
    warranty_months?: number;
    warranty_expiry_date?: string;
    created_at: string;
    updated_at: string;
}

export interface TicketNote {
    id: string;
    ticket_id: string;
    note_type: 'DIAGNOSIS' | 'FOLLOW_UP' | 'INTERNAL' | 'CUSTOMER_UPDATE';
    content: string;
    created_at: string;
}

export interface QuotationItem {
    name: string;
    qty: number;
    unit_price: number;
    total: number;
}

export interface Quotation {
    id: string;
    ticket_id: string;
    items: QuotationItem[];
    labour_charge: number;
    discount: number;
    total: number;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
    created_at: string;
    updated_at: string;
}

export interface Invoice {
    id: string;
    ticket_id: string;
    quotation_id?: string;
    amount: number;
    amount_paid: number;
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
    payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
    notes?: string;
    created_at: string;
}

export interface Review {
    id: string;
    customer_name: string;
    rating: number;
    review_text?: string;
    source: 'GOOGLE' | 'MANUAL' | 'WHATSAPP';
    response_text?: string;
    status: 'PENDING' | 'RESPONDED' | 'ARCHIVED';
    review_date: string;
    created_at: string;
}

export interface DashboardStats {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    completedTickets: number;
    revenueThisMonth: number;
    avgResolutionDays: number;
}

// ============================================
// VERSION 2 TYPES
// ============================================

export type AppRole = 'ADMIN' | 'DEALER' | 'TECHNICIAN' | 'DRIVER';

export interface UserRole {
    id: string; // matches auth.users.id
    role: AppRole;
    created_at: string;
    updated_at: string;
}

export interface Dealer {
    id: string;
    user_id?: string | null;
    name: string;
    contact_person?: string;
    mobile: string;
    address?: string;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
    bids?: PartBid[];
}

export type PartRequestStatus = 'OPEN' | 'BIDS_RECEIVED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

export interface PartRequest {
    id: string;
    ticket_id?: string | null;
    part_name: string;
    tv_brand: string;
    tv_model?: string;
    tv_size?: string;
    description?: string;
    status: PartRequestStatus;
    assigned_dealer_id?: string | null;
    approved_price?: number | null;
    image_urls?: string[];
    target_dealer_ids?: string[] | null;
    created_at: string;
    updated_at: string;
    // Joined relations for UI
    ticket?: Ticket;
    dealer?: Dealer;
    bids?: PartBid[];
}

export interface PartBid {
    id: string;
    request_id: string;
    dealer_id: string;
    price: number;
    notes?: string;
    is_accepted: boolean;
    image_urls?: string[];
    created_at: string;
    updated_at: string;
    // Joined relations
    dealer?: Dealer;
}
