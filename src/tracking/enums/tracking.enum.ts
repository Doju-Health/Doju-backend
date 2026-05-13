export enum TrackingStatus {
  // Order stages
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  
  // Preparation stages
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  
  // Shipping stage
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  AT_SORTING_CENTER = 'AT_SORTING_CENTER',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  
  // Delivery attempts
  DELIVERY_ATTEMPTED = 'DELIVERY_ATTEMPTED',
  
  // Final stages
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export const TrackingStatusLabels: Record<TrackingStatus, string> = {
  [TrackingStatus.ORDER_PLACED]: 'Order Placed',
  [TrackingStatus.ORDER_CONFIRMED]: 'Order Confirmed',
  [TrackingStatus.PROCESSING]: 'Processing',
  [TrackingStatus.PACKED]: 'Packed',
  [TrackingStatus.PICKED_UP]: 'Picked Up',
  [TrackingStatus.IN_TRANSIT]: 'In Transit',
  [TrackingStatus.AT_SORTING_CENTER]: 'At Sorting Center',
  [TrackingStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [TrackingStatus.DELIVERY_ATTEMPTED]: 'Delivery Attempted',
  [TrackingStatus.DELIVERED]: 'Delivered',
  [TrackingStatus.FAILED]: 'Failed',
  [TrackingStatus.RETURNED]: 'Returned',
  [TrackingStatus.CANCELLED]: 'Cancelled',
};