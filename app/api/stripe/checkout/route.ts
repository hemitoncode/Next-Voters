import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;

  const { data: existing } = await supabaseServer
    .from("subscriptions")
    .select("premium, stripe_customer_id")
    .eq("contact", email)
    .single();

  if (existing?.premium) {
    return NextResponse.json({ error: "Already subscribed" }, { status: 400 });
  }

  // Reuse existing Stripe customer or create a new one
  let customerId = existing?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email });
    customerId = customer.id;

    await supabaseServer
      .from("subscriptions")
      .upsert({ contact: email, stripe_customer_id: customerId }, { onConflict: "contact" });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/civic-line?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/civic-line?canceled=true`,
    metadata: { email },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
