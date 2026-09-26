# Products & Cloudinary API Documentation

## Overview

This document provides a comprehensive guide to the Products and Cloudinary endpoints for the DOJU Healthcare Equipment Marketplace backend.

---

## Products Endpoints

### 1. Get All Products

**GET** `/products`

**Description:** Retrieve all active healthcare equipment products from the marketplace.

**Authentication:** None required

**Query Parameters:** None

**Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Portable Oxygen Concentrator",
    "description": "High-quality portable oxygen concentrator with 2-hour battery life",
    "price": 499.99,
    "stock": 50,
    "imageUrl": [
      "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-1.jpg",
      "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-2.jpg"
    ],
    "seller": {
      "id": "seller-123",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "isActive": true,
    "createdAt": "2025-02-09T10:30:00Z",
    "updatedAt": "2025-02-09T10:30:00Z"
  }
]
```

**Status Codes:**

- `200 OK` - Successfully retrieved all products

---

### 2. Get Product by ID

**GET** `/products/{id}`

**Description:** Retrieve a specific product by its unique identifier.

**Authentication:** None required

**Path Parameters:**

- `id` (string, UUID): Product unique identifier
  - Example: `123e4567-e89b-12d3-a456-426614174000`

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Portable Oxygen Concentrator",
  "description": "High-quality portable oxygen concentrator with 2-hour battery life",
  "price": 499.99,
  "stock": 50,
  "imageUrl": [
    "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-1.jpg",
    "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-2.jpg"
  ],
  "seller": {
    "id": "seller-123",
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "isActive": true,
  "createdAt": "2025-02-09T10:30:00Z",
  "updatedAt": "2025-02-09T10:30:00Z"
}
```

**Status Codes:**

- `200 OK` - Successfully retrieved the product
- `404 Not Found` - Product not found

---

### 3. Get Current Seller Products

**GET** `/products/me`

**Description:** Retrieve the logged-in seller's active products with filtering, sorting, and pagination. Inactive products can be included with `isActive=false`.

**Authentication:** Bearer JWT Token (Required)

**Query Parameters:**

| Name          | Type    | Description                                                         |
| ------------- | ------- | ------------------------------------------------------------------- |
| `page`        | number  | Page number, defaults to `1`.                                       |
| `limit`       | number  | Items per page, defaults to `10` and is capped at `100`.            |
| `search`      | string  | Search product name and description.                                |
| `categoryId`  | string  | Filter by category UUID.                                            |
| `status`      | string  | `pending`, `approved`, or `rejected`.                               |
| `stockStatus` | string  | `inStock`, `lowStock` (1-4 units), or `outOfStock`.                 |
| `isActive`    | boolean | Defaults to `true`; use `false` to list inactive products.          |
| `minPrice`    | number  | Minimum product price.                                              |
| `maxPrice`    | number  | Maximum product price.                                              |
| `sortBy`      | string  | `createdAt`, `name`, `priceAsc`, `priceDesc`, `rating`, or `stock`. |

