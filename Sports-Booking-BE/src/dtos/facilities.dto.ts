import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { PaginationDto } from './query.dto'

export class CreateFacilityDto {
  @IsNotEmpty({ message: 'Tên cụm sân không được để trống!' })
  @IsString()
  name!: string

  @IsNotEmpty({ message: 'Địa chỉ không được để trống!' })
  @IsString()
  address!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNotEmpty({ message: 'Môn thể thao không được để trống' })
  @IsNumber()
  sportId!: number

  @IsOptional()
  @IsString()
  district?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsNumber()
  latitude?: number

  @IsOptional()
  @IsNumber()
  longitude?: number

  @IsOptional()
  @IsString()
  openTime?: string

  @IsOptional()
  @IsString()
  closeTime?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}

export class CreateFieldDto {
  @IsNotEmpty({ message: 'Tên sân không được để trống!' })
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class PricingSlotDto {
  @IsNotEmpty()
  @IsString()
  startTime!: string

  @IsNotEmpty()
  @IsString()
  endTime!: string

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  pricePerHour!: number

  @IsOptional()
  @IsBoolean()
  isWeekend!: boolean
}

export class SetFieldPricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingSlotDto)
  pricings!: PricingSlotDto[]
}

export class FacilityQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string // search theo tên

  @IsOptional()
  @IsString()
  district?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sportId?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @IsIn(['newest', 'rating', 'price_asc', 'price_desc'])
  sort?: string
}
