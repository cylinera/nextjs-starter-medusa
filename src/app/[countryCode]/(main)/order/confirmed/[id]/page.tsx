import { Metadata } from "next"

import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { notFound } from "next/navigation"
import { enrichLineItems } from "@lib/data/cart"
import { retrieveOrder } from "@lib/data/orders"
import { HttpTypes } from "@medusajs/types"
import { listCartPaymentMethods } from "@lib/data/payment"

type Props = {
  params: { id: string }
}

async function getOrder(id: string) {
  const order = await retrieveOrder(id)

  if (!order) {
    return
  }

  const enrichedItems = await enrichLineItems(order.items, order.region_id!)

  return {
    ...order,
    items: enrichedItems,
  } as unknown as HttpTypes.StoreOrder
}

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage({ params }: Props) {
  const order = await getOrder(params.id)
  const paymentMethods = await listCartPaymentMethods(order?.region_id ?? "")
  if (!order) {
    return notFound()
  }

  return (
    <OrderCompletedTemplate
      order={order}
      availablePaymentMethods={paymentMethods}
    />
  )
}
