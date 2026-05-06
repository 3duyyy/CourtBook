export interface FacilitySport {
  id?: number
  name?: string
  iconUrl?: string
}

export interface FacilityImage {
  id?: number
  imageUrl?: string
  facilityId?: number
  isThumbnail?: boolean
}

export interface FacilityItem {
  id?: number
  ownerId?: number
  sportId?: number

  name?: string
  description?: string

  address?: string
  district?: string
  city?: string

  latitude?: number | null
  longitude?: number | null

  status?: string

  openTime?: string
  closeTime?: string

  createdAt?: string
  updatedAt?: string

  sport?: FacilitySport
  facilityImages?: FacilityImage[]

  minPrice?: number
  avgRating?: number
}

export interface PublicFacilityQueryParams {
  q?: string
  city?: string
  districts?: string[]
  sportIds?: number[]

  minPrice?: number
  maxPrice?: number

  page?: number
  limit?: number

  sort?: "newest" | "price_asc" | "price_desc" | "rating"
}

export interface SearchFacilitiesResponse {
  data: FacilityItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ===========================Detail=================================
export interface FacilityDetailImage {
  id: number
  imageUrl: string
  isThumbnail?: boolean
}

export interface FacilityAmenity {
  id: number
  name: string
  icon?: string
}

export interface FacilityDetailReview {
  id: number
  userName: string
  userId: number
  avatarUrl?: string | null
  rating: number
  comment: string
  createdAt: string
  ownerReply?: string | null
  ownerReplyAt?: string | null
}

export interface FacilityDetailSlot {
  id: string
  startTime: string
  endTime: string
  price: number
  isBooked: boolean
}

export interface FacilityDetailField {
  id: number
  name: string
  description?: string
  fromPrice: number
  slots: FacilityDetailSlot[]
}

export interface FacilityDetailData {
  id: number
  name: string
  address: string
  sportName: string
  district: string
  latitude?: number | null
  longitude?: number | null
  city: string
  rating: number
  reviewCount: number
  description: string
  images: FacilityDetailImage[]
  amenities: FacilityAmenity[]
  fields: FacilityDetailField[]
  reviews: FacilityDetailReview[]
}

// Api mapping
export interface FacilityDetailResponse {
  success: boolean
  data: {
    id: number
    name: string
    description: string | null
    address: string
    district: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
    avgRating: number | null
    reviewCount: number
    sport?: {
      id: number
      name: string
      iconUrl: string | null
    }
    facilityImages: Array<{
      id: number
      imageUrl: string
      isThumbnail: boolean
    }>
    facilityUtilities: Array<{
      utility?: {
        id: number
        name: string
        iconClass?: string | null
      }
    }>
  }
}

export interface FacilityAvailabilityResponse {
  success: boolean
  data: Array<{
    id: number
    name: string
    description: string | null
    fromPrice: number
    slots: Array<{
      startTime: string
      endTime: string
      pricePerHour: string
      status: string
    }>
  }>
}

export interface FacilityReviewsResponse {
  success: boolean
  data: Array<{
    id: number
    rating: number
    comment: string | null
    createdAt: string
    ownerReply?: string | null
    ownerReplyAt?: string | null
    user: {
      id: number
      fullName: string
      avatarUrl: string | null
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
