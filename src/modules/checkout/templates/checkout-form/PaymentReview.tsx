"use client"

import Payment from "@modules/checkout/components/payment"
import Wrapper from "@modules/checkout/components/payment-wrapper"
import Review from "@modules/checkout/components/review"
import { useState } from "react"

const PaymentReview = ({
  cart,
  paymentMethods,
}: {
  cart: any
  paymentMethods: any
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )
  const [paymentMethod, setPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  return (
    <Wrapper provider={paymentMethod} currencyCode={cart.currency_code}>
      <div>
        <Payment
          cart={cart}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          availablePaymentMethods={paymentMethods}
        />
      </div>
      <div>
        <Review cart={cart} />
      </div>
    </Wrapper>
  )
}

export default PaymentReview
