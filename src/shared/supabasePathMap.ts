/**
 * Shared relational table mapper between logical collection/document paths
 * and normalized Supabase PostgreSQL tables.
 * Used identically by both the browser client store and the server adapter.
 */

export const SERVER_TIMESTAMP_SENTINEL = "__SUPABASE_SERVER_TIMESTAMP__";

export interface MappedCollectionSpec {
  table: string;
  pkColumns: string[];
  /** Fixed equality filters implied by the collection path (e.g. business_id = 'teatime') */
  fixedFilters: Record<string, string>;
  /** Maps a camelCase document field name (used in where/orderBy) to a SQL column if indexed, or null for JSONB */
  mapFieldToColumn: (field: string) => string | null;
  /** Converts a document ID + JS object payload into a Postgres row for upsert */
  toRow: (docId: string, payload: Record<string, any>, existingData?: Record<string, any>) => Record<string, any>;
  /** Converts a Postgres row back into { id, data } */
  fromRow: (row: Record<string, any>) => { id: string; data: Record<string, any> };
}

export interface MappedDocSpec extends MappedCollectionSpec {
  docId: string;
  /** Exact primary-key filter for fetching/updating/deleting this single row */
  pkFilter: Record<string, string>;
}

function normalizeBizId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "biz_teatime") return "teatime";
  return trimmed;
}

/**
 * Recursively replaces serverTimestamp() sentinels and Firestore-like Timestamp objects
 * with ISO-8601 strings so JSONB payloads are clean and deterministic.
 */
export function sanitizePayload(value: any, nowIso: string): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === "object") {
    if (value.__sentinel === SERVER_TIMESTAMP_SENTINEL) {
      return nowIso;
    }
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => sanitizePayload(item, nowIso));
    }
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        cleaned[k] = sanitizePayload(v, nowIso);
      }
    }
    return cleaned;
  }
  return value;
}

