import express from 'express';
import route from './route.ts';
import "dotenv/config";


const app = express();
route(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});