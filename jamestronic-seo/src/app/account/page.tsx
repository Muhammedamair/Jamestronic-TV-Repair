import CustomerAccountPage from "../../views/customer/CustomerAccountPage";

export const metadata = {
  title: "My Account | JamesTronic TV Repair",
  description: "Manage your JamesTronic profile, saved addresses, contact information, and view prior service history.",
};

export default function AccountPage() {
  return <main className="min-h-screen bg-[#F9FAFB]"><CustomerAccountPage /></main>;
}
