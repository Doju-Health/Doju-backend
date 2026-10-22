import { User } from 'src/users/entities/user.entity';

export function serializePublicSeller(seller?: User | null) {
  if (!seller) {
    return seller;
  }

  return {
    id: seller.id,
    fullName: seller.fullName,
    email: seller.email,
    phoneNumber: seller.phoneNumber,
    companyName: seller.companyName,
    address: seller.address,
    city: seller.city,
    state: seller.state,
    businessAddress: seller.businessAddress,
    businessCity: seller.businessCity,
    businessState: seller.businessState,
    profileImageUrl: seller.profileImageUrl,
    isActive: seller.isActive,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  };
}

export function serializeProductSeller<T extends { seller?: User | null }>(
  product: T,
) {
  return {
    ...product,
    seller: serializePublicSeller(product.seller),
  };
}

export function serializeOrderSeller<T extends { product?: { seller?: User | null } | null }>(
  order: T,
) {
  return {
    ...order,
    product: order.product
      ? serializeProductSeller(order.product)
      : order.product,
  };
}
