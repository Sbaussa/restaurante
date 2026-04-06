-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashChange" DOUBLE PRECISION,
ADD COLUMN     "cashGiven" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT;
