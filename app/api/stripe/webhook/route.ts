import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase-server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.metadata?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!email) break;

      await supabaseServer
        .from("subscriptions")
        .upsert(
          {
            contact: email,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_status: "active",
            premium: true,
          },
          { onConflict: "contact" }
        );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const email = await emailFromCustomer(sub.customer as string);
      if (!email) break;

      await supabaseServer
        .from("subscriptions")
        .update({
          stripe_status: sub.status,
          stripe_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          premium: sub.status === "active",
        })
        .eq("contact", email);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const email = await emailFromCustomer(sub.customer as string);
      if (!email) break;

      await supabaseServer
        .from("subscriptions")
        .update({ stripe_status: "canceled", premium: false })
        .eq("contact", email);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const email = await emailFromCustomer(invoice.customer as string);
      if (!email) break;

      await supabaseServer
        .from("subscriptions")
        .update({ stripe_status: "past_due", premium: false })
        .eq("contact", email);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function emailFromCustomer(customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer as Stripe.Customer).email ?? null;
}
