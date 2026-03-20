import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PromotionalBanner } from '../types/database';

export const useBanners = () => {
    const [loading, setLoading] = useState(false);

    /**
     * Gets all banners. If `activeOnly` is true, it only returns `is_active = true` banners.
     * Always returns sorted by `order_index` ASC.
     */
    const fetchBanners = useCallback(async (activeOnly = false): Promise<{ data: PromotionalBanner[] | null; error: any }> => {
        setLoading(true);
        let query = supabase.from('promotional_banners').select('*').order('order_index', { ascending: true });
        
        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        setLoading(false);
        return { data: data as PromotionalBanner[] | null, error };
    }, []);

    /**
     * Upload an image to the `banners` bucket
     */
    const uploadBannerImage = async (file: File): Promise<{ url: string | null; error: any }> => {
        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
            return { url: data.publicUrl, error: null };
        } catch (err) {
            return { url: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    const createBanner = async (banner: Partial<PromotionalBanner>) => {
        setLoading(true);
        const { data, error } = await supabase.from('promotional_banners').insert([banner]).select().single();
        setLoading(false);
        return { data, error };
    };

    const updateBanner = async (id: string, updates: Partial<PromotionalBanner>) => {
        setLoading(true);
        const { data, error } = await supabase.from('promotional_banners').update(updates).eq('id', id).select().single();
        setLoading(false);
        return { data, error };
    };

    const deleteBanner = async (id: string) => {
        setLoading(true);
        const { error } = await supabase.from('promotional_banners').delete().eq('id', id);
        setLoading(false);
        return { error };
    };

    return {
        loading,
        fetchBanners,
        uploadBannerImage,
        createBanner,
        updateBanner,
        deleteBanner
    };
};
