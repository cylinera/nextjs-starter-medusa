import Providers from "@modules/providers"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}