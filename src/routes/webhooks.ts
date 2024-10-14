import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { createProductWebhook } from '../services/productMutations'

const router = Router();

router.post('/webhook/products/create', (req: Request, res: Response) => {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  const topic = req.headers['x-shopify-topic'];
  const shop = req.headers['x-shopify-shop-domain'];
  const secret = process.env.SHOPIFY_API_SECRET || '';
  const body = JSON.stringify(req.body);

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  if (generatedHmac !== hmac) {
    return res.status(403).send('Webhook verification failed');
  }

  if (topic === 'products/create') {
    console.log(`New product created in shop: ${shop}`);
  } else if (topic === 'products/update') {
    console.log(`Product updated in shop: ${shop}`);
  }
  
  res.status(200).send('Webhook received');
});

export default router;
