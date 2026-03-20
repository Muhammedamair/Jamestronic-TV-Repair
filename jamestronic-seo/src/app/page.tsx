import CustomerLandingPage from "../views/customer/CustomerLandingPage";
import { supabase } from "../supabaseClient";
import { PromotionalBanner, ServiceUpdate } from "../types/database";

// This runs ONLY on the server during build (Static Generation) and at runtime for Dynamic routes.
// We enable revalidate to fetch fresh updates every 60 seconds (Incremental Static Regeneration).
export const revalidate = 60;

export default async function Home() {
  // 1. Fetch Hero Banners Server-Side
  const { data: rawBanners } = await supabase
    .from('promotional_banners')
    .select('*')
    .eq('is_active', true)
    .eq('banner_type', 'hero')
    .order('order_index', { ascending: true });

  const now = new Date();
  const validBanners = (rawBanners as PromotionalBanner[] || []).filter(b => {
    if (b.schedule_start && new Date(b.schedule_start) > now) return false;
    if (b.schedule_end && new Date(b.schedule_end) < now) return false;
    return true;
  });
  
  const heroBanners = validBanners.length > 0 ? validBanners : (rawBanners ? [rawBanners[0] as PromotionalBanner] : []);

  // 2. Fetch "Recent Works & Updates" Server-Side for Googlebot SEO
  const { data: updates } = await supabase
    .from('service_updates')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(6);

  const serviceUpdates = (updates || []) as ServiceUpdate[];

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      {/* 
        Pass the server-fetched data instantly to the Client Component.
        This completely eliminates layout shift and guarantees Googlebot indexes 
        the exact text inside the Service Updates (e.g., "TV Repair in Manikonda").
      */}
      <CustomerLandingPage 
        initialServiceUpdates={serviceUpdates}
        initialHeroBanners={heroBanners}
      />
    </main>
  );
}
