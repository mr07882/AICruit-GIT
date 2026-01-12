const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// IMPORTING ROUTES
const Routes = require('./Routes/Routes');

// IMPORTING QUEUE PROCESSOR
require('./Services/resumeEvaluationQueue'); // Initialize queue processor


//MIDDLEWARE
app.use(cors());
app.use(express.json()); 

// USING ROUTES
app.use('/api', Routes);

//TESTING THE ROUTE 
app.get('/', (req, res) => {
  res.send('API is running...');
});

//MONGODB CONNECTION STRING 
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('Database Connected Successfully'))
  .catch(err => console.error('Database Connection Error:', err));

//STARTING THE SERVER 
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ Resume evaluation queue processor initialized');
});

module.exports = app;





