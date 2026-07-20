-- DropForeignKey
ALTER TABLE "movements" DROP CONSTRAINT "movements_asset_id_fkey";

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
