export class WooCommerceAPI {
  constructor(baseUrl, consumerKey, consumerSecret) {
    this.baseUrl = baseUrl;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('consumer_key', this.consumerKey);
    url.searchParams.set('consumer_secret', this.consumerSecret);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WC API ${res.status}: ${text.substring(0, 200)}`);
    }

    const totalPages = res.headers.get('X-WP-TotalPages');
    const total = res.headers.get('X-WP-Total');
    const data = await res.json();
    return { data, totalPages: parseInt(totalPages) || 1, total: parseInt(total) || 0 };
  }

  async getAllOrders(params = {}) {
    let page = 1;
    let allOrders = [];
    let hasMore = true;

    while (hasMore) {
      const { data, totalPages } = await this.request('/orders', { ...params, page, per_page: 50 });
      allOrders = allOrders.concat(data);
      hasMore = page < totalPages;
      page++;
    }

    return allOrders;
  }

  async getOrder(orderId) {
    const { data } = await this.request(`/orders/${orderId}`);
    return data;
  }

  async getAllProducts(params = {}) {
    let page = 1;
    let allProducts = [];
    let hasMore = true;

    while (hasMore) {
      const { data, totalPages } = await this.request('/products', { ...params, page, per_page: 50 });
      allProducts = allProducts.concat(data);
      hasMore = page < totalPages;
      page++;
    }

    return allProducts;
  }

  async getOrderStatuses() {
    const { data } = await this.request('/orders/statuses');
    return data;
  }
}
