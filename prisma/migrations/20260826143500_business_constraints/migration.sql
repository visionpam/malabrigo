-- Financial and catalog integrity
ALTER TABLE "programs"
  ADD CONSTRAINT "programs_cash_price_nonnegative" CHECK ("cash_price" >= 0),
  ADD CONSTRAINT "programs_separation_nonnegative" CHECK ("separation" >= 0),
  ADD CONSTRAINT "programs_beneficiary_cap_positive" CHECK ("beneficiary_cap" > 0),
  ADD CONSTRAINT "programs_cash_allocation_positive" CHECK (
    ("cash_shares" IS NULL OR "cash_shares" > 0)
    AND ("cash_stay_days" IS NULL OR "cash_stay_days" > 0)
    AND NOT ("cash_shares" IS NOT NULL AND "cash_stay_days" IS NOT NULL)
  );

ALTER TABLE "financing_plans"
  ADD CONSTRAINT "financing_plans_term_positive" CHECK ("term_months" > 0),
  ADD CONSTRAINT "financing_plans_amounts_nonnegative" CHECK (
    "down_payment" >= 0 AND "financed_amount" >= 0 AND "monthly_payment" >= 0
  ),
  ADD CONSTRAINT "financing_plans_allocation_positive" CHECK (
    ("shares_granted" IS NULL OR "shares_granted" > 0)
    AND ("stay_days_granted" IS NULL OR "stay_days_granted" > 0)
    AND NOT ("shares_granted" IS NOT NULL AND "stay_days_granted" IS NOT NULL)
  );

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_amounts_nonnegative" CHECK (
    "total_price" >= 0 AND "separation_amount" >= 0 AND "down_payment_amount" >= 0
  ),
  ADD CONSTRAINT "sales_currency_uppercase" CHECK ("currency" = upper("currency"));

ALTER TABLE "installments"
  ADD CONSTRAINT "installments_number_positive" CHECK ("number" > 0),
  ADD CONSTRAINT "installments_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "installments_paid_amount_valid" CHECK (
    "paid_amount" >= 0 AND "paid_amount" <= "amount"
  );

ALTER TABLE "payment_submissions"
  ADD CONSTRAINT "payment_submissions_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "payment_submissions_currency_uppercase" CHECK ("currency" = upper("currency"));

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "payments_currency_uppercase" CHECK ("currency" = upper("currency"));

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "share_allocations"
  ADD CONSTRAINT "share_allocations_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "stay_allocations"
  ADD CONSTRAINT "stay_allocations_days_positive" CHECK ("days" > 0);

ALTER TABLE "project_stages"
  ADD CONSTRAINT "project_stages_weight_valid" CHECK ("weight" >= 0 AND "weight" <= 100),
  ADD CONSTRAINT "project_stages_date_order" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "starts_at" <= "ends_at"
  );

ALTER TABLE "project_updates"
  ADD CONSTRAINT "project_updates_progress_valid" CHECK ("progress" >= 0 AND "progress" <= 100);

ALTER TABLE "sponsorships"
  ADD CONSTRAINT "sponsorships_no_self_sponsorship" CHECK ("child_id" <> "sponsor_id");

-- Serialize share issuance and enforce the project-wide cap.
CREATE OR REPLACE FUNCTION enforce_total_share_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allocated_total bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(2250000);

  SELECT COALESCE(SUM("quantity"), 0)
    INTO allocated_total
    FROM "share_allocations"
   WHERE "id" <> NEW."id";

  IF allocated_total + NEW."quantity" > 2250000 THEN
    RAISE EXCEPTION 'La emisión supera el límite de 2,250,000 acciones';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "share_allocations_total_cap"
BEFORE INSERT OR UPDATE OF "quantity" ON "share_allocations"
FOR EACH ROW EXECUTE FUNCTION enforce_total_share_cap();

-- Reject sponsorship changes that would create a cycle at any depth.
CREATE OR REPLACE FUNCTION prevent_sponsorship_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."child_id" = NEW."sponsor_id" THEN
    RAISE EXCEPTION 'Un socio no puede patrocinarse a sí mismo';
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors("member_id") AS (
      SELECT NEW."sponsor_id"
      UNION
      SELECT s."sponsor_id"
        FROM "sponsorships" s
        JOIN ancestors a ON s."child_id" = a."member_id"
    )
    SELECT 1 FROM ancestors WHERE "member_id" = NEW."child_id"
  ) THEN
    RAISE EXCEPTION 'La relación de patrocinio crearía un ciclo';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "sponsorships_prevent_cycle"
BEFORE INSERT OR UPDATE OF "child_id", "sponsor_id" ON "sponsorships"
FOR EACH ROW EXECUTE FUNCTION prevent_sponsorship_cycle();
