"use server"

import { supabase } from "@/lib/supabase";
import { PreferredCommunication } from "@/types/preferences";

export const handleSubscribe = async (contact: string, topics: string[], type_contact: PreferredCommunication) => {
    const { data: existing } = await supabase
        .from("subscriptions")
        .select("contact")
        .eq("contact", contact)
        .single();

    if (existing) {
        return { error: "Contact already subscribed" };
    }

    await supabase
        .from("subscriptions")
        .insert({ contact, topics, type_contact });
}
