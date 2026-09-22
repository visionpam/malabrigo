CREATE TABLE "address_regions" (
  "code" VARCHAR(20) NOT NULL,
  "country_code" CHAR(2) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "address_regions_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "address_provinces" (
  "code" VARCHAR(24) NOT NULL,
  "region_code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "address_provinces_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "address_districts" (
  "code" VARCHAR(24) NOT NULL,
  "province_code" VARCHAR(24) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "address_districts_pkey" PRIMARY KEY ("code")
);
ALTER TABLE "members" ADD COLUMN "region_code" VARCHAR(20), ADD COLUMN "province_code" VARCHAR(24), ADD COLUMN "district_code" VARCHAR(24);
CREATE INDEX "address_regions_country_code_active_sort_order_idx" ON "address_regions"("country_code", "active", "sort_order");
CREATE INDEX "address_provinces_region_code_active_sort_order_idx" ON "address_provinces"("region_code", "active", "sort_order");
CREATE INDEX "address_districts_province_code_active_sort_order_idx" ON "address_districts"("province_code", "active", "sort_order");
ALTER TABLE "address_regions" ADD CONSTRAINT "address_regions_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "address_provinces" ADD CONSTRAINT "address_provinces_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "address_regions"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "address_districts" ADD CONSTRAINT "address_districts_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "address_provinces"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_region_code_fkey" FOREIGN KEY ("region_code") REFERENCES "address_regions"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "address_provinces"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "address_districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;
