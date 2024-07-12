"use client"

import { isPaypal, isStripe } from "@lib/constants"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { loadStripe } from "@stripe/stripe-js"
import React, { createContext } from "react"
import StripeWrapper from "./stripe-wrapper"

type WrapperProps = {
  provider: string
  children: React.ReactNode
  currencyCode?: string
}

export const StripeContext = createContext(false)

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

const Wrapper: React.FC<WrapperProps> = ({
  provider,
  children,
  currencyCode,
}) => {
  if (isStripe(provider)) {
    return (
      <StripeContext.Provider value={true}>
        <StripeWrapper stripeKey={stripeKey} stripePromise={stripePromise}>
          {children}
        </StripeWrapper>
      </StripeContext.Provider>
    )
  }

  if (isPaypal(provider) && paypalClientId !== undefined && currencyCode) {
    return (
      <PayPalScriptProvider
        options={{
          "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
          currency: currencyCode.toUpperCase(),
          intent: "authorize",
          components: "buttons",
        }}
      >
        {children}
      </PayPalScriptProvider>
    )
  }

  return <div>{children}</div>
}

export default Wrapper
