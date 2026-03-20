import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Customer } from '../types/database';

export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setCustomers(data as Customer[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const createCustomer = async (customer: Partial<Customer>) => {
        const { data, error } = await supabase
            .from('customers')
            .insert(customer)
            .select()
            .single();

        if (!error && data) setCustomers(prev => [data as Customer, ...prev]);
        return { data: data as Customer | null, error };
    };

    const searchByMobile = async (mobile: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .ilike('mobile', `%${mobile}%`)
            .limit(5);

        return { data: data as Customer[] | null, error };
    };

    const getCustomer = async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();
        return { data: data as Customer | null, error };
    };

    return { customers, loading, fetchCustomers, createCustomer, searchByMobile, getCustomer };
};
