import { billingApi } from "@/lib/api";

export function isClientPlanPaymentRequired(error: any) {
  return error?.response?.status === 402
    && error?.response?.data?.code === "CLIENT_PLAN_PAYMENT_REQUIRED";
}

export async function createClientEnrollmentCheckoutLink(options: {
  clientData: Record<string, any>;
  token?: string;
  slug?: string;
  source: string;
  returnUrl?: string;
}) {
  const response = await billingApi.createClientEnrollmentCheckout({
    token: options.token,
    slug: options.slug,
    source: options.source,
    returnUrl: options.returnUrl || window.location.href,
    clientData: options.clientData,
  });

  const checkoutUrl = response?.data?.url;
  if (!checkoutUrl) {
    throw new Error("Checkout URL was not returned.");
  }

  return checkoutUrl as string;
}

export async function startClientEnrollmentCheckout(options: {
  clientData: Record<string, any>;
  token?: string;
  slug?: string;
  source: string;
  returnUrl?: string;
}) {
  const checkoutUrl = await createClientEnrollmentCheckoutLink(options);

  window.location.assign(checkoutUrl);
}

export async function copyClientEnrollmentCheckoutLink(options: {
  clientData: Record<string, any>;
  token?: string;
  slug?: string;
  source: string;
  returnUrl?: string;
}) {
  const checkoutUrl = await createClientEnrollmentCheckoutLink(options);

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(checkoutUrl);
  }

  return checkoutUrl;
}
