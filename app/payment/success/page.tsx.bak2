"use client"

import { useRouter } from "next/navigation"
import { PaymentSuccess } from "@/components/payment-success"

export default function PaymentSuccessPage() {
  const router = useRouter()

  const handleContinue = () => {
    router.push('/?tab=summary')
  }

  return <PaymentSuccess onContinue={handleContinue} />
}