import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

console.log('User:', process.env.DB_USER)
console.log('DATABASE_HOST:', process.env.DB_HOST)
console.log('DATABASE_USER:', process.env.DB_USER)
console.log('DATABASE_PASSWORD exists:', !!process.env.DB_PASSWORD)
console.log('DATABASE_NAME:', process.env.DB_NAME)

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 5
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const roles = [
    { id: 1, name: 'admin', description: 'Administrator - Full access' },
    { id: 2, name: 'owner', description: 'Field Owner - Manage own fields' },
    { id: 3, name: 'customer', description: 'Customer - Book fields' }
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { description: role.description },
      create: role
    })
  }

  const permissions = [
    { slug: 'manage_users', name: 'Quản lý người dùng' },

    { slug: 'create_field', name: 'Tạo sân' },
    { slug: 'update_field', name: 'Cập nhật sân' },
    { slug: 'delete_field', name: 'Xóa sân' },
    { slug: 'approve_field', name: 'Phê duyệt sân' },

    { slug: 'create_booking', name: 'Tạo booking' },
    { slug: 'view_own_bookings', name: 'Xem booking của mình' },
    { slug: 'view_field_bookings', name: 'Xem booking của sân mình' },
    { slug: 'view_all_bookings', name: 'Xem tất cả booking' },

    { slug: 'view_own_payments', name: 'Xem payment của mình' },
    { slug: 'view_field_payments', name: 'Xem payment của sân mình' },
    { slug: 'view_all_payments', name: 'Xem tất cả payment' },
    { slug: 'process_refund', name: 'Xử lý hoàn tiền' },

    { slug: 'create_review', name: 'Tạo review' },
    { slug: 'update_own_review', name: 'Cập nhật review của mình' },
    { slug: 'delete_review', name: 'Xóa review' }
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: { name: permission.name },
      create: permission
    })
  }

  const rolePermissionsMap = [
    {
      roleId: 1,
      permissions: [
        'manage_users',
        'create_field',
        'update_field',
        'delete_field',
        'approve_field',
        'create_booking',
        'view_all_bookings',
        'view_all_payments',
        'process_refund',
        'delete_review'
      ]
    },
    {
      roleId: 2,
      permissions: ['create_field', 'update_field', 'create_booking', 'view_field_bookings', 'view_field_payments']
    },
    {
      roleId: 3,
      permissions: ['create_booking', 'view_own_bookings', 'view_own_payments', 'create_review', 'update_own_review']
    }
  ]

  for (const { roleId, permissions: perms } of rolePermissionsMap) {
    for (const permSlug of perms) {
      const permission = await prisma.permission.findUnique({
        where: { slug: permSlug }
      })

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId,
            permissionId: permission.id
          }
        })
      }
    }
  }

  const adminPassword = await bcrypt.hash('Abc@123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@sportsbooking.com' },
    update: {},
    create: {
      email: 'admin@sportsbooking.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      phone: '0123456789',
      roleId: 1,
      status: 'active',
      isVerified: true
    }
  })

  const ownerPassword = await bcrypt.hash('owner123', 10)
  await prisma.user.upsert({
    where: { email: 'owner@sportsbooking.com' },
    update: {},
    create: {
      email: 'owner@sportsbooking.com',
      passwordHash: ownerPassword,
      fullName: 'Test Field Owner',
      phone: '0987654321',
      roleId: 2,
      status: 'active',
      isVerified: true
    }
  })

  const customerPassword = await bcrypt.hash('customer123', 10)
  await prisma.user.upsert({
    where: { email: 'customer@sportsbooking.com' },
    update: {},
    create: {
      email: 'customer@sportsbooking.com',
      passwordHash: customerPassword,
      fullName: 'Test Customer',
      phone: '0369258147',
      roleId: 3,
      status: 'active',
      isVerified: true
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
