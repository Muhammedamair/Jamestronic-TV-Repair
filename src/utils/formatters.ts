import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatDate = (date: string) => dayjs(date).format('DD MMM YYYY');
export const formatDateTime = (date: string) => dayjs(date).format('DD MMM YYYY, hh:mm A');
export const formatRelative = (date: string) => dayjs(date).fromNow();

export const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

export const formatMobile = (mobile: string) => {
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return mobile;
};

export const generateTicketNumber = () => {
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `JT-${date}-${random}`;
};
