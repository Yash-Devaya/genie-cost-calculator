-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "specifications" TEXT NOT NULL,
    "scalingRationale" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDeployment" BOOLEAN NOT NULL DEFAULT false,
    "tickets1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets10" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets1000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets5000" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_name_idx" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "Component_planId_idx" ON "Component"("planId");

-- CreateIndex
CREATE INDEX "Component_order_idx" ON "Component"("order");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
