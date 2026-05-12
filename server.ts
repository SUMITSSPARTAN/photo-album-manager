import express from 'express';
import route from './route.ts';


const app = express();
route(app);


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});