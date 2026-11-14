import { getSupabase } from "./supabase";
import {
  SERVER_TIMESTAMP_SENTINEL,
  resolveCollectionSpec,
  resolveDocSpec,
  splitPathSegments,
} from "../shared/supabasePathMap";

export interface DatabaseHandle {
  readonly kind: "supabase-postgres";
}

export const db: DatabaseHandle = { kind: "supabase-postgres" };

export interface DocRef {
  readonly kind: "doc";
  readonly path: string;
  readonly id: string;
}

export interface CollectionRef {
  readonly kind: "collection";
  readonly path: string;
}

export type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains";

export interface WhereConstraint {
  readonly type: "where";
  readonly field: string;
  readonly op: WhereOp;
  readonly value: any;
}

export interface OrderByConstraint {
  readonly type: "orderBy";
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export type QueryConstraint = WhereConstraint | OrderByConstraint;

export interface QueryRef {
  readonly kind: "query";
  readonly collectionPath: string;
  readonly wheres: WhereConstraint[];
  readonly orderBys: OrderByConstraint[];
}

export interface DocSnapshot<T = Record<string, any>> {
  readonly id: string;
  exists: () => boolean;
  data: () => T;
}

export interface QuerySnapshot<T = Record<string, any>> {
  readonly docs: DocSnapshot<T>[];
  readonly empty: boolean;
  readonly size: number;
  forEach: (callback: (doc: DocSnapshot<T>) => void) => void;
}

// Local same-tab mutation bus so UI listeners update with zero latency alongside Supabase Realtime WebSockets
type TableChangeListener = () => void;
const localTableListeners = new Map<string, Set<TableChangeListener>>();

function subscribeLocalTable(table: string, cb: TableChangeListener): () => void {
  let set = localTableListeners.get(table);
  if (!set) {
    set = new Set();
    localTableListeners.set(table, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
  };
}

function notifyLocalTable(table: string) {
  const set = localTableListeners.get(table);
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb();
    } catch {
      // ignore
    }
  }
}

export function serverTimestamp() {
  return { __sentinel: SERVER_TIMESTAMP_SENTINEL };
}

export function doc(
  base: DatabaseHandle | CollectionRef,
  ...pathSegments: string[]
): DocRef {
  const prefix = base.kind === "collection" ? [base.path] : [];
  const allSegs = splitPathSegments([...prefix, ...pathSegments].join("/"));
  if (allSegs.length === 1 && base.kind === "collection") {
    const autoId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    allSegs.push(autoId);
  }
  if (allSegs.length < 2 || allSegs.length % 2 !== 0) {
    throw new Error(`Invalid doc() path: "${allSegs.join("/")}"`);
  }
  return {
    kind: "doc",
    path: allSegs.join("/"),
    id: allSegs[allSegs.length - 1],
  };
}

export function collection(
  base: DatabaseHandle | DocRef,
  ...pathSegments: string[]
): CollectionRef {
  const prefix = base.kind === "doc" ? [base.path] : [];
  const allSegs = splitPathSegments([...prefix, ...pathSegments].join("/"));
  if (allSegs.length < 1 || allSegs.length % 2 !== 1) {
    throw new Error(`Invalid collection() path: "${allSegs.join("/")}"`);
  }
  return {
    kind: "collection",
    path: allSegs.join("/"),
  };
}

export function where(field: string, op: WhereOp, value: any): WhereConstraint {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): OrderByConstraint {
  return { type: "orderBy", field, direction };
}

export function query(
  target: CollectionRef | QueryRef,
  ...constraints: QueryConstraint[]
): QueryRef {
  const collectionPath = target.kind === "collection" ? target.path : target.collectionPath;
  const wheres = target.kind === "query" ? [...target.wheres] : [];
  const orderBys = target.kind === "query" ? [...target.orderBys] : [];

  for (const c of constraints) {
    if (c.type === "where") wheres.push(c);
    else if (c.type === "orderBy") orderBys.push(c);
  }

  return {
    kind: "query",
    collectionPath,
    wheres,
    orderBys,
  };
}

function makeDocSnapshot<T = Record<string, any>>(
  id: string,
  payload: T | null
): DocSnapshot<T> {
  return {
    id,
    exists: () => payload !== null && payload !== undefined,
    data: () => (payload ?? ({} as T)),
  };
}

function makeQuerySnapshot<T = Record<string, any>>(
  docs: DocSnapshot<T>[]
): QuerySnapshot<T> {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
  };
}

function matchesWhere(docData: Record<string, any>, w: WhereConstraint): boolean {
  const actual = docData[w.field];
  switch (w.op) {
    case "==":
      return actual === w.value;
    case "!=":
      return actual !== w.value;
    case "<":
      return actual < w.value;
    case "<=":
      return actual <= w.value;
    case ">":
      return actual > w.value;
    case ">=":
      return actual >= w.value;
    case "in":
      return Array.isArray(w.value) && w.value.includes(actual);
    case "array-contains":
      return Array.isArray(actual) && actual.includes(w.value);
    default:
      return true;
  }
}

