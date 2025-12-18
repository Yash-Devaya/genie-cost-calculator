-- CreateTable
CREATE TABLE "AppSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentCost" (
    "id" SERIAL NOT NULL,
    "component" TEXT NOT NULL,
    "tickets1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets10" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets5000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_key_key" ON "AppSettings"("key");

-- CreateIndex
CREATE INDEX "AppSettings_key_idx" ON "AppSettings"("key");

-- CreateIndex
CREATE INDEX "ComponentCost_component_idx" ON "ComponentCost"("component");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentCost_component_key" ON "ComponentCost"("component");
