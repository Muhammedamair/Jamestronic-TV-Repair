import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Ticket, TicketNote, TicketStatus } from '../types/database';
import { generateTicketNumber } from '../utils/formatters';

export const useTickets = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*, customer:customers(*)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTickets(data as Ticket[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const createTicket = async (ticket: Partial<Ticket>) => {
        const ticketNumber = generateTicketNumber();
        const { data, error } = await supabase
            .from('tickets')
            .insert({ ...ticket, ticket_number: ticketNumber, status: 'CREATED' as TicketStatus, priority: ticket.priority || 'MEDIUM' })
            .select('*, customer:customers(*)')
            .single();

        if (!error && data) {
            setTickets(prev => [data as Ticket, ...prev]);
        }
        return { data: data as Ticket | null, error };
    };

    const updateTicket = async (id: string, updates: Partial<Ticket>) => {
        const { data, error } = await supabase
            .from('tickets')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*, customer:customers(*)')
            .single();

        if (!error && data) {
            setTickets(prev => prev.map(t => t.id === id ? (data as Ticket) : t));
        }
        return { data: data as Ticket | null, error };
    };

    const updateStatus = async (id: string, status: TicketStatus) => {
        return updateTicket(id, { status });
    };

    const getTicket = async (id: string) => {
        const { data, error } = await supabase
            .from('tickets')
            .select('*, customer:customers(*)')
            .eq('id', id)
            .single();
        return { data: data as Ticket | null, error };
    };

    return { tickets, loading, fetchTickets, createTicket, updateTicket, updateStatus, getTicket };
};

export const useTicketNotes = (ticketId: string) => {
    const [notes, setNotes] = useState<TicketNote[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotes = useCallback(async () => {
        if (!ticketId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('ticket_notes')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });

        if (!error && data) setNotes(data as TicketNote[]);
        setLoading(false);
    }, [ticketId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const addNote = async (noteType: TicketNote['note_type'], content: string) => {
        const { data, error } = await supabase
            .from('ticket_notes')
            .insert({ ticket_id: ticketId, note_type: noteType, content })
            .select()
            .single();

        if (!error && data) setNotes(prev => [data as TicketNote, ...prev]);
        return { data, error };
    };

    return { notes, loading, addNote, fetchNotes };
};