function compareValues(a: any, b: any, dir: "asc" | "desc"): number {
  const mult = dir === "desc" ? -1 : 1;
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * mult;
  }
  const strA = String(a);
  const strB = String(b);
  return strA.localeCompare(strB, undefined, { numeric: true }) * mult;
}

export async function getDoc<T = Record<string, any>>(
  docRef: DocRef
): Promise<DocSnapshot<T>> {
  const supabase = getSupabase();
  const spec = resolveDocSpec(docRef.path);

  let q = supabase.from(spec.table).select("*");
  for (const [col, val] of Object.entries(spec.pkFilter)) {
    q = q.eq(col, val);
  }

  const { data, error } = await q.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return makeDocSnapshot<T>(spec.docId, null);
  }
  const parsed = spec.fromRow(data);
  return makeDocSnapshot<T>(parsed.id, parsed.data as T);
}

export async function getDocs<T = Record<string, any>>(
  target: CollectionRef | QueryRef
): Promise<QuerySnapshot<T>> {
  const supabase = getSupabase();
  const collectionPath = target.kind === "collection" ? target.path : target.collectionPath;
  const wheres = target.kind === "query" ? target.wheres : [];
  const orderBys = target.kind === "query" ? target.orderBys : [];

  const spec = resolveCollectionSpec(collectionPath);
  let q = supabase.from(spec.table).select("*");

  for (const [col, val] of Object.entries(spec.fixedFilters)) {
    q = q.eq(col, val);
  }

  const memoryWheres: WhereConstraint[] = [];
  for (const w of wheres) {
    const col = spec.mapFieldToColumn(w.field);
    if (col && w.op === "==") {
      q = q.eq(col, w.value);
    } else if (col && w.op === "in" && Array.isArray(w.value)) {
      q = q.in(col, w.value);
    } else {
      memoryWheres.push(w);
    }
  }

  for (const ob of orderBys) {
    const col = spec.mapFieldToColumn(ob.field);
    if (col) {
      q = q.order(col, { ascending: ob.direction !== "desc" });
    }
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }

  let items = (data || []).map((row) => spec.fromRow(row));

  if (memoryWheres.length > 0) {
    items = items.filter((it) => memoryWheres.every((w) => matchesWhere(it.data, w)));
  }

  if (orderBys.length > 0) {
    items.sort((x, y) => {
      for (const ob of orderBys) {
        const cmp = compareValues(x.data[ob.field], y.data[ob.field], ob.direction);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }

  const snaps = items.map((it) => makeDocSnapshot<T>(it.id, it.data as T));
  return makeQuerySnapshot<T>(snaps);
}

export async function setDoc(
  docRef: DocRef,
  data: Record<string, any>,
  options?: { merge?: boolean }
): Promise<void> {
  const supabase = getSupabase();
  const spec = resolveDocSpec(docRef.path);

  let existingData: Record<string, any> = {};
  if (options?.merge) {
    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    } catch {
      // Proceed cleanly if row does not exist yet
    }
  }

  const row = spec.toRow(spec.docId, data, existingData);
  const { error } = await supabase
    .from(spec.table)
    .upsert(row, { onConflict: spec.pkColumns.join(",") });

  if (error) {
    throw new Error(error.message);
  }
  notifyLocalTable(spec.table);
}

export async function addDoc(
  colRef: CollectionRef,
  data: Record<string, any>
): Promise<DocRef> {
  const generatedId =
    typeof data.id === "string" && data.id.trim()
      ? data.id.trim()
      : `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const targetDoc = doc(colRef, generatedId);
  await setDoc(targetDoc, { ...data, id: generatedId });
  return targetDoc;
}

export async function updateDoc(
  docRef: DocRef,
  data: Record<string, any>
): Promise<void> {
  await setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef: DocRef): Promise<void> {
  const supabase = getSupabase();
  const spec = resolveDocSpec(docRef.path);

  let q = supabase.from(spec.table).delete();
  for (const [col, val] of Object.entries(spec.pkFilter)) {
    q = q.eq(col, val);
  }

  const { error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  notifyLocalTable(spec.table);
}

export interface WriteBatch {
  set: (docRef: DocRef, data: Record<string, any>, options?: { merge?: boolean }) => WriteBatch;
  update: (docRef: DocRef, data: Record<string, any>) => WriteBatch;
  delete: (docRef: DocRef) => WriteBatch;
  commit: () => Promise<void>;
}

interface BatchOp {
  kind: "set" | "delete";
  docRef: DocRef;
  data?: Record<string, any>;
  merge?: boolean;
}

export function writeBatch(_db: DatabaseHandle): WriteBatch {
  const ops: BatchOp[] = [];

  const batch: WriteBatch = {
    set(docRef, data, options) {
      ops.push({ kind: "set", docRef, data, merge: Boolean(options?.merge) });
      return batch;
    },
    update(docRef, data) {
      ops.push({ kind: "set", docRef, data, merge: true });
      return batch;
    },
    delete(docRef) {
      ops.push({ kind: "delete", docRef });
      return batch;
    },
    async commit() {
      const supabase = getSupabase();
      const touchedTables = new Set<string>();

      // 1. Execute deletes first
      const deletes = ops.filter((o) => o.kind === "delete");
      for (const del of deletes) {
        await deleteDoc(del.docRef);
      }

      // 2. Group sets by collection path for fast bulk upsert
      const setsByCol = new Map<string, BatchOp[]>();
      for (const op of ops) {
        if (op.kind !== "set") continue;
        const segs = splitPathSegments(op.docRef.path);
        const colPath = segs.slice(0, -1).join("/");
        const list = setsByCol.get(colPath) || [];
        list.push(op);
        setsByCol.set(colPath, list);
      }

      for (const [colPath, groupOps] of setsByCol.entries()) {
        const colSpec = resolveCollectionSpec(colPath);
        touchedTables.add(colSpec.table);

        // Preload existing rows in one query if any op uses merge: true
        const existingMap = new Map<string, Record<string, any>>();
        if (groupOps.some((o) => o.merge)) {
          try {
            const existingSnap = await getDocs(collection(db, colPath));
            existingSnap.forEach((d) => {
              existingMap.set(d.id, d.data());
            });
          } catch {
            // ignore if empty
          }
        }

        // Deduplicate by docId (last write in batch wins)
        const dedupedRows = new Map<string, Record<string, any>>();
        for (const op of groupOps) {
          const prev = op.merge ? existingMap.get(op.docRef.id) || {} : {};
          const row = colSpec.toRow(op.docRef.id, op.data || {}, prev);
          existingMap.set(op.docRef.id, row.data || {});
          dedupedRows.set(op.docRef.id, row);
        }

        const rows = Array.from(dedupedRows.values());
        if (rows.length > 0) {
          const { error } = await supabase
            .from(colSpec.table)
            .upsert(rows, { onConflict: colSpec.pkColumns.join(",") });
          if (error) {
            throw new Error(error.message);
          }
        }
      }

      for (const tbl of touchedTables) {
        notifyLocalTable(tbl);
      }
    },
  };

  return batch;
}

let channelSeq = 0;

function buildRealtimeFilter(filters: Record<string, string>): string | undefined {
  const entries = Object.entries(filters);
  if (entries.length !== 1) return undefined;
  const [col, val] = entries[0];
  // Safe PostgREST realtime single-column equality filter
  if (/^[a-zA-Z0-9_-]+$/.test(val)) {
    return `${col}=eq.${val}`;
  }
  return undefined;
}

export function onSnapshot(
  target: DocRef,
  onNext: (snapshot: DocSnapshot<any>) => void,
  onError?: (error: any) => void
): () => void;
export function onSnapshot(
  target: CollectionRef | QueryRef,
  onNext: (snapshot: QuerySnapshot<any>) => void,
  onError?: (error: any) => void
): () => void;
export function onSnapshot(
  target: DocRef | CollectionRef | QueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let active = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const supabase = getSupabase();

  const isDoc = target.kind === "doc";
  const spec = isDoc
    ? resolveDocSpec(target.path)
    : resolveCollectionSpec(target.kind === "collection" ? target.path : target.collectionPath);

  const runFetch = async () => {
    if (!active) return;
    try {
      if (target.kind === "doc") {
        const snap = await getDoc(target);
        if (active) onNext(snap);
      } else {
        const snap = await getDocs(target);
        if (active) onNext(snap);
      }
    } catch (err) {
      if (active && onError) {
        onError(err);
      }
    }
  };

  const scheduleRefresh = () => {
    if (!active) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runFetch();
    }, 35);
  };

  // 1. Initial load
  runFetch();

  // 2. Local same-tab write listener
  const unsubLocal = subscribeLocalTable(spec.table, scheduleRefresh);

  // 3. Supabase Realtime PostgreSQL CDC WebSocket subscription
  const filterMap = target.kind === "doc" ? resolveDocSpec(target.path).pkFilter : spec.fixedFilters;
  const filterStr = buildRealtimeFilter(filterMap);
  const channelName = `menyo_rt_${spec.table}_${++channelSeq}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: spec.table,
        ...(filterStr ? { filter: filterStr } : {}),
      },
      () => {
        scheduleRefresh();
      }
    )
    .subscribe();

  return () => {
    active = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubLocal();
    supabase.removeChannel(channel).catch(() => {});
  };
}

