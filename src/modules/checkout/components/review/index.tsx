"use client"

import { Heading, Text, clx } from "@medusajs/ui"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { placeOrder } from "@lib/data/cart"

const Review = ({ cart }: { cart: any }) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard)

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            }
          )}
        >
          Review
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                By clicking the Place Order button, you confirm that you have
                read, understand and accept our Terms of Use, Terms of Sale and
                Returns Policy and acknowledge that you have read Medusa
                Store&apos;s Privacy Policy.
              </Text>
            </div>
          </div>
          <PaymentButton
            provider={paymentSession.provider_id}
            onCreatePaymentSession={async () => paymentSession}
            notReady={
              !cart ||
              !cart.shipping_address ||
              !cart.billing_address ||
              !cart.email ||
              (cart.shipping_methods?.length ?? 0) < 1
            }
            onPaymentCompleted={async () => await placeOrder()}
            billingDetail={{ ...cart.billing_address, email: cart.email }}
            data-testid="submit-order-button"
          >
            Place order
          </PaymentButton>
        </>
      )}
    </div>
  )
}

export default Review
