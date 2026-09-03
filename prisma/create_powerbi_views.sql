-- ==============================================================================
-- PINTTECH - POWER BI ANALYTICAL VIEWS (STAR SCHEMA)
-- Views SQL de alta performance e modelagem dimensional para Power BI
-- ==============================================================================

-- 1. DIMENSÃO: CERVEJARIAS (MULTI-TENANT)
CREATE OR REPLACE VIEW vw_bi_dim_cervejarias AS
SELECT
  b."id" AS brewery_id,
  b."name" AS brewery_name,
  b."slug" AS brewery_slug,
  b."document" AS brewery_document,
  b."email" AS brewery_email,
  b."phone" AS brewery_phone,
  b."city" AS brewery_city,
  b."state" AS brewery_state,
  b."plan" AS saas_plan,
  b."monthlyPrice" AS monthly_price,
  b."billingStatus" AS billing_status,
  b."active" AS is_active,
  b."createdAt" AS created_at
FROM "Brewery" b;

-- 2. DIMENSÃO: CLIENTES & PDVs
CREATE OR REPLACE VIEW vw_bi_dim_clientes AS
SELECT
  c."id" AS client_id,
  c."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  c."name" AS client_name,
  COALESCE(c."tradeName", c."name") AS trade_name,
  c."document" AS client_document,
  c."email" AS client_email,
  c."phone" AS client_phone,
  c."city" AS client_city,
  c."state" AS client_state,
  c."neighborhood" AS client_neighborhood,
  c."address" AS client_address,
  c."zipCode" AS client_zip_code,
  c."creditLimit" AS credit_limit,
  c."retainedKegsCount" AS retained_kegs_count,
  c."createdAt" AS created_at,
  c."updatedAt" AS updated_at
FROM "Client" c
JOIN "Brewery" b ON b."id" = c."breweryId";

-- 3. DIMENSÃO: RECEITAS & PRODUTOS (BEER RECIPES)
CREATE OR REPLACE VIEW vw_bi_dim_receitas AS
SELECT
  r."id" AS recipe_id,
  r."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  r."name" AS recipe_name,
  r."style" AS beer_style,
  r."styleCategory" AS style_category,
  r."bjcpStyleCode" AS bjcp_code,
  r."og" AS target_og,
  r."fg" AS target_fg,
  r."abv" AS target_abv,
  r."ibu" AS target_ibu,
  r."ebc" AS target_ebc,
  r."batchYieldLiters" AS batch_yield_liters,
  r."costPerLiter" AS cost_per_liter,
  r."salePricePerLiter" AS sale_price_per_liter,
  r."suggestedPricePerLiter" AS suggested_price_per_liter,
  r."profitMarginPercent" AS profit_margin_percent,
  r."pricingModel" AS pricing_model,
  r."mapaRegistration" AS mapa_registration,
  r."createdAt" AS created_at
FROM "BeerRecipe" r
JOIN "Brewery" b ON b."id" = r."breweryId";

-- 4. DIMENSÃO: TANQUES & FERMENTADORES
CREATE OR REPLACE VIEW vw_bi_dim_tanques AS
SELECT
  t."id" AS tank_id,
  t."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  t."name" AS tank_name,
  t."capacityLiters" AS capacity_liters,
  t."type" AS tank_type,
  t."status" AS current_status,
  t."currentBatchId" AS current_batch_id,
  t."notes" AS notes
FROM "Tank" t
JOIN "Brewery" b ON b."id" = t."breweryId";

-- 5. DIMENSÃO: EQUIPAMENTOS (CHOPEIRAS, CILINDROS CO2)
CREATE OR REPLACE VIEW vw_bi_dim_equipamentos AS
SELECT
  e."id" AS equipment_id,
  e."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  e."code" AS equipment_code,
  e."name" AS equipment_name,
  e."type" AS equipment_type,
  e."status" AS equipment_status,
  e."voltage" AS voltage,
  e."serialNumber" AS serial_number,
  e."currentClientId" AS current_client_id,
  COALESCE(c."tradeName", c."name") AS current_client_name,
  c."city" AS current_client_city,
  e."lastMaintenanceAt" AS last_maintenance_at
