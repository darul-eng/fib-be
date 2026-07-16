-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'warehouse';

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "is_warehouse" BOOLEAN NOT NULL DEFAULT false;