**Response:**

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Portable Oxygen Concentrator",
      "description": "High-quality portable oxygen concentrator with 2-hour battery life",
      "price": 499.99,
      "stock": 50,
      "imageUrl": [
        "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-1.jpg",
        "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-2.jpg"
      ],
      "seller": {
        "id": "seller-123",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "isActive": true,
      "createdAt": "2025-02-09T10:30:00Z",
      "updatedAt": "2025-02-09T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Status Codes:**

- `200 OK` - Successfully retrieved seller products
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User does not have seller role

---

### 4. Create Product with Image Upload

**POST** `/products`

**Description:** Create a new healthcare equipment product with optional image upload(s) to Cloudinary. Requires seller role.

**Authentication:** Bearer JWT Token (Required)

**Content-Type:** `multipart/form-data`

**Request Body:**

```
name: string (required)
  Example: "Portable Oxygen Concentrator"

description: string (required)
  Example: "High-quality portable oxygen concentrator with 2-hour battery life"

price: number (required, minimum: 0)
  Example: 499.99

stock: number (required, minimum: 0)
  Example: 50

imageUrl: string[] (optional)
  Example: ["https://example.com/image-1.jpg", "https://example.com/image-2.jpg"]

images: file[] (optional)
  Accepted formats: jpg, jpeg, png, gif, webp
  Max size: 5MB each
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Portable Oxygen Concentrator",
  "description": "High-quality portable oxygen concentrator with 2-hour battery life",
  "price": 499.99,
  "stock": 50,
  "imageUrl": [
    "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-1.jpg",
    "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-2.jpg"
  ],
  "seller": {
    "id": "current-user-id",
    "fullName": "Current User",
    "email": "user@example.com"
  },
  "isActive": true,
  "createdAt": "2025-02-09T10:30:00Z",
  "updatedAt": "2025-02-09T10:30:00Z"
}
```

**Status Codes:**

- `201 Created` - Product successfully created
- `400 Bad Request` - Invalid product data or image upload failed
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User does not have seller role

**Error Response Example:**

```json
{
  "message": "Image upload failed: Invalid file type",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 4. Update Product

**PATCH** `/products/{id}`

**Description:** Update an existing healthcare equipment product. Only the seller who created the product can update it. Optional image upload(s) replace the previous image(s) on Cloudinary.

**Authentication:** Bearer JWT Token (Required)

**Content-Type:** `multipart/form-data`

**Path Parameters:**

- `id` (string, UUID): Product unique identifier
  - Example: `123e4567-e89b-12d3-a456-426614174000`

**Request Body (all fields optional):**

```
name: string (optional)
  Example: "Updated Portable Oxygen Concentrator"

description: string (optional)
  Example: "Updated description with new features"

price: number (optional, minimum: 0)
  Example: 599.99

stock: number (optional, minimum: 0)
  Example: 75

imageUrl: string[] (optional)
  Example: ["https://example.com/image-1.jpg", "https://example.com/image-2.jpg"]

images: file[] (optional)
  Accepted formats: jpg, jpeg, png, gif, webp
  Max size: 5MB each
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Portable Oxygen Concentrator",
  "description": "Updated description with new features",
  "price": 599.99,
  "stock": 75,
  "imageUrl": [
    "https://res.cloudinary.com/doju/image/upload/v1234567891/doju/products/product-updated-1.jpg",
    "https://res.cloudinary.com/doju/image/upload/v1234567891/doju/products/product-updated-2.jpg"
  ],
  "seller": {
    "id": "current-user-id",
    "fullName": "Current User",
    "email": "user@example.com"
  },
  "isActive": true,
  "createdAt": "2025-02-09T10:30:00Z",
  "updatedAt": "2025-02-09T11:45:00Z"
}
```

**Status Codes:**

- `200 OK` - Product successfully updated
- `400 Bad Request` - Invalid product data or image upload failed
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User does not have seller role or is not the product owner
- `404 Not Found` - Product not found

**Error Response Examples:**

```json
{
  "message": "You are not the seller of this product",
  "error": "Forbidden",
  "statusCode": 403
}
```

```json
{
  "message": "Product not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Cloudinary Endpoints

### 1. Upload Image to Cloudinary

**POST** `/cloudinary/upload`

**Description:** Upload an image file to Cloudinary cloud storage. Returns the secure URL of the uploaded image.

**Authentication:** Bearer JWT Token (Required)

**Content-Type:** `multipart/form-data`

**Request Body:**

```
file: file (required)
  Accepted formats: jpg, jpeg, png, gif, webp, svg, pdf
  Max size: 5MB
```

**Response:**

```json
{
  "url": "https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/image.jpg",
  "message": "Image uploaded successfully"
}
```

**Status Codes:**

- `201 Created` - Image successfully uploaded
- `400 Bad Request` - No file provided or invalid file format
- `401 Unauthorized` - Missing or invalid JWT token

**Error Response Example:**

```json
{
  "message": "No file provided",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 2. Delete Image from Cloudinary

**DELETE** `/cloudinary/delete/{publicId}`

**Description:** Delete an image from Cloudinary cloud storage by its public ID.

**Authentication:** Bearer JWT Token (Required)

**Path Parameters:**

- `publicId` (string): The Cloudinary public ID of the image to delete (path format)
  - Example: `doju/products/product-image-123`
  - Note: This is typically the path structure used when uploading

**Response:**

```json
{
  "message": "Image deleted successfully",
  "publicId": "doju/products/product-image-123"
}
```

**Status Codes:**

- `200 OK` - Image successfully deleted
- `400 Bad Request` - Image deletion failed
- `401 Unauthorized` - Missing or invalid JWT token

**Error Response Example:**

```json
{
  "message": "Image deletion failed: Resource not found",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Authentication

### Bearer Token Format

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {your_jwt_token}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "name=Portable Oxygen Concentrator" \
  -F "description=High-quality portable oxygen concentrator" \
  -F "price=499.99" \
  -F "stock=50" \
  -F "images=@/path/to/image-1.jpg" \
  -F "images=@/path/to/image-2.jpg"
```

---

## User Roles

### Seller

- Can create products
- Can update their own products
- Can view all products

### Buyer

- Can view products only
- Cannot create or update products

---

## Environment Variables Required

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=86400
```

---

## API Base URL

```
http://localhost:3000
```

---

## Content Validation Rules

### Product Name

- Required
- String type
- Recommended: 5-100 characters

### Product Description

- Required
- String type
- Recommended: 20-500 characters

### Product Price

- Required
- Number type
- Minimum value: 0
- Recommended: 2 decimal places

### Product Stock

- Required
- Number type
- Minimum value: 0
- Recommended: Integer value

### Product Images

- Optional
- Supported formats: jpg, jpeg, png, gif, webp
- Maximum file size: 5MB each
- Recommended dimensions: 800x600px or larger

---

## Common Error Messages

| Status | Error                 | Description                             |
| ------ | --------------------- | --------------------------------------- |
| 400    | Bad Request           | Invalid input data or validation failed |
| 401    | Unauthorized          | Missing or expired JWT token            |
| 403    | Forbidden             | User lacks required permissions/role    |
| 404    | Not Found             | Resource does not exist                 |
| 500    | Internal Server Error | Server error (check logs)               |

---

## Rate Limiting

Currently no rate limiting is implemented. Subject to change for production.

---

## Pagination

Currently not implemented for the `/products` GET endpoint. All active products are returned.

---

## Sorting & Filtering

Currently not available. Will be added in future versions.

---

## Changelog

### Version 1.0.0 (Current)

- Initial Products API with CRUD operations
- Cloudinary image upload/delete integration
- Role-based access control (Seller/Buyer)
- JWT authentication
