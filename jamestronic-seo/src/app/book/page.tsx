import CustomerBookingPage from "../../views/customer/CustomerBookingPage";
import { Suspense } from 'react';

export const metadata = {
  title: "Book TV Repair & Installation Service",
  description: "Book doorstep TV repair or TV installation service in Hyderabad (Manikonda, Kokapet, Gachibowli, etc). Quick ETA and genuine spare parts.",
};

export default function BookPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading booking...</div>}>
        <CustomerBookingPage />
      </Suspense>
    </main>
  );
}
