import CustomerBuyPage from "../../views/customer/CustomerBuyPage";

export const metadata = {
  title: "Buy Refurbished TVs | JamesTronic TV Repair",
  description: "Shop certified refurbished LED and Smart TVs with our exclusive 6-month panel warranty.",
};

export default function BuyPage() {
  return <main className="min-h-screen bg-[#F9FAFB]"><CustomerBuyPage /></main>;
}
