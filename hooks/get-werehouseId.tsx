"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"

export const useWarehouseId = () => {
  const { data: session } = useSession()
  const [warehouseId, setWarehouseId] = useState<string | null>(null)

  useEffect(() => {
    // Since warehouses were removed from the schema, 
    // we'll return a default warehouse ID or null
    if (session?.user) {
      // You can modify this logic based on your needs
      setWarehouseId("default-warehouse")
    }
  }, [session])

  return { warehouseId }
}

export default useWarehouseId