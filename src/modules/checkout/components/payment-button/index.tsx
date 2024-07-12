"use client"

import { isManual, isPaypal, isStripe } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useEffect, useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  provider: string
  onCreatePaymentSession: () => Promise<HttpTypes.StorePaymentSession>
  notReady?: boolean
  onPaymentCompleted?: () => any
  billingDetail?: HttpTypes.StoreCartAddress & { email?: string }
  children?: React.ReactNode
  "data-testid"?: string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  provider,
  onCreatePaymentSession,
  notReady,
  onPaymentCompleted,
  billingDetail,
  children,
  "data-testid": dataTestId,
}) => {
  // TODO: Add this once gift cards are implemented
  // const paidByGiftcard =
  //   cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  // if (paidByGiftcard) {
  //   return <GiftCardPaymentButton />
  // }

  switch (true) {
    case isStripe(provider):
      return (
        <StripePaymentButton
          onCreatePaymentSession={onCreatePaymentSession}
          notReady={notReady}
          onPaymentCompleted={onPaymentCompleted}
          billingDetail={billingDetail}
          data-testid={dataTestId}
        >
          {children}
        </StripePaymentButton>
      )
    case isManual(provider):
      return (
        <ManualTestPaymentButton
          onCreatePaymentSession={onCreatePaymentSession}
          onPaymentCompleted={onPaymentCompleted}
          notReady={notReady}
          data-testid={dataTestId}
        >
          {children}
        </ManualTestPaymentButton>
      )
    case isPaypal(provider):
      return (
        <PayPalPaymentButton
          onCreatePaymentSession={onCreatePaymentSession}
          notReady={notReady}
          onPaymentCompleted={onPaymentCompleted}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const GiftCardPaymentButton = ({
  onPaymentCompleted,
  children,
}: {
  onPaymentCompleted?: () => any
  children?: React.ReactNode
}) => {
  const [submitting, setSubmitting] = useState(false)

  const handleOrder = async () => {
    setSubmitting(true)
    await onPaymentCompleted?.()
  }

  return (
    <Button
      onClick={handleOrder}
      isLoading={submitting}
      data-testid="submit-order-button"
    >
      {children}
    </Button>
  )
}

const StripePaymentButton = ({
  onCreatePaymentSession,
  notReady,
  onPaymentCompleted,
  billingDetail,
  children,
  "data-testid": dataTestId,
}: {
  onCreatePaymentSession: () => Promise<HttpTypes.StorePaymentSession>
  notReady?: boolean
  onPaymentCompleted?: () => any
  billingDetail?: HttpTypes.StoreCartAddress & { email?: string }
  children?: React.ReactNode
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const _onPaymentCompleted = async () => {
    try {
      await onPaymentCompleted?.()
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card) {
      setSubmitting(false)
      return
    }

    const paymentSession = await onCreatePaymentSession()

    await stripe
      .confirmCardPayment(paymentSession.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name: billingDetail?.first_name + " " + billingDetail?.last_name,
            address: {
              city: billingDetail?.city ?? undefined,
              country: billingDetail?.country_code ?? undefined,
              line1: billingDetail?.address_1 ?? undefined,
              line2: billingDetail?.address_2 ?? undefined,
              postal_code: billingDetail?.postal_code ?? undefined,
              state: billingDetail?.province ?? undefined,
            },
            email: billingDetail?.email,
            phone: billingDetail?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            _onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return _onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {children}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const PayPalPaymentButton = ({
  onCreatePaymentSession,
  notReady,
  onPaymentCompleted,
  "data-testid": dataTestId,
}: {
  onCreatePaymentSession: () => Promise<HttpTypes.StorePaymentSession>
  notReady?: boolean
  onPaymentCompleted?: () => any
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentSession, setPaymentSession] =
    useState<HttpTypes.StorePaymentSession>()

  const _onPaymentCompleted = async () => {
    try {
      await onPaymentCompleted?.()
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async (
    _data: OnApproveData,
    actions: OnApproveActions
  ) => {
    actions?.order
      ?.authorize()
      .then((authorization) => {
        if (authorization.status !== "COMPLETED") {
          setErrorMessage(`An error occurred, status: ${authorization.status}`)
          return
        }
        _onPaymentCompleted()
      })
      .catch(() => {
        setErrorMessage(`An unknown error occurred, please try again.`)
        setSubmitting(false)
      })
  }

  useEffect(() => {
    onCreatePaymentSession().then(setPaymentSession)
  }, [])

  const [{ isPending, isResolved }] = usePayPalScriptReducer()

  if (isPending) {
    return <Spinner />
  }

  if (isResolved) {
    return (
      <>
        <PayPalButtons
          style={{ layout: "horizontal" }}
          createOrder={async () => paymentSession?.data.id as string}
          onApprove={handlePayment}
          disabled={notReady || submitting || isPending}
          data-testid={dataTestId}
        />
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }

  return null
}

const ManualTestPaymentButton = ({
  onCreatePaymentSession,
  notReady,
  onPaymentCompleted,
  children,
}: {
  onCreatePaymentSession: () => Promise<HttpTypes.StorePaymentSession>
  notReady?: boolean
  onPaymentCompleted?: () => any
  children?: React.ReactNode
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const _onPaymentCompleted = async () => {
    try {
      await onPaymentCompleted?.()
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async () => {
    setSubmitting(true)

    await onCreatePaymentSession()

    _onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        {children}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
