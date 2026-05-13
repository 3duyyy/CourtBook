/*
  Warnings:

  - A unique constraint covering the columns `[payos_order_code]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payos_order_code]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `payos_order_code` BIGINT NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `payos_order_code` BIGINT NULL,
    MODIFY `method` ENUM('qr_transfer', 'cash', 'payos') NOT NULL DEFAULT 'qr_transfer';

-- CreateIndex
CREATE UNIQUE INDEX `bookings_payos_order_code_key` ON `bookings`(`payos_order_code`);

-- CreateIndex
CREATE UNIQUE INDEX `transactions_payos_order_code_key` ON `transactions`(`payos_order_code`);
