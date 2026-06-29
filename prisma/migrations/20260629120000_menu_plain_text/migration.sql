-- MenuCategory: i18nKey -> name, add imageUrl + isActive
ALTER TABLE "MenuCategory" RENAME COLUMN "i18nKey" TO "name";
ALTER TABLE "MenuCategory" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "MenuCategory" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- MenuItem: i18n keys -> plain text, require imageUrl
ALTER TABLE "MenuItem" RENAME COLUMN "nameI18nKey" TO "name";
ALTER TABLE "MenuItem" RENAME COLUMN "descriptionI18nKey" TO "description";
UPDATE "MenuItem" SET "imageUrl" = '/images/menu-placeholder.svg' WHERE "imageUrl" IS NULL;
ALTER TABLE "MenuItem" ALTER COLUMN "imageUrl" SET NOT NULL;
