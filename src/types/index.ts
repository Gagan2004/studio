
export interface UserData {
  id?: string; // Optional: if we manage multiple profiles later
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  [key: string]: string | undefined; // Allow additional custom fields
}

export interface Vault {
  id: string;
  name: string;
  data: UserData;
  isDefault?: boolean;
  createdAt: number; // Added for sorting or reference
  updatedAt: number; // Added for sorting or reference
}

export interface FormFieldDetail {
  id: string; // Unique ID for the input element in the DOM
  name?: string;
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string; // Current value of the field
}
