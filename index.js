const express = require('express');
const stripe = require('stripe')('sk_test_51IeI8IKQ0rUFHkAjTMFKpJMdjQPZ0Hq1vEdYGooMNYLilo7BJT4Ke8wUI33ocb313ohMg3NDFwbEQvgozhlVmuI300hEP06SAa');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

console.log();

//middleware
app.use(cors());
app.use(express.json());


//mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nwuix.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log('authorization', authorization);
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Invalid authorization' })
    }
    const token = authorization.split(' ')[1];
    // console.log('token', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'Invalid authorization' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('Carworkshop').collection('Services')
        const bookingCollection = client.db('Carworkshop').collection('booking')
        const paymentCollection = client.db('Carworkshop').collection('payment')

        //JWT
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })
        app.post('/payments', async (req, res) => {
            const payment = req.body;

            console.log(payment);
            const paymentResult = await paymentCollection.insertOne(payment);
            console.log(paymentResult);
            res.send(paymentResult)
        })
        app.post('/create-payment-intent', async (req, res) => {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 1000, // amount in cents
                currency: 'usd',
            });
            console.log(paymentIntent);
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //SERVICE ROUTES
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })



        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            }
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })
        //booking

        app.post('/bookings', async (req, res) => {
            const book = req.body;

            console.log(payment);
            const bookingResult = await paymentCollection.insertOne(book);
            console.log(bookingResult);
            res.send(bookingResult)
        })

        app.get('/booking', verifyToken, async (req, res) => {
            const decoded = req.decoded;
            // console.log('come back', decoded);
            if (decoded.email !== req.query.email) {
                return res.status(403).res.send({ error: true, message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        })


        //update
        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateBooking = req.body;
            console.log(updateBooking);
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        //payment


        //delete
        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        //

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Absorb LWS')
})

app.listen(port, () => {
    console.log(`car workshop server is running on port ${port}`);
})