import CustomerTrackingPage from "../../views/customer/CustomerTrackingPage";
import { Suspense } from 'react';

export const metadata = {
  title: "Track Your Ticket | JamesTronic TV Repair",
  description: "Track the real-time status of your TV repair, technician assignment, parts procurement, and delivery ETA.",
};

export default function TrackPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading tracker...</div>}>
        <CustomerTrackingPage />
      </Suspense>
    </main>
  );
}