FROM "Equipment" e
JOIN "Brewery" b ON b."id" = e."breweryId"
LEFT JOIN "Client" c ON c."id" = e."currentClientId";

-- 6. DIMENSÃO: FORNECEDORES DE INSUMOS
CREATE OR REPLACE VIEW vw_bi_dim_fornecedores AS
SELECT
  s."id" AS supplier_id,
  s."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  s."name" AS supplier_name,
  s."tradeName" AS supplier_trade_name,
  s."document" AS supplier_document,
  s."category" AS supplier_category,
  s."email" AS supplier_email,
  s."phone" AS supplier_phone,
  s."address" AS supplier_address
FROM "Supplier" s
JOIN "Brewery" b ON b."id" = s."breweryId";

-- 7. DIMENSÃO: INSUMOS DE ESTOQUE
CREATE OR REPLACE VIEW vw_bi_dim_insumos AS
SELECT
  i."id" AS inventory_item_id,
  i."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  i."name" AS item_name,
  i."category" AS item_category,
  i."unit" AS unit,
  i."currentQuantity" AS current_quantity,
  i."minimumQuantity" AS minimum_quantity,
  i."costPerUnit" AS cost_per_unit,
  (i."currentQuantity" * i."costPerUnit") AS total_stock_value,
  CASE WHEN i."currentQuantity" <= i."minimumQuantity" THEN TRUE ELSE FALSE END AS is_low_stock,
  s."name" AS default_supplier_name,
  i."location" AS warehouse_location,
  i."expirationDate" AS expiration_date
FROM "InventoryItem" i
JOIN "Brewery" b ON b."id" = i."breweryId"
LEFT JOIN "Supplier" s ON s."id" = i."supplierId";

-- 8. FATO: PEDIDOS & VENDAS (ITEM A ITEM DESNORMALIZADO)
CREATE OR REPLACE VIEW vw_bi_fato_pedidos_vendas AS
SELECT
  oi."id" AS order_item_id,
  o."id" AS order_id,
  o."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  o."orderNumber" AS order_number,
  o."status" AS order_status,
  o."paymentStatus" AS payment_status,
  o."paymentMethod" AS payment_method,
  o."createdAt"::date AS order_date,
  o."createdAt" AS order_timestamp,
  o."deliveryDate"::date AS delivery_date,
  o."estimatedReturnDate"::date AS estimated_return_date,
  o."actualReturnDate"::date AS actual_return_date,
  o."clientId" AS client_id,
  c."name" AS client_name,
  COALESCE(c."tradeName", c."name") AS client_trade_name,
  c."city" AS client_city,
  c."state" AS client_state,
  u."name" AS driver_name,
  oi."recipeId" AS recipe_id,
  COALESCE(r."name", oi."description") AS beer_name,
  COALESCE(r."style", 'Outros') AS beer_style,
  oi."batchId" AS batch_id,
  pb."batchNumber" AS batch_number,
  oi."kegId" AS keg_id,
  k."code" AS keg_code,
  COALESCE(k."capacity", 50) AS keg_capacity_liters,
  oi."description" AS item_description,
  oi."quantity" AS quantity_ordered,
  (oi."quantity" * COALESCE(k."capacity", 50)) AS total_volume_liters,
  oi."unitPrice" AS item_unit_price,
  oi."totalPrice" AS item_total_price,
  (COALESCE(r."costPerLiter", 0) * (oi."quantity" * COALESCE(k."capacity", 50))) AS estimated_cost,
  (oi."totalPrice" - (COALESCE(r."costPerLiter", 0) * (oi."quantity" * COALESCE(k."capacity", 50)))) AS estimated_gross_profit,
  o."subtotal" AS order_subtotal,
  o."discount" AS order_discount,
  o."deliveryFee" AS order_delivery_fee,
  o."cautionDeposit" AS order_caution_deposit,
  o."totalAmount" AS order_total_amount,
  o."paidAmount" AS order_paid_amount,
  o."remainingAmount" AS order_remaining_amount
