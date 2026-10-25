export type EnvatoPurchaseCode = {
  id: number;
  code: string;
  item_name?: string | null;
  item_id?: number | string | null;
  supported_until?: string | null;
  created_at?: string | null;
};
