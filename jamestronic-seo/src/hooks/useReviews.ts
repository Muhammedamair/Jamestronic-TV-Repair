import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Review } from '../types/database';

export const useReviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('review_date', { ascending: false });

        if (!error && data) setReviews(data as Review[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const addReview = async (review: Partial<Review>) => {
        const { data, error } = await supabase
            .from('reviews')
            .insert(review)
            .select()
            .single();

        if (!error && data) setReviews(prev => [data as Review, ...prev]);
        return { data, error };
    };

    const updateReview = async (id: string, updates: Partial<Review>) => {
        const { data, error } = await supabase
            .from('reviews')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (!error && data) {
            setReviews(prev => prev.map(r => r.id === id ? (data as Review) : r));
        }
        return { data, error };
    };

    const getStats = () => {
        const total = reviews.length;
        const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
        const distribution = [1, 2, 3, 4, 5].map(star => ({
            star,
            count: reviews.filter(r => r.rating === star).length,
        }));
        const pending = reviews.filter(r => r.status === 'PENDING').length;
        return { total, avgRating, distribution, pending };
    };

    return { reviews, loading, fetchReviews, addReview, updateReview, getStats };
};
