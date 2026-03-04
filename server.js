import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

import * as lark from '@larksuiteoapi/node-sdk';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

const products = [
    { id: '1', name: 'Polo Shirt', price: 25.00, currency: 'GBP' },
    { id: '2', name: 'Headphones', price: 75.00, currency: 'GBP' },
    { id: '3', name: 'Sunglasses', price: 45.00, currency: 'GBP' },
    { id: '4', name: 'Boots', price: 120.00, currency: 'GBP' },
    { id: '5', name: 'Backpack', price: 60.00, currency: 'GBP' },
    { id: '6', name: 'Joypad', price: 35.00, currency: 'GBP' }
];

const client = new lark.Client({
    appId: 'cli_a922b2ff79f91cc6',
    appSecret: '4318IERsm3KEtYmp1FVBRcR32Llz1Bwv',
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
});



const webhookParser = express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
});

app.post('/payment-webhook', webhookParser, async (req, res) => {
    console.log('webhook called');
    try {
        const authHeader = req.headers['authorization'];
        const signature = req.headers['cko-signature']

        if (authHeader !== process.env.WEBHOOK_KEY) {
            return console.error('Unauthorized Webhook Attempt!');
        }
        if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
            console.error('Data received is not a Buffer!');
            return res.status(500).send('Configuration Error');
        }

        // 3. Hash the RAW payload using SHA-256 and your key
        const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
        hmac.update(req.rawBody);
        const expectedSignature = hmac.digest('hex');
        console.log('signature', signature)
        console.log('expected signature', expectedSignature)

        // 4. Compare the resulting HMAC with the header
        if (signature === expectedSignature) {
            console.log('Webhook Verified: Payload is authentic.');
            res.status(200).json("Webhook Received");
            // Process your business logic here
            const event = req.body;
            console.log('Event Type:', event.type);
            const larkRes = await client.im.message.create({
                params: {
                    receive_id_type: 'open_id',
                },
                data: {
                    receive_id: 'ou_2c095cdb2f9d4d3b87be64abcb36a569',
                    content: JSON.stringify({ text: event }),
                    msg_type: 'text',
                },
            });
        } else {
            console.error('Webhook Verification Failed: HMAC mismatch.');
            // This could indicate the payload was tampered with
        }


    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})

app.use(express.json());


app.post('/create-payment-session', async (req, res) => {
    try {
        const { amount, currency, billing, locale } = req.body;
        const response = await fetch(`${process.env.API_ENDPOINT}/payment-sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount,
                currency,
                billing,
                locale,
                processing_channel_id: process.env.PROCESSING_CHANNEL_ID,
                success_url: process.env.SUCCESS_URL,
                failure_url: process.env.FAILURE_URL,
                customer: {
                    email: 'ali.farid@example.com',
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Checkout API Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


app.post('/create-hosted-payment-page', async (req, res) => {
    try {
        const { amount, currency, billing, locale } = req.body;
        const response = await fetch(`${process.env.API_ENDPOINT}/hosted-payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount,
                currency,
                billing,
                locale,
                processing_channel_id: process.env.PROCESSING_CHANNEL_ID,
                success_url: process.env.SUCCESS_URL,
                failure_url: process.env.FAILURE_URL,
                cancel_url: process.env.CANCEL_URL,
                allowedallow_payment_methods: ['remember_me']
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Checkout API Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})

app.post('/create-payment-link', async (req, res) => {
    try {
        const { amount, currency, billing, locale } = req.body;
        const response = await fetch(`${process.env.API_ENDPOINT}/payment-links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount,
                currency,
                billing,
                locale,
                processing_channel_id: process.env.PROCESSING_CHANNEL_ID,
                allowedallow_payment_methods: ['remember_me']
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Checkout API Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})


app.get('/config', (req, res) => {
    res.json({
        ckoPublicKey: process.env.PUBLIC_KEY || null
    });
});


app.get('/.well-known/ucp', (req, res) => {
    res.json({
        "version": "1.0",
        "merchant": {
            "name": "Demo Store",
            "description": "A demo e-commerce store with Checkout.com UCP integration"
        },
        "capabilities": {
            "product_discovery": {
                "endpoint": "/agent-products",
                "method": "GET"
            },
            "checkout": {
                "endpoint": "/agent-checkout",
                "method": "POST",
                "description": "When user decides to buy, generate payment link",
                "requestBody": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "description": "Array of the items that user wants to buy",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {
                                        "type": "string",
                                        "description": "must be real id from product_discovery"
                                    },
                                    "quantity": {
                                        "type": "integer",
                                        "description": "must be integer"
                                    }
                                },
                                "required": ["id", "quantity"]
                            }
                        }
                    },
                    "required": ["items"]
                }
            }
        },
        "payment_handlers": ["checkout.com"]
    });
});

// 3. 商品发现 API (Product Discovery)
app.get('/agent-products', (req, res) => {
    console.log('/products called')
    res.json(products);
});

// 4. Agentic Checkout API
app.post('/agent-checkout', async (req, res) => {

    console.log('agent-checkout called')
    try {
        // AI Agent 根据标准协议发送用户想要购买的商品及偏好
        const { items } = req.body;

        console.log(items)

        // 在后端严格计算总金额，防止前端或 Agent 数据篡改
        let totalAmount = 0;
        items.forEach(item => {
            const product = products.find(p => p.id === item.id || p.name === item.name);
            if (product) {
                totalAmount += product.price * item.quantity;
            }
        });

        // 转换为 Checkout.com 需要的最小货币单位
        const amountInMinorUnits = Math.round(totalAmount * 100);

        // 调用 Checkout.com API 生成 Payment Link
        const response = await fetch(`${process.env.API_ENDPOINT}/payment-links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount: amountInMinorUnits,
                currency: 'GBP',
                locale: 'en-GB',
                processing_channel_id: process.env.PROCESSING_CHANNEL_ID,
                billing: {
                    address: {
                        country: "GB"
                    }
                }
                // UCP 场景下通常让用户通过安全链接完成最后支付，以确保合规和风控
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Checkout API Error during Agent transaction:', data);
            return res.status(response.status).json(data);
        }

        // 将生成的支付链接返回给 AI Agent
        // Agent 会在聊天界面中直接渲染这个链接（或对应的原生支付按钮）供用户点击
        res.json({
            status: "success",
            checkout_url: data._links.redirect.href,
            payment_session_id: data.id
        });

    } catch (error) {
        console.error('Agent Checkout Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
