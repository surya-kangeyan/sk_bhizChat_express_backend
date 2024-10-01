interface AssociatedUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  account_owner: boolean;
  locale: string;
  collaborator: boolean;
  email_verified: boolean;
}

// Define the online access info interface
interface OnlineAccessInfo {
  expires_in: number;
  associated_user_scope: string;
  session: string | null;
  account_number: number | null;
  associated_user: AssociatedUser;
}

// Main ShopifySession class
export class ShopifySession {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope: string;
  expires: Date;
  accessToken: string;
  onlineAccessInfo: OnlineAccessInfo;

  constructor(data: {
    id: string;
    shop: string;
    state: string;
    isOnline: boolean;
    scope: string;
    expires: Date;
    accessToken: string;
    onlineAccessInfo: OnlineAccessInfo;
  }) {
    this.id = data.id;
    this.shop = data.shop;
    this.state = data.state;
    this.isOnline = data.isOnline;
    this.scope = data.scope;
    this.expires = new Date(data.expires);
    this.accessToken = data.accessToken;
    this.onlineAccessInfo = data.onlineAccessInfo;
  }
}
