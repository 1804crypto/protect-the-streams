-- Shop Purchases table for tracking all item purchases with idempotency
CREATE TABLE IF NOT EXISTS public.shop_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
    currency TEXT NOT NULL CHECK (currency IN ('PTS', 'SOL')),
    amount_pts INTEGER DEFAULT 0,
    amount_sol NUMERIC(18, 9) DEFAULT 0,
    tx_signature TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON public.shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_purchase_id ON public.shop_purchases(purchase_id);

-- Equipment slots column on users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS equipment_slots JSONB DEFAULT '{"weapon": null, "armor": null, "accessory": null}'::jsonb;