FROM "OrderItem" oi
JOIN "Order" o ON o."id" = oi."orderId"
JOIN "Brewery" b ON b."id" = o."breweryId"
JOIN "Client" c ON c."id" = o."clientId"
LEFT JOIN "BeerRecipe" r ON r."id" = oi."recipeId"
LEFT JOIN "ProductionBatch" pb ON pb."id" = oi."batchId"
LEFT JOIN "Keg" k ON k."id" = oi."kegId"
LEFT JOIN "User" u ON u."id" = o."driverUserId";

-- 9. FATO: LOTES DE PRODUÇÃO & BRASSAGENS
CREATE OR REPLACE VIEW vw_bi_fato_producao_lotes AS
SELECT
  pb."id" AS batch_id,
  pb."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  pb."batchNumber" AS batch_number,
  pb."recipeId" AS recipe_id,
  r."name" AS recipe_name,
  r."style" AS beer_style,
  pb."tankId" AS tank_id,
  t."name" AS tank_name,
  pb."status" AS batch_status,
  pb."volumePlannedLiters" AS volume_planned_liters,
  pb."volumeProducedLiters" AS volume_produced_liters,
  COALESCE(pb."volumeProducedLiters", pb."volumePlannedLiters") AS effective_volume_liters,
  pb."costPerLiter" AS cost_per_liter,
  pb."totalCost" AS total_cost,
  pb."brewDate"::date AS brew_date,
  pb."fermentationStartDate"::date AS fermentation_start_date,
  pb."maturationStartDate"::date AS maturation_start_date,
  pb."packagingDate"::date AS packaging_date,
  pb."measuredOg" AS measured_og,
  pb."measuredFg" AS measured_fg,
  pb."measuredAbv" AS measured_abv,
  pb."measuredIbu" AS measured_ibu,
  pb."measuredEbc" AS measured_ebc,
  pb."attenuationPercent" AS attenuation_percent,
  pb."phMash" AS ph_mash,
  pb."phBoil" AS ph_boil,
  pb."phFermentationStart" AS ph_fermentation_start,
  pb."phFinal" AS ph_final,
  pb."yeastStrain" AS yeast_strain,
  pb."yeastGeneration" AS yeast_generation,
  pb."mapaRegistration" AS mapa_registration,
  pb."technicalResponsible" AS technical_responsible
FROM "ProductionBatch" pb
JOIN "Brewery" b ON b."id" = pb."breweryId"
JOIN "BeerRecipe" r ON r."id" = pb."recipeId"
LEFT JOIN "Tank" t ON t."id" = pb."tankId";

-- 10. FATO: POSIÇÃO ATUAL DOS BARRIS (SNAPSHOT DO PARQUE)
CREATE OR REPLACE VIEW vw_bi_fato_barris_posicao_atual AS
SELECT
  k."id" AS keg_id,
  k."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  k."code" AS keg_code,
  k."capacity" AS capacity_liters,
  k."currentVolumeLiters" AS current_volume_liters,
  k."kegType" AS keg_type,
  k."status" AS current_status,
  k."currentBeerName" AS current_beer_name,
  pb."batchNumber" AS current_batch_number,
  k."currentClientId" AS current_client_id,
  COALESCE(c."tradeName", c."name") AS current_client_name,
  c."city" AS current_client_city,
  k."lastDeliveredAt"::date AS last_delivered_date,
  CASE 
    WHEN k."lastDeliveredAt" IS NOT NULL AND k."status" = 'NO_CLIENTE'
    THEN (CURRENT_DATE - k."lastDeliveredAt"::date)
    ELSE 0 
  END AS days_at_client,
  k."lastSanitizedAt"::date AS last_sanitized_date,
  k."lastFilledAt"::date AS last_filled_date,
  k."lastReturnedAt"::date AS last_returned_date,
  k."purchaseDate"::date AS purchase_date
FROM "Keg" k
JOIN "Brewery" b ON b."id" = k."breweryId"
LEFT JOIN "ProductionBatch" pb ON pb."id" = k."currentBatchId"
LEFT JOIN "Client" c ON c."id" = k."currentClientId";

