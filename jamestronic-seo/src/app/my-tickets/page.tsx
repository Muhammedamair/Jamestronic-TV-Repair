import CustomerTicketsPage from "../../views/customer/CustomerTicketsPage";

export const metadata = {
  title: "My Service History | JamesTronic TV Repair",
  description: "View all your past and active TV repair tickets with JamesTronic.",
};

export default function TicketsPage() {
  return <main className="min-h-screen bg-[#F9FAFB]"><CustomerTicketsPage /></main>;
}
