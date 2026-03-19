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
    | 'CLOSED'
    // Installation-specific statuses
    | 'CONFIRMED'
    | 'EN_ROUTE'
    | 'INSTALLED'
    | 'PAYMENT_COLLECTED';

// ---- REPAIR workflow (11 steps) ----
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

// ---- INSTALLATION workflow (6 steps) ----
export const INSTALLATION_STATUS_ORDER: TicketStatus[] = [
    'CREATED',
    'CONFIRMED',
    'EN_ROUTE',
    'INSTALLED',
    'PAYMENT_COLLECTED',
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
    // Installation labels
    CONFIRMED: 'Confirmed',
    EN_ROUTE: 'Technician Dispatched',
    INSTALLED: 'TV Installed',
    PAYMENT_COLLECTED: 'Payment Collected',
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
    // Installation colors
    CONFIRMED: '#10B981',
    EN_ROUTE: '#3B82F6',
    INSTALLED: '#00D9FF',
    PAYMENT_COLLECTED: '#F59E0B',
};

export const TV_BRANDS = [
    'Samsung', 'LG', 'Sony', 'Panasonic', 'TCL', 'Hisense',
    'Mi (Xiaomi)', 'OnePlus', 'Vu', 'Toshiba', 'Philips',
    'Micromax', 'Haier', 'Thomson', 'Realme', 'Motorola',
    'Nokia', 'Sansui', 'BPL', 'Videocon', 'Other'
];

export interface PushNotificationDevice {
    user_id: string; // Refers to profiles.id
    token: string;
    device_type: string; // 'android' | 'ios' | 'web'
    created_at: string;
    updated_at: string;
}

// -----------------------------------------------------
// 📦 Promotional Banners (Landing Page Carousel)
// -----------------------------------------------------
export interface PromotionalBanner {
    id: string;
    image_url: string;
    link_url?: string;
    is_active: boolean;
    order_index: number;
    // Content fields (admin-editable)
    title?: string;
    subtitle?: string;
    highlight_text?: string;
    tag_text?: string;
    offer_text?: string;
    gradient_start?: string;
    gradient_end?: string;
    banner_type?: string;      // 'hero' | 'promo_card'
    animation_style?: string;  // 'particles' | 'shimmer' | 'waves' | 'celebration'
    created_at: string;
    updated_at: string;
}

export type TicketServiceType = 'REPAIR' | 'INSTALLATION';

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
    time_slot?: string;
    status: TicketStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimated_cost?: number;
    assigned_technician_id?: string | null;
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
    sender_type?: 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';
    is_read?: boolean;
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

export type PartRequestStatus = 'PENDING_REVIEW' | 'OPEN' | 'BIDS_RECEIVED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

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

// ============================================
// TECHNICIAN TYPES
// ============================================

export type TechStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANT_REPAIR' | 'PART_REQUIRED';

export interface Technician {
    id: string;
    user_id?: string | null;
    name: string;
    mobile: string;
    specialization?: string;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
}

export interface TicketTechnicianLog {
    id: string;
    ticket_id: string;
    technician_id: string;
    assigned_at: string;
    started_at?: string | null;
    completed_at?: string | null;
    tech_status: TechStatus;
    notes?: string | null;
    created_at: string;
    // Joined
    technician?: Technician;
    ticket?: Ticket;
}

// ============================================
// TRANSPORTER TYPES
// ============================================

export type TransportJobStatus = 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Transporter {
    id: string;
    user_id?: string | null;
    name: string;
    mobile: string;
    vehicle_type: 'Bike' | 'Auto' | 'Mini Truck' | 'Truck';
    vehicle_number?: string;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
}

export interface TransportJob {
    id: string;
    part_request_id?: string | null;
    transporter_id?: string | null;

    pickup_address: string;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    pickup_contact_name?: string | null;
    pickup_contact_mobile?: string | null;

    drop_address: string;
    drop_lat?: number | null;
    drop_lng?: number | null;
    drop_contact_name?: string | null;
    drop_contact_mobile?: string | null;

    item_description?: string | null;

    status: TransportJobStatus;

    live_lat?: number | null;
    live_lng?: number | null;
    live_updated_at?: string | null;

    assigned_at: string;
    accepted_at?: string | null;
    picked_up_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;

    pickup_otp?: string | null;
    otp_verified?: boolean;
    proximity_notified?: boolean;

    notes?: string | null;
    created_at: string;
    updated_at: string;

    // Joined relations
    transporter?: Transporter;
    part_request?: PartRequest;
}

export const TRANSPORT_JOB_STATUS_LABELS: Record<TransportJobStatus, string> = {
    ASSIGNED: 'Assigned',
    ACCEPTED: 'Accepted',
    PICKED_UP: 'Picked Up',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

export const TRANSPORT_JOB_STATUS_COLORS: Record<TransportJobStatus, string> = {
    ASSIGNED: '#6C63FF',
    ACCEPTED: '#F59E0B',
    PICKED_UP: '#00D9FF',
    IN_TRANSIT: '#3B82F6',
    DELIVERED: '#10B981',
    CANCELLED: '#EF4444',
};
