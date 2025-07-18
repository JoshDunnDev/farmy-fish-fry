import { useState, useEffect, useCallback, useRef } from "react";
import { useSessionContext } from "@/contexts/SessionContext";

interface Order {
  id: string;
  itemName: string;
  tier: number;
  pricePerUnit: number;
  amount: number;
  orderType: string;
  status: string;
  createdAt: string;
  fulfilledAt?: string;
  creator: {
    id: string;
    discordName: string;
    inGameName: string | null;
  };
  claimer?: {
    id: string;
    discordName: string;
    inGameName: string | null;
  } | null;
}

interface User {
  id: string;
  discordId: string;
  discordName: string;
  inGameName: string | null;
}

interface OrdersResponse {
  orders: Order[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
  currentUser?: User;
}

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  currentUser: User | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
  session: any;
  status: string;
  loadMore: () => void;
  refetch: () => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  removeOrder: (orderId: string) => void;
  refreshSession: () => Promise<void>;
}

export function useOrders(): UseOrdersReturn {
  const { session, status, update } = useSessionContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Use refs to prevent duplicate calls
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchOrders = useCallback(
    async (pageNum: number = 1, reset: boolean = false) => {
      if (!session?.user?.id || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setLoading(pageNum === 1);

        // Get ALL orders (don't filter by user) and get current user data separately
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "50",
          includeUserData: "true",
        });

        const response = await fetch(`/api/orders?${params}`);
        if (response.ok) {
          const data: OrdersResponse = await response.json();

          if (reset || pageNum === 1) {
            setOrders(data.orders);
          } else {
            setOrders((prev) => [...prev, ...data.orders]);
          }

          setHasMore(data.hasMore);
          setTotalCount(data.totalCount);
          setPage(pageNum);

          // Get current user data by making a separate request if not included
          if (data.currentUser) {
            setCurrentUser(data.currentUser);
          } else {
            // Fetch current user data separately
            try {
              const userResponse = await fetch(`/api/user`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                setCurrentUser(userData);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [session?.user?.id]
  );

  // Initial load - only run once when session is ready
  useEffect(() => {
    if (status === "loading" || hasInitializedRef.current) return;

    if (session?.user?.id) {
      hasInitializedRef.current = true;
      fetchOrders(1, true);
    }
  }, [session?.user?.id, status, fetchOrders]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !isLoadingRef.current) {
      fetchOrders(page + 1, false);
    }
  }, [hasMore, loading, page, fetchOrders]);

  const refetch = useCallback(() => {
    if (!isLoadingRef.current) {
      hasInitializedRef.current = false; // Allow refetch
      fetchOrders(1, true);
    }
  }, [fetchOrders]);

  const updateOrder = useCallback(
    (orderId: string, updates: Partial<Order>) => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        )
      );
    },
    []
  );

  const removeOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await update();
      // After session update, refetch orders to get updated user data
      refetch();
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }, [update, refetch]);

  // Listen for real-time order status updates from notifications
  useEffect(() => {
    const handleOrderStatusUpdate = (event: CustomEvent) => {
      const { orderId, notificationType, orderDetails, claimer } = event.detail;
      
      // Update the order status based on the notification type
      let statusUpdate: Partial<Order> = {};
      
      switch (notificationType) {
        case "order_claimed":
          // Order was claimed - could be IN_PROGRESS or READY_TO_TRADE
          // We'll determine based on order type
          if (orderDetails.orderType === "SELL") {
            statusUpdate = { 
              status: "READY_TO_TRADE",
              claimer: claimer ? {
                id: claimer.id,
                discordName: claimer.name || "Unknown",
                inGameName: claimer.inGameName
              } : null
            };
          } else {
            statusUpdate = { 
              status: "IN_PROGRESS",
              claimer: claimer ? {
                id: claimer.id,
                discordName: claimer.name || "Unknown", 
                inGameName: claimer.inGameName
              } : null
            };
          }
          break;
          
        case "order_ready":
          statusUpdate = { status: "READY_TO_TRADE" };
          break;
          
        case "order_completed":
          // Remove completed orders from the list since they're typically filtered out
          // We'll use a special flag to indicate this order should be removed
          updateOrder(orderId, { status: "FULFILLED" });
          // Remove the order after a short delay to allow the status update to be seen
          setTimeout(() => {
            removeOrder(orderId);
          }, 1000);
          return; // Don't apply statusUpdate since we're handling this specially
          
        case "order_cancelled":
          statusUpdate = { status: "OPEN", claimer: null };
          break;
      }
      
      // Apply the update to the local state
      if (Object.keys(statusUpdate).length > 0) {
        updateOrder(orderId, statusUpdate);
      }
    };

    // Add event listener
    window.addEventListener('orderStatusUpdate', handleOrderStatusUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('orderStatusUpdate', handleOrderStatusUpdate as EventListener);
    };
  }, [updateOrder, removeOrder]);

  return {
    orders,
    loading,
    currentUser,
    hasMore,
    totalCount,
    page,
    session,
    status,
    loadMore,
    refetch,
    updateOrder,
    removeOrder,
    refreshSession,
  };
}