export function splitPathSegments(rawPath: string): string[] {
  return rawPath
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveCollectionSpec(collectionPath: string): MappedCollectionSpec {
  const segs = splitPathSegments(collectionPath);

  // 1. settings (e.g. settings/cafe)
  if (segs.length === 1 && segs[0] === "settings") {
    return {
      table: "cafe_settings",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "cafeName") return "cafe_name";
        if (f === "isOrderingPaused") return "is_ordering_paused";
        if (f === "updatedAt") return "updated_at";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        return {
          id: docId,
          cafe_name: String(merged.cafeName ?? merged.name ?? "TEA TIME"),
          is_ordering_paused: Boolean(merged.isOrderingPaused),
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            cafeName: row.cafe_name ?? base.cafeName ?? "TEA TIME",
            isOrderingPaused: row.is_ordering_paused ?? base.isOrderingPaused ?? false,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 2. businesses
  if (segs.length === 1 && segs[0] === "businesses") {
    return {
      table: "businesses",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "slug") return "slug";
        if (f === "name") return "name";
        if (f === "ownerUid") return "owner_uid";
        if (f === "ownerEmail") return "owner_email";
        if (f === "status") return "status";
        if (f === "isOrderingPaused") return "is_ordering_paused";
        if (f === "createdAt") return "created_at";
        if (f === "updatedAt") return "updated_at";
        return null;
      },
      toRow: (rawDocId, payload, existing = {}) => {
        const docId = normalizeBizId(rawDocId);
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        const slug = String(merged.slug || docId).trim().toLowerCase();
        merged.slug = slug;
        const socialLinks = Array.isArray(merged.socialLinks)
          ? merged.socialLinks
          : Array.isArray(merged.socialLinkItems)
          ? merged.socialLinkItems
          : [];
        const branding =
          merged.branding && typeof merged.branding === "object" ? merged.branding : {};

        return {
          id: docId,
          slug,
          name: String(merged.name || merged.businessName || docId),
          owner_uid: merged.ownerUid ? String(merged.ownerUid) : null,
          owner_email: merged.ownerEmail ? String(merged.ownerEmail).trim().toLowerCase() : null,
          status: String(merged.status || "ACTIVE"),
          is_ordering_paused: Boolean(merged.isOrderingPaused),
          branding,
          social_links: socialLinks,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const branding =
          row.branding && typeof row.branding === "object" && Object.keys(row.branding).length > 0
            ? { ...(base.branding || {}), ...row.branding }
            : base.branding || {};
        const socialLinks =
          Array.isArray(row.social_links) && row.social_links.length > 0
            ? row.social_links
            : base.socialLinks ?? base.socialLinkItems ?? [];
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            slug: row.slug ?? base.slug ?? String(row.id),
            name: row.name ?? base.name ?? String(row.id),
            ownerUid: row.owner_uid ?? base.ownerUid,
            ownerEmail: row.owner_email ?? base.ownerEmail,
            status: row.status ?? base.status ?? "ACTIVE",
            isOrderingPaused: row.is_ordering_paused ?? base.isOrderingPaused ?? false,
            branding,
            socialLinks,
            createdAt: row.created_at ?? base.createdAt,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 3. businessAccess
  if (segs.length === 1 && segs[0] === "businessAccess") {
    return {
      table: "business_access",
      pkColumns: ["business_id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "businessId" || f === "id") return "business_id";
        if (f === "operationalStatus") return "operational_status";
        if (f === "packageId") return "package_id";
        if (f === "isLifetime") return "is_lifetime";
        if (f === "startsAtMs") return "starts_at_ms";
        if (f === "expiresAtMs") return "expires_at_ms";
        return null;
      },
      toRow: (rawDocId, payload, existing = {}) => {
        const docId = normalizeBizId(rawDocId);
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), businessId: docId };
        return {
          business_id: docId,
          operational_status: String(merged.operationalStatus || "ACTIVE"),
          package_id: String(merged.packageId || "2_days_trial"),
          is_lifetime: Boolean(merged.isLifetime),
          starts_at_ms: typeof merged.startsAtMs === "number" ? merged.startsAtMs : null,
          expires_at_ms: typeof merged.expiresAtMs === "number" ? merged.expiresAtMs : null,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return {
          id: String(row.business_id),
          data: {
            ...base,
            businessId: String(row.business_id),
            operationalStatus: row.operational_status ?? base.operationalStatus ?? "ACTIVE",
            packageId: row.package_id ?? base.packageId ?? "2_days_trial",
            isLifetime: row.is_lifetime ?? base.isLifetime ?? false,
            startsAtMs: row.starts_at_ms ?? base.startsAtMs ?? null,
            expiresAtMs: row.expires_at_ms ?? base.expiresAtMs ?? null,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 4. businessPrivate
  if (segs.length === 1 && segs[0] === "businessPrivate") {
    return {
      table: "business_private",
      pkColumns: ["business_id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => (f === "businessId" || f === "id" ? "business_id" : null),
      toRow: (rawDocId, payload, existing = {}) => {
        const docId = normalizeBizId(rawDocId);
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), businessId: docId };
        return {
          business_id: docId,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return {
          id: String(row.business_id),
          data: { ...base, businessId: String(row.business_id), updatedAt: row.updated_at ?? base.updatedAt },
        };
      },
    };
  }

  // 5. businessSlugs
  if (segs.length === 1 && segs[0] === "businessSlugs") {
    return {
      table: "business_slugs",
      pkColumns: ["slug"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "slug" || f === "id") return "slug";
        if (f === "businessId") return "business_id";
        if (f === "isAlias") return "is_alias";
        if (f === "canonicalSlug") return "canonical_slug";
        return null;
      },
      toRow: (rawDocId, payload, existing = {}) => {
        const slug = rawDocId.trim().toLowerCase();
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), slug };
        return {
          slug,
          business_id: normalizeBizId(String(merged.businessId || slug)),
          is_alias: Boolean(merged.isAlias),
          canonical_slug: String(merged.canonicalSlug || slug).toLowerCase(),
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return {
          id: String(row.slug),
          data: {
            ...base,
            slug: String(row.slug),
            businessId: row.business_id ?? base.businessId,
            isAlias: row.is_alias ?? base.isAlias ?? false,
            canonicalSlug: row.canonical_slug ?? base.canonicalSlug ?? String(row.slug),
          },
        };
      },
    };
  }

  // 6. userProfiles
  if (segs.length === 1 && segs[0] === "userProfiles") {
    return {
      table: "user_profiles",
      pkColumns: ["uid"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "uid" || f === "id") return "uid";
        if (f === "email") return "email";
        if (f === "username") return "username";
        if (f === "displayName") return "display_name";
        if (f === "role") return "role";
        if (f === "businessId") return "business_id";
        if (f === "mustChangePassword") return "must_change_password";
        if (f === "active") return "active";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), uid: docId };
        if (merged.email) merged.email = String(merged.email).trim().toLowerCase();
        return {
          uid: docId,
          email: merged.email || null,
          username: merged.username ? String(merged.username).trim().toLowerCase() : null,
          display_name: merged.displayName ?? merged.fullName ?? null,
          role: String(merged.role || "BUSINESS_OWNER"),
          business_id: merged.businessId ? normalizeBizId(String(merged.businessId)) : null,
          must_change_password: Boolean(merged.mustChangePassword),
          active: merged.active !== false,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
        return {
          id: String(row.uid),
          data: {
            ...base,
            uid: String(row.uid),
            email: row.email ?? base.email ?? "",
            username: row.username ?? base.username ?? "",
            displayName: row.display_name ?? base.displayName ?? "",
            role: row.role ?? base.role ?? "BUSINESS_OWNER",
            businessId: row.business_id ?? base.businessId ?? null,
            mustChangePassword: row.must_change_password ?? base.mustChangePassword ?? false,
            active: row.active ?? base.active ?? true,
            createdAtMs: base.createdAtMs ?? createdMs,
            createdAt: row.created_at ?? base.createdAt,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 7. categories (root `categories` -> business_id = 'teatime') OR `businesses/{bId}/categories`
  if (
    (segs.length === 1 && segs[0] === "categories") ||
    (segs.length === 3 && segs[0] === "businesses" && segs[2] === "categories")
  ) {
    const bId = segs.length === 3 ? normalizeBizId(segs[1]) : "teatime";
    return {
      table: "categories",
      pkColumns: ["business_id", "id"],
      fixedFilters: { business_id: bId },
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        if (f === "name") return "name";
        if (f === "sortOrder" || f === "displayOrder") return "sort_order";
        if (f === "isArchived") return "is_archived";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId, businessId: bId };
        const sortOrder = Number(merged.sortOrder ?? merged.displayOrder ?? 0) || 0;
        merged.sortOrder = sortOrder;
        merged.displayOrder = merged.displayOrder ?? sortOrder;
        return {
          business_id: bId,
          id: docId,
          name: String(merged.name || "Category"),
          sort_order: sortOrder,
          icon: merged.icon ?? null,
          icon_url: merged.iconUrl ?? null,
          is_archived: Boolean(merged.isArchived || merged.archived || merged.isDeleted),
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const sortOrder = row.sort_order ?? base.sortOrder ?? base.displayOrder ?? 0;
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            businessId: String(row.business_id),
            name: row.name ?? base.name ?? "Category",
            sortOrder,
            displayOrder: base.displayOrder ?? sortOrder,
            icon: row.icon ?? base.icon,
            iconUrl: row.icon_url ?? base.iconUrl,
            isArchived: row.is_archived ?? base.isArchived ?? false,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 8. products (root `menu` -> business_id = 'teatime') OR `businesses/{bId}/products`
  if (
    (segs.length === 1 && segs[0] === "menu") ||
    (segs.length === 3 && segs[0] === "businesses" && segs[2] === "products")
  ) {
    const bId = segs.length === 3 ? normalizeBizId(segs[1]) : "teatime";
    return {
      table: "products",
      pkColumns: ["business_id", "id"],
      fixedFilters: { business_id: bId },
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        if (f === "categoryId") return "category_id";
        if (f === "category") return "category";
        if (f === "name") return "name";
        if (f === "priceRupees" || f === "price") return "price_rupees";
        if (f === "priceMinor") return "price_minor";
        if (f === "isAvailable" || f === "available") return "is_available";
        if (f === "isArchived" || f === "archived") return "is_archived";
        if (f === "sortOrder" || f === "displayOrder") return "sort_order";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId, businessId: bId };
        const priceRupees =
          typeof merged.priceRupees === "number"
            ? merged.priceRupees
            : typeof merged.price === "number"
            ? merged.price
            : typeof merged.priceMinor === "number"
            ? Math.round(merged.priceMinor / 100)
            : 0;
        const priceMinor =
          typeof merged.priceMinor === "number"
            ? merged.priceMinor
            : Math.round(Number(priceRupees) * 100);
        const sortOrder = Number(merged.sortOrder ?? merged.displayOrder ?? 0) || 0;
        const isAvail = merged.isAvailable !== false && merged.available !== false;
        const isArchived = Boolean(merged.isArchived || merged.archived);

        merged.priceRupees = priceRupees;
        merged.price = merged.price ?? priceRupees;
        merged.priceMinor = priceMinor;
        merged.sortOrder = sortOrder;
        merged.displayOrder = merged.displayOrder ?? sortOrder;
        merged.isAvailable = isAvail;
        merged.available = isAvail;

        return {
          business_id: bId,
          id: docId,
          category_id: merged.categoryId ?? null,
          category: merged.category ?? null,
          name: String(merged.name || "Product"),
          price_rupees: priceRupees,
          price_minor: priceMinor,
          description: merged.description ?? "",
          image_url: merged.imageUrl ?? merged.image ?? null,
          is_available: isAvail,
          is_archived: isArchived,
          sort_order: sortOrder,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const pRupees = Number(row.price_rupees ?? base.priceRupees ?? base.price ?? 0);
        const pMinor = Number(row.price_minor ?? base.priceMinor ?? Math.round(pRupees * 100));
        const sortOrder = row.sort_order ?? base.sortOrder ?? base.displayOrder ?? 0;
        const isAvail = row.is_available ?? base.isAvailable ?? base.available ?? true;
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            businessId: String(row.business_id),
            categoryId: row.category_id ?? base.categoryId,
            category: row.category ?? base.category ?? "General",
            name: row.name ?? base.name ?? "Product",
            priceRupees: pRupees,
            price: base.price ?? pRupees,
            priceMinor: pMinor,
            description: row.description ?? base.description ?? "",
            imageUrl: row.image_url ?? base.imageUrl ?? base.image ?? null,
            image: base.image ?? row.image_url ?? base.imageUrl ?? null,
            isAvailable: isAvail,
            available: isAvail,
            isArchived: row.is_archived ?? base.isArchived ?? false,
            sortOrder,
            displayOrder: base.displayOrder ?? sortOrder,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 9. restaurant_tables (root `tables` -> business_id = 'teatime') OR `businesses/{bId}/tables`
  if (
    (segs.length === 1 && segs[0] === "tables") ||
    (segs.length === 3 && segs[0] === "businesses" && segs[2] === "tables")
  ) {
    const bId = segs.length === 3 ? normalizeBizId(segs[1]) : "teatime";
    return {
      table: "restaurant_tables",
      pkColumns: ["business_id", "id"],
      fixedFilters: { business_id: bId },
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        if (f === "tableNumber" || f === "number") return "table_number";
        if (f === "token") return "token";
        if (f === "active") return "active";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId, businessId: bId };
        const tNum = String(merged.tableNumber || merged.number || "Table 01");
        merged.tableNumber = tNum;
        merged.number = tNum;
        return {
          business_id: bId,
          id: docId,
          table_number: tNum,
          token: String(merged.token || ""),
          active: merged.active !== false,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const tNum = row.table_number ?? base.tableNumber ?? base.number ?? "Table";
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            businessId: String(row.business_id),
            tableNumber: tNum,
            number: tNum,
            token: row.token ?? base.token ?? "",
            active: row.active ?? base.active ?? true,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 10. orders (root `orders` -> business_id = 'teatime' for collection queries, global `id` PK) OR `businesses/{bId}/orders`
  if (
    (segs.length === 1 && segs[0] === "orders") ||
    (segs.length === 3 && segs[0] === "businesses" && segs[2] === "orders")
  ) {
    const bId = segs.length === 3 ? normalizeBizId(segs[1]) : "teatime";
    return {
      table: "orders",
      pkColumns: ["id"],
      fixedFilters: { business_id: bId },
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        if (f === "orderNumber") return "order_number";
        if (f === "tableNumber") return "table_number";
        if (f === "tableToken") return "table_token";
        if (f === "trackingToken") return "tracking_token";
        if (f === "status") return "status";
        if (f === "totalMinor") return "total_minor";
        if (f === "createdAt" || f === "createdAtMs") return "created_at";
        if (f === "updatedAt" || f === "updatedAtMs") return "updated_at";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        const effectiveBizId = normalizeBizId(String(merged.businessId || bId));
        merged.businessId = effectiveBizId;
        const items = Array.isArray(merged.items) ? merged.items : [];
        return {
          id: docId,
          business_id: effectiveBizId,
          order_number: merged.orderNumber !== undefined ? String(merged.orderNumber) : null,
          table_number: merged.tableNumber ?? null,
          table_token: merged.tableToken ?? null,
          tracking_token: merged.trackingToken ?? null,
          status: String(merged.status || (effectiveBizId === "teatime" ? "new" : "PENDING")),
          total_minor: Number(merged.totalMinor || 0),
          items,
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        const items = Array.isArray(row.items) && row.items.length > 0 ? row.items : base.items || [];
        const rawOrderNum = base.orderNumber ?? row.order_number;
        const parsedOrderNum =
          typeof rawOrderNum === "number"
            ? rawOrderNum
            : rawOrderNum && /^\d+$/.test(String(rawOrderNum))
            ? Number(rawOrderNum)
            : rawOrderNum;
        return {
          id: String(row.id),
          data: {
            ...base,
            id: String(row.id),
            businessId: row.business_id ?? base.businessId ?? "teatime",
            orderNumber: parsedOrderNum,
            tableNumber: row.table_number ?? base.tableNumber ?? "Table",
            tableToken: row.table_token ?? base.tableToken ?? "",
            trackingToken: row.tracking_token ?? base.trackingToken ?? "",
            status: row.status ?? base.status ?? "PENDING",
            totalMinor: Number(row.total_minor ?? base.totalMinor ?? 0),
            items,
            createdAt: row.created_at ?? base.createdAt,
            updatedAt: row.updated_at ?? base.updatedAt,
          },
        };
      },
    };
  }

  // 11. packages
  if (segs.length === 1 && segs[0] === "packages") {
    return {
      table: "packages",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "sortOrder") return "sort_order";
        if (f === "active") return "active";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        return {
          id: docId,
          name: String(merged.name || docId),
          price_minor: Number(merged.priceMinor || 0),
          active: merged.active !== false,
          sort_order: Number(merged.sortOrder || 0),
          data: merged,
          updated_at: nowIso,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return {
          id: String(row.id),
          data: { ...base, id: String(row.id), name: row.name ?? base.name },
        };
      },
    };
  }

  // 12. subscriptions
  if (segs.length === 1 && segs[0] === "subscriptions") {
    return {
      table: "subscriptions",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        if (f === "packageId") return "package_id";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        return {
          id: docId,
          business_id: String(merged.businessId || "teatime"),
          package_id: String(merged.packageId || "monthly"),
          starts_at_ms: typeof merged.startsAtMs === "number" ? merged.startsAtMs : null,
          expires_at_ms: typeof merged.expiresAtMs === "number" ? merged.expiresAtMs : null,
          data: merged,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return { id: String(row.id), data: { ...base, id: String(row.id), businessId: row.business_id } };
      },
    };
  }

  // 13. payments
  if (segs.length === 1 && segs[0] === "payments") {
    return {
      table: "payments",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        return {
          id: docId,
          business_id: String(merged.businessId || "teatime"),
          amount_minor: Number(merged.amountMinor ?? (merged.amountRupees ? merged.amountRupees * 100 : 0)),
          method: merged.method ?? merged.paymentMethod ?? null,
          reference: merged.reference ?? null,
          data: merged,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return { id: String(row.id), data: { ...base, id: String(row.id), businessId: row.business_id } };
      },
    };
  }

  // 14. auditLogs
  if (segs.length === 1 && segs[0] === "auditLogs") {
    return {
      table: "audit_logs",
      pkColumns: ["id"],
      fixedFilters: {},
      mapFieldToColumn: (f) => {
        if (f === "id") return "id";
        if (f === "businessId") return "business_id";
        return null;
      },
      toRow: (docId, payload, existing = {}) => {
        const nowIso = new Date().toISOString();
        const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
        return {
          id: docId,
          business_id: merged.businessId ?? null,
          actor_uid: merged.actorUid ?? null,
          action: merged.action ?? null,
          data: merged,
        };
      },
      fromRow: (row) => {
        const base = (row.data && typeof row.data === "object") ? row.data : {};
        return { id: String(row.id), data: { ...base, id: String(row.id) } };
      },
    };
  }

  // 15. Generic fallback (`app_documents`) for `usernames/*`, `platform/*`,
  // `businesses/{bId}/tableTokens/*`, `businesses/{bId}/orderTracking/*`, `counters/*`, etc.
  const normalizedCollection = segs.join("/");
  return {
    table: "app_documents",
    pkColumns: ["doc_path"],
    fixedFilters: { collection_path: normalizedCollection },
    mapFieldToColumn: (f) => (f === "id" ? "doc_id" : null),
    toRow: (docId, payload, existing = {}) => {
      const nowIso = new Date().toISOString();
      const merged = { ...existing, ...sanitizePayload(payload, nowIso), id: docId };
      return {
        doc_path: `${normalizedCollection}/${docId}`,
        collection_path: normalizedCollection,
        doc_id: docId,
        data: merged,
        updated_at: nowIso,
      };
    },
    fromRow: (row) => {
      const base = (row.data && typeof row.data === "object") ? row.data : {};
      return {
        id: String(row.doc_id),
        data: { ...base, id: String(row.doc_id), updatedAt: row.updated_at ?? base.updatedAt },
      };
    },
  };
}

export function resolveDocSpec(docPath: string): MappedDocSpec {
  const segs = splitPathSegments(docPath);
  if (segs.length < 2 || segs.length % 2 !== 0) {
    throw new Error(`Invalid document path: "${docPath}" (expected even number of segments).`);
  }
  const docId = segs[segs.length - 1];
  const collectionPath = segs.slice(0, -1).join("/");
  const colSpec = resolveCollectionSpec(collectionPath);

  const pkFilter: Record<string, string> = {};
  if (colSpec.table === "app_documents") {
    pkFilter.doc_path = `${collectionPath}/${docId}`;
  } else if (colSpec.table === "business_access" || colSpec.table === "business_private") {
    pkFilter.business_id = normalizeBizId(docId);
  } else if (colSpec.table === "business_slugs") {
    pkFilter.slug = docId.trim().toLowerCase();
  } else if (colSpec.table === "user_profiles") {
    pkFilter.uid = docId;
  } else if (colSpec.table === "businesses") {
    pkFilter.id = normalizeBizId(docId);
  } else if (colSpec.table === "orders") {
    // Orders have a globally unique `id` PK so both `orders/{id}` and `businesses/{bId}/orders/{id}` resolve it directly
    pkFilter.id = docId;
  } else {
    for (const [k, v] of Object.entries(colSpec.fixedFilters)) {
      pkFilter[k] = v;
    }
    pkFilter.id = docId;
  }

  return {
    ...colSpec,
    docId,
    pkFilter,
  };
}

