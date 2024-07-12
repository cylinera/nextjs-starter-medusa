"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { getAuthHeaders } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"

export const retrieveOrder = cache(async function (id: string) {
  return sdk.store.order
    .retrieve(
      id,
      {
        fields:
          "*payment_collections.payment_sessions,*payment_collections.payments",
      },
      { next: { tags: ["order"] }, ...getAuthHeaders() }
    )
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
})

export const listOrders = cache(async function (
  limit: number = 10,
  offset: number = 0
) {
  return sdk.store.order
    .list({ limit, offset }, { next: { tags: ["order"] }, ...getAuthHeaders() })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
})

export async function addPaymentSession(
  paymentCollectionId: string,
  data: {
    provider_id: string
    amount?: number
    context?: Record<string, unknown>
  }
) {
  return sdk.store.payment
    .addPaymentSession(paymentCollectionId, data, {}, getAuthHeaders())
    .then((resp) => {
      revalidateTag("order")
      return resp
    })
    .catch(medusaError)
}
