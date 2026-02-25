import { Prisma } from '@prisma/client'
import { CreateFacilityDto, CreateFieldDto, FacilityQueryDto, PricingSlotDto } from '../../dtos/facilities.dto'
import { prisma } from '../../shared/prisma/client'

export class FacilitiesRepository {
  static async createFacility(ownerId: number, data: CreateFacilityDto) {
    const { images, ...facilityData } = data

    return prisma.facility.create({
      data: {
        ...facilityData,
        ownerId,
        ...(images?.length && {
          facilityImages: {
            create: images.map((url, index) => ({
              imageUrl: url,
              isThumbnail: index === 0
            }))
          }
        })
      },
      include: {
        sport: true,
        facilityImages: true,
        facilityUtilities: { include: { utility: true } }
      }
    })
  }

  static async findFacilitiesByOwner(ownerId: number) {
    return prisma.facility.findMany({
      where: { ownerId },
      include: {
        sport: true,
        facilityImages: { where: { isThumbnail: true } },
        fields: { select: { id: true, name: true, status: true } },
        _count: { select: { fields: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async findFacilityById(id: number) {
    return prisma.facility.findUnique({
      where: { id },
      include: {
        sport: true,
        facilityImages: { where: { isThumbnail: true } },
        fields: { include: { fieldPricings: true } }
      }
    })
  }

  static async createField(facilityId: number, data: CreateFieldDto) {
    return prisma.field.create({
      data: {
        facilityId,
        name: data.name,
        ...(data.description && { description: data.description })
      }
    })
  }

  static async findFieldById(id: number) {
    return prisma.field.findUnique({
      where: { id },
      include: { fieldPricings: true, facility: true }
    })
  }

  static async replaceFieldPricings(fieldId: number, pricings: PricingSlotDto[]) {
    await prisma.fieldPricing.deleteMany({ where: { fieldId } })

    return prisma.fieldPricing.createMany({
      data: pricings.map((p) => ({
        fieldId,
        startTime: p.startTime,
        endTime: p.endTime,
        pricePerHour: p.pricePerHour,
        isWeekend: p.isWeekend ?? false
      }))
    })
  }

  static async findPricingsByField(fieldId: number) {
    return prisma.fieldPricing.findMany({
      where: { fieldId },
      orderBy: [{ isWeekend: 'asc' }, { startTime: 'asc' }]
    })
  }

  // ========================== Public ==============================
  static async findPublicFacilities(query: FacilityQueryDto) {
    const { q, city, district, page = 1, limit = 10, maxPrice, minPrice, sort, sportId } = query

    const skip = (page - 1) * limit

    const where: Prisma.FacilityWhereInput = {
      status: 'active',
      ...(q && { name: { contains: q } }),
      ...(district && { district }),
      ...(city && { city }),
      ...(sportId && { sportId }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        fields: {
          some: {
            fieldPricings: {
              some: {
                ...(minPrice !== undefined && { pricePerHour: { gte: minPrice } }),
                ...(maxPrice !== undefined && { pricePerHour: { lte: maxPrice } })
              }
            }
          }
        }
      })
    }

    const orderBy: Prisma.FacilityOrderByWithRelationInput = sort === 'newest' ? { createdAt: 'desc' } : { createdAt: 'asc' }

    const [facilities, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        orderBy,
        include: {
          sport: { select: { id: true, name: true, iconUrl: true } },
          facilityImages: { where: { isThumbnail: true }, take: 1 },
          _count: { select: { reviews: true, fields: true } },
          reviews: { select: { rating: true } },
          fields: { include: { fieldPricings: true } }
        }
      }),
      prisma.facility.count({ where })
    ])

    let result = facilities.map(({ reviews, fields, ...f }) => {
      const allPrices = fields.flatMap((field) => field.fieldPricings.map((p) => Number(p.pricePerHour)))

      const minPrice = allPrices.length ? Math.min(...allPrices) : null

      return {
        ...f,
        minPrice,
        avgRating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
        reviewCount: reviews.length
      }
    })

    if (sort === 'price_asc') {
      result.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity))
    } else if (sort === 'price_desc') {
      result.sort((a, b) => (b.minPrice ?? Infinity) - (a.minPrice ?? Infinity))
    } else if (sort === 'rating') {
      result.sort((a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0))
    }

    const paginationResult = result.slice(skip, skip + limit)

    return {
      data: paginationResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  static async findPublicFacilityById(id: number) {
    return prisma.facility.findFirst({
      where: { id, status: 'active' },
      include: {
        sport: true,
        owner: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true }
        },
        facilityImages: true,
        facilityUtilities: { include: { utility: true } },
        fields: {
          where: { status: 'active' },
          include: {
            fieldPricings: { orderBy: [{ isWeekend: 'asc' }, { startTime: 'asc' }] }
          }
        },
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true } }
      }
    })
  }

  static async findReviewsByFacility(facilityId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { facilityId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true }
          }
        }
      }),
      prisma.review.count({ where: { facilityId } })
    ])

    return { data: reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  static async findFieldsWithBookingsByDate(facilityId: number, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return prisma.field.findMany({
      where: {
        facilityId,
        status: 'active'
      },
      include: {
        fieldPricings: {
          orderBy: [{ isWeekend: 'asc' }, { startTime: 'asc' }]
        },
        bookings: {
          where: { status: { notIn: ['cancelled', 'rejected'] }, startTime: { gt: startOfDay }, endTime: { lt: endOfDay } },
          select: { startTime: true, endTime: true, status: true }
        }
      }
    })
  }
}
