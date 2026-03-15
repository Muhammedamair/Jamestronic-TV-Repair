import { Ticket, TicketStatus, INSTALLATION_STATUS_ORDER, TICKET_STATUS_ORDER } from '../types/database';
import { sendInteraktMessage } from './interakt';

// Map each ticket status to its Interakt WhatsApp template name
export const STATUS_TEMPLATE_MAP: Record<TicketStatus, string | null> = {
    CREATED: 'service_booking_confirmation',
    DIAGNOSED: 'service_diagnosed',
    PICKUP_SCHEDULED: 'service_pickup_scheduled_body',
    PICKED_UP: 'service_picked_up',
    IN_REPAIR: 'service_in_repair',
    QUOTATION_SENT: 'service_quotation_sent',
    APPROVED: 'service_approved',
    REPAIRED: 'service_repaired_',
    DELIVERY_SCHEDULED: 'service_delivery_scheduled',
    DELIVERED: 'service_delivered',
    CLOSED: 'service_review_request',
    // Installation-specific
    CONFIRMED: 'installation_confirmed',
    EN_ROUTE: 'installation_en_route',
    INSTALLED: 'installation_completed',
    PAYMENT_COLLECTED: null,
};

/**
 * Triggers a WhatsApp notification to the customer when a ticket's status changes.
 * This ensures unified notification paths across Admin, Technician, and Dealer portals.
 */
export const triggerStatusWhatsApp = async (
    ticket: Ticket, 
    newStatus: TicketStatus, 
    quotationTotal?: number | string
): Promise<void> => {
    const templateName = STATUS_TEMPLATE_MAP[newStatus];
    const customerPhone = ticket.customer?.mobile;

    if (!templateName || !customerPhone) {
        return; // No template mapped, or customer has no phone number
    }

    const tvBrand = ticket.tv_brand || 'TV';
    const tvSize = ticket.tv_size || '';

    // Build bodyValues based on the template requirements
    let bodyValues: string[] | undefined;

    if (newStatus === 'CREATED') {
        // service_booking_confirmation has no variables
        bodyValues = undefined;
    } else if (newStatus === 'QUOTATION_SENT') {
        // service_quotation_sent has 3 variables: brand, size, price
        bodyValues = [tvBrand, tvSize, String(quotationTotal || ticket.estimated_cost || '0')];
    } else if (newStatus === 'CONFIRMED' && ticket.service_type === 'INSTALLATION') {
        // installation_confirmed has 3 variables: brand, size, time_slot
        bodyValues = [tvBrand, tvSize, ticket.time_slot || 'ASAP'];
    } else {
        // All other standard templates have 2 variables: brand, size
        bodyValues = [tvBrand, tvSize];
    }

    console.log(`📋 [STATUS] Sending WhatsApp notification: ${templateName} to ${customerPhone} for status ${newStatus}`);
    
    try {
        const result = await sendInteraktMessage({
            phoneNumber: customerPhone,
            templateName,
            bodyValues,
        });
        console.log(`✅ [STATUS] WhatsApp notification sent for ${newStatus}:`, result);
    } catch (err) {
        console.error(`❌ [STATUS] WhatsApp notification failed for ${newStatus}:`, err);
    }
};

/**
 * Helper to get available next statuses based on the ticket service type.
 */
export const getAvailableNextStatuses = (ticket: Ticket | null): TicketStatus[] => {
    if (!ticket) return [];
    const order = ticket.service_type === 'INSTALLATION' ? INSTALLATION_STATUS_ORDER : TICKET_STATUS_ORDER;
    const idx = order.indexOf(ticket.status);
    const r: TicketStatus[] = [];
    if (idx < order.length - 1) r.push(order[idx + 1]);
    if (ticket.status !== 'CLOSED') r.push('CLOSED');
    return [...new Set(r)];
};
