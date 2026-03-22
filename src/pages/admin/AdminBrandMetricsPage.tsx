import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { BrandMetrics } from '../../types/database';
import { Box, Typography, TextField, Button, IconButton, CircularProgress } from '@mui/material';
import {
  Storefront as StorefrontIcon,
  Star as StarIcon,
  Chat as ChatIcon,
  ThumbUp as ThumbUpIcon,
  Sync as SyncIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const AdminBrandMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<BrandMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [ratingScore, setRatingScore] = useState('');
  const [reviewsCount, setReviewsCount] = useState('');
  const [interactionsCount, setInteractionsCount] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_metrics')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMetrics(data as BrandMetrics);
        setRatingScore(data.rating_score);
        setReviewsCount(data.reviews_count);
        setInteractionsCount(data.interactions_count);
      }
    } catch (err: any) {
      setError('Failed to load metrics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        rating_score: ratingScore,
        reviews_count: reviewsCount,
        interactions_count: interactionsCount,
      };

      const { error } = await supabase
        .from('brand_metrics')
        .update(payload)
        .eq('id', 1);

      if (error) throw error;
      setSuccess('Brand metrics perfectly updated!');
      setError(null);
      fetchMetrics();
    } catch (err: any) {
      setError('Failed to update metrics: ' + err.message);
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#6C63FF' }} />
      </Box>
    );
  }

  return (
    <Box className="max-w-4xl mx-auto space-y-6">
      {/* Status Messages */}
      {error && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 600 }}>⚠ {error}</Typography>
            <IconButton size="small" onClick={() => setError(null)}><CloseIcon sx={{ fontSize: 16, color: '#EF4444' }} /></IconButton>
        </Box>
      )}
      {success && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>✓ {success}</Typography>
            <IconButton size="small" onClick={() => setSuccess(null)}><CloseIcon sx={{ fontSize: 16, color: '#10B981' }} /></IconButton>
        </Box>
      )}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center gap-3">
            <StorefrontIcon className="h-8 w-8 text-indigo-600" />
            Brand Metrics & Ratings
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Control the Google Rating widgets displayed on your public landing page. Updates take effect immediately on next page load.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rating Score */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <StarIcon className="w-5 h-5 text-amber-500" />
                Google Rating Score
              </label>
              <input
                type="text"
                required
                value={ratingScore}
                onChange={(e) => setRatingScore(e.target.value)}
                placeholder="4.9"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 bg-gray-50 border transition-colors"
              />
              <p className="text-xs text-gray-500">Example: 4.8, 4.9, 5.0</p>
            </div>

            {/* Reviews Count */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ChatIcon className="w-5 h-5 text-indigo-500" />
                Total Reviews
              </label>
              <input
                type="text"
                required
                value={reviewsCount}
                onChange={(e) => setReviewsCount(e.target.value)}
                placeholder="268"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 bg-gray-50 border transition-colors"
              />
              <p className="text-xs text-gray-500">Example: 268, 1.2K</p>
            </div>

            {/* Interactions Count */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ThumbUpIcon className="w-5 h-5 text-emerald-500" />
                Interactions
              </label>
              <input
                type="text"
                required
                value={interactionsCount}
                onChange={(e) => setInteractionsCount(e.target.value)}
                placeholder="2.5K+"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 bg-gray-50 border transition-colors"
              />
              <p className="text-xs text-gray-500">Example: 2.5K+, 800</p>
            </div>

          </div>

          {/* Preview Warning & Save */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg font-medium flex-1 mr-4">
              Note: The static "180 Days" warranty block is automatically configured to animate specific services on the frontend.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all items-center gap-2"
            >
              {saving ? (
                <SyncIcon className="w-5 h-5 animate-spin" />
              ) : (
                'Publish Updates'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </Box>
  );
};

export default AdminBrandMetricsPage;
