"use client"

import { Button, Container, Heading, Text } from "@medusajs/ui"

import { RadioGroup } from "@headlessui/react"
import { isStripe as isStripeProvider, paymentInfoMap } from "@lib/constants"
import { addPaymentSession } from "@lib/data/orders"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentButton from "@modules/checkout/components/payment-button"
import PaymentContainer from "@modules/checkout/components/payment-container"
import Wrapper from "@modules/checkout/components/payment-wrapper"
import Divider from "@modules/common/components/divider"
import Input from "@modules/common/components/input"
import {
  CardElement,
  CardElementProps,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { StripeCardElementOptions } from "@stripe/stripe-js"
import { useMemo, useState } from "react"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
  availablePaymentMethods: HttpTypes.StorePaymentProvider[]
}

const StripeCardElement = ({ options, onChange }: CardElementProps) => {
  const stripe = useStripe()
  const elements = useElements()

  if (!stripe || !elements) return null

  return (
    <div className="mt-5 transition-all duration-150 ease-in-out">
      <Text className="txt-medium-plus text-ui-fg-base mb-1">
        Enter your card details:
      </Text>
      <CardElement options={options} onChange={onChange} />
    </div>
  )
}

const PaymentDetails = ({
  order,
  availablePaymentMethods,
}: PaymentDetailsProps) => {
  const paymentCollection = order.payment_collections?.[0]
  const payments = paymentCollection?.payments
  const activeSession = paymentCollection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )
  const hasOutstandingPayment =
    order.payment_status === "partially_authorized" ||
    order.payment_status === "partially_captured"
  const [showSelectPaymentMethod, setShowSelectPaymentMethod] = useState(
    !!activeSession
  )
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id || ""
  )
  const [paymentAmount, setPaymentAmount] = useState<string>(
    activeSession?.amount || ""
  )

  const isStripe = isStripeProvider(selectedPaymentMethod)
  const useOptions: StripeCardElementOptions = useMemo(() => {
    return {
      style: {
        base: {
          fontFamily: "Inter, sans-serif",
          color: "#424270",
          "::placeholder": {
            color: "rgb(107 114 128)",
          },
        },
      },
      classes: {
        base: "pt-3 pb-1 block w-full h-11 px-4 mt-0 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover transition-all duration-300 ease-in-out",
      },
    }
  }, [])

  const createPaymentSession = async () => {
    if (activeSession) return activeSession
    const {
      payment_collection: { payment_sessions },
    } = await addPaymentSession(paymentCollection!.id, {
      provider_id: selectedPaymentMethod,
      amount: parseInt(paymentAmount),
    })
    return payment_sessions!.find(
      (paymentSession) => paymentSession.status === "pending"
    )!
  }

  console.log("payments", payments)

  console.log("isStripe", isStripe)

  console.log('payment_collection', order.payment_collections)

  return (
    <div>
      <div className="flex items-center my-6">
        <Heading level="h2" className="text-3xl-regular mr-auto">
          Payment
        </Heading>
        {hasOutstandingPayment && (
          <Button onClick={() => setShowSelectPaymentMethod(true)}>
            Pay the outstanding
          </Button>
        )}
      </div>
      <div>
        {payments?.map((payment) => (
          <div key={payment.id} className="flex items-start gap-x-1 w-full">
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method"
              >
                {paymentInfoMap[payment.provider_id].title}
              </Text>
            </div>
            <div className="flex flex-col w-2/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment details
              </Text>
              <div className="flex gap-2 txt-medium text-ui-fg-subtle items-center">
                <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                  {paymentInfoMap[payment.provider_id].icon}
                </Container>
                <Text data-testid="payment-amount">
                  {isStripeProvider(payment.provider_id) &&
                  payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : `${convertToLocale({
                        amount: payment.amount,
                        currency_code: order.currency_code,
                      })} paid at ${payment.created_at}`}
                </Text>
              </div>
            </div>
          </div>
        ))}
        {showSelectPaymentMethod && (
          <Wrapper
            provider={selectedPaymentMethod}
            currencyCode={order.currency_code}
          >
            <div>
              <div className="flex flex-col gap-2">
                <Input
                  label="Payment Amount"
                  name="paymentAmount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
                <RadioGroup
                  value={selectedPaymentMethod}
                  onChange={setSelectedPaymentMethod}
                >
                  {availablePaymentMethods
                    .sort((a: any, b: any) => {
                      return a.provider_id > b.provider_id ? 1 : -1
                    })
                    .map((paymentMethod) => {
                      return (
                        <PaymentContainer
                          paymentInfoMap={paymentInfoMap}
                          paymentProviderId={paymentMethod.id}
                          key={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                        />
                      )
                    })}
                </RadioGroup>
                {isStripe && (
                  <StripeCardElement
                    options={useOptions}
                    onChange={(e) => {
                      console.log(e)
                      setCardBrand(
                        e.brand &&
                          e.brand.charAt(0).toUpperCase() + e.brand.slice(1)
                      )
                      setError(e.error?.message || null)
                      setCardComplete(e.complete)
                    }}
                  />
                )}
              </div>
              <ErrorMessage
                error={error}
                data-testid="payment-method-error-message"
              />
              <PaymentButton
                notReady={
                  (isStripe && !cardComplete) || !parseInt(paymentAmount)
                }
                provider={selectedPaymentMethod}
                onCreatePaymentSession={createPaymentSession}
                onPaymentCompleted={() => {
                  setShowSelectPaymentMethod(false)
                  setError(null)
                  setCardBrand(null)
                  setCardComplete(false)
                  setSelectedPaymentMethod("")
                  setPaymentAmount("")
                }}
              >
                Confirm
              </PaymentButton>
            </div>
          </Wrapper>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
