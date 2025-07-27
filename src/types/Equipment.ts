export interface Equipment {
  id: number;
  asset_tag: string;
  name: string;
  serial: string;
  status_label: {
    id: number;
    name: string;
    status_type: string;
    status_meta: string;
  };
  model: {
    id: number;
    name: string;
  };
  location: {
    id: number;
    name: string;
  } | null;
  checkout_date: string | null;
  eol_date: string | null;
  last_checkout: {
    datetime: string;
  } | null;
  purchase_date?: {
    date: string;
    formatted: string;
  } | null;
  created_at?: {
    datetime: string;
    formatted: string;
  } | null;
  asset_eol_date?: {
    date: string;
    formatted: string;
  } | null;
  assigned_to?: {
    id: number;
    name: string;
  } | null;
  last_checkin?: {
    datetime: string;
    formatted: string;
  } | null;
}

export interface SnipeItResponse {
  total: number;
  rows: Equipment[];
}

export interface StatusUpdate {
  status_id: number;
  location_id: number;
  notes?: string;
}