-- 11. FATO: HISTÓRICO DE MOVIMENTAÇÕES DE BARRIS (LOGÍSTICA & CICLO DE VIDA)
CREATE OR REPLACE VIEW vw_bi_fato_barris_movimentacoes AS
SELECT
  km."id" AS movement_id,
  km."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  km."kegId" AS keg_id,
  k."code" AS keg_code,
  COALESCE(k."capacity", 50) AS keg_capacity_liters,
  km."action" AS action_type,
  km."fromStatus" AS from_status,
  km."toStatus" AS to_status,
  km."fromClientId" AS from_client_id,
  km."toClientId" AS to_client_id,
  COALESCE(c."tradeName", c."name") AS client_name,
  c."city" AS client_city,
  km."batchId" AS batch_id,
  pb."batchNumber" AS batch_number,
  km."volumeLiters" AS volume_liters,
  km."userName" AS operator_name,
  km."driverName" AS driver_name,
  km."createdAt"::date AS movement_date,
  km."createdAt" AS movement_timestamp
FROM "KegMovement" km
JOIN "Brewery" b ON b."id" = km."breweryId"
LEFT JOIN "Keg" k ON k."id" = km."kegId"
LEFT JOIN "Client" c ON c."id" = km."toClientId"
LEFT JOIN "ProductionBatch" pb ON pb."id" = km."batchId";

-- 12. FATO: FINANCEIRO & FLUXO DE CAIXA
CREATE OR REPLACE VIEW vw_bi_fato_financeiro AS
SELECT
  ft."id" AS transaction_id,
  ft."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  ft."orderId" AS order_id,
  o."orderNumber" AS order_number,
  ft."type" AS transaction_type, -- RECEITA, DESPESA
  ft."category" AS category,
  ft."description" AS description,
  ft."amount" AS amount,
  ft."status" AS payment_status, -- PAGO, PENDENTE, VENCIDO, CANCELADO
  ft."dueDate"::date AS due_date,
  ft."paymentDate"::date AS payment_date,
  ft."paymentMethod" AS payment_method,
  ft."documentNumber" AS document_number,
  CASE 
    WHEN ft."status" = 'PENDENTE' AND ft."dueDate"::date < CURRENT_DATE
    THEN (CURRENT_DATE - ft."dueDate"::date)
    ELSE 0
  END AS days_overdue,
  ft."createdAt"::date AS created_date
FROM "FinancialTransaction" ft
JOIN "Brewery" b ON b."id" = ft."breweryId"
LEFT JOIN "Order" o ON o."id" = ft."orderId";

-- 13. FATO: HISTÓRICO DE MOVIMENTAÇÕES DE ESTOQUE
CREATE OR REPLACE VIEW vw_bi_fato_movimentacao_estoque AS
SELECT
  im."id" AS movement_id,
  im."breweryId" AS brewery_id,
  b."name" AS brewery_name,
  im."inventoryItemId" AS inventory_item_id,
  i."name" AS item_name,
  i."category" AS item_category,
  i."unit" AS item_unit,
  im."inventoryLotId" AS lot_id,
  im."supplierLot" AS supplier_lot,
  im."type" AS movement_type, -- ENTRADA, SAIDA_BRASSAGEM, AJUSTE_PERDA, INVENTARIO
  im."quantity" AS quantity_moved,
  im."costPerUnit" AS cost_per_unit,
  (ABS(im."quantity") * COALESCE(im."costPerUnit", i."costPerUnit", 0)) AS total_cost_value,
  im."batchId" AS batch_id,
  pb."batchNumber" AS batch_number,
  im."userName" AS user_name,
  im."notes" AS notes,
  im."createdAt"::date AS movement_date,
  im."createdAt" AS movement_timestamp
FROM "InventoryMovement" im
JOIN "Brewery" b ON b."id" = im."breweryId"
JOIN "InventoryItem" i ON i."id" = im."inventoryItemId"
LEFT JOIN "ProductionBatch" pb ON pb."id" = im."batchId";
