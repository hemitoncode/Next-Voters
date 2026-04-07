"use server"

import { supabase } from "@/lib/supabase";

export async function getSubscriptionTier(email: string): Promise<'free' | 'premium'> {
    const { data } = await supabase
        .from("subscriptions")
        .select("premium")
        .eq("contact", email)
        .single();

    return data?.premium === true ? "premium" : "free";
}
