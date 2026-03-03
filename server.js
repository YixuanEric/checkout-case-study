import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });


const app = express();
const port = process.env.PORT || 3000;

const webhookParser = express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
});

app.post('/payment-webhook', webhookParser, async (req, res) => {
    console.log('webhook called');
    try {
        const authHeader = req.headers['authorization'];
        const signature = req.headers['Cko-Signature']

        if (authHeader !== process.env.WEBHOOK_KEY) {
            return console.error('Unauthorized Webhook Attempt!');
        }
        if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
            console.error('Data received is not a Buffer!');
            return res.status(500).send('Configuration Error');
        }

        // 3. Hash the RAW payload using SHA-256 and your key
        const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
        const expectedSignature = hmac.update(req.rawBody); // Use the raw buffer here
        console.log('signature', signature)
        console.log('expected signature', expectedSignature)

        // 4. Compare the resulting HMAC with the header
        if (signature === expectedSignature) {
            console.log('Webhook Verified: Payload is authentic.');
            res.status(200).send({
                message: "Webhook acknowledged",
            });
            // Process your business logic here
            const event = req.body;
            console.log('Event Type:', event.type);
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
app.use(express.static(path.join(__dirname, 'public')));


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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
