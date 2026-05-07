const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/servicedb';

mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── Schemas & Models ─────────────────────────────────────────────────────────

// Service Provider schema
const providerSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       { type: String, default: '' },
  skills:      [{ type: String }],                     // e.g. ["Plumbing", "Electrical"]
  bio:         { type: String, default: '' },
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  totalJobs:   { type: Number, default: 0 },
  available:   { type: Boolean, default: true },
  location:    { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now }
});

const Provider = mongoose.model('Provider', providerSchema);

// Service Request schema (enhanced)
const serviceRequestSchema = new mongoose.Schema({
  user:         { type: String, required: true },
  userEmail:    { type: String, default: '' },
  userPhone:    { type: String, default: '' },
  service:      { type: String, required: true },       // category
  description:  { type: String, default: '' },
  location:     { type: String, default: '' },
  urgency:      { type: String, enum: ['Low', 'Medium', 'High', 'Emergency'], default: 'Medium' },
  budget:       { type: Number, default: 0 },
  status:       { type: String, enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  provider:     { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  providerName: { type: String, default: null },
  scheduledDate:{ type: Date, default: null },
  completedAt:  { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now }
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

// Review schema
const reviewSchema = new mongoose.Schema({
  serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  provider:       { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  reviewer:       { type: String, required: true },
  rating:         { type: Number, required: true, min: 1, max: 5 },
  comment:        { type: String, default: '' },
  createdAt:      { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Smart Service Marketplace API is running!',
    version: '2.0.0',
    endpoints: {
      providers: '/providers',
      requests: '/requests',
      reviews: '/reviews',
      dashboard: '/dashboard',
      categories: '/categories'
    }
  });
});

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'plumbing',    name: 'Plumbing',       icon: '🔧', description: 'Pipe repairs, installations, leak fixes' },
  { id: 'electrical',  name: 'Electrical',     icon: '⚡', description: 'Wiring, switches, electrical repairs' },
  { id: 'carpentry',   name: 'Carpentry',      icon: '🪚', description: 'Furniture, woodwork, installations' },
  { id: 'cleaning',    name: 'Cleaning',       icon: '🧹', description: 'Deep cleaning, regular maintenance' },
  { id: 'painting',    name: 'Painting',       icon: '🎨', description: 'Interior & exterior painting' },
  { id: 'ac-repair',   name: 'AC Repair',      icon: '❄️', description: 'AC servicing, gas refill, repairs' },
  { id: 'gardening',   name: 'Gardening',      icon: '🌱', description: 'Lawn care, landscaping, plant care' },
  { id: 'pest-control',name: 'Pest Control',   icon: '🐛', description: 'Termite, cockroach, bed bug treatment' },
  { id: 'appliance',   name: 'Appliance Repair', icon: '🔌', description: 'Washing machine, fridge, microwave' },
  { id: 'tutoring',    name: 'Tutoring',       icon: '📚', description: 'Academic tutoring, test prep' },
  { id: 'moving',      name: 'Moving & Packing', icon: '📦', description: 'House shifting, packing services' },
  { id: 'beauty',      name: 'Beauty & Salon', icon: '💇', description: 'Haircut, facial, spa at home' }
];

app.get('/categories', (req, res) => {
  res.json({ count: CATEGORIES.length, data: CATEGORIES });
});

// ─── Dashboard / Stats ────────────────────────────────────────────────────────

app.get('/dashboard', async (req, res) => {
  try {
    const totalRequests = await ServiceRequest.countDocuments();
    const pendingRequests = await ServiceRequest.countDocuments({ status: 'Pending' });
    const activeRequests = await ServiceRequest.countDocuments({ status: { $in: ['Accepted', 'In Progress'] } });
    const completedRequests = await ServiceRequest.countDocuments({ status: 'Completed' });
    const totalProviders = await Provider.countDocuments();
    const availableProviders = await Provider.countDocuments({ available: true });
    const totalReviews = await Review.countDocuments();

    // Most popular services
    const popularServices = await ServiceRequest.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Average rating
    const avgRatingResult = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? Math.round(avgRatingResult[0].avgRating * 10) / 10 : 0;

    // Recent activity (last 5 requests)
    const recentRequests = await ServiceRequest.find()
      .sort({ createdAt: -1 }).limit(5)
      .select('user service status createdAt urgency');

    res.json({
      stats: {
        totalRequests,
        pendingRequests,
        activeRequests,
        completedRequests,
        totalProviders,
        availableProviders,
        totalReviews,
        avgRating
      },
      popularServices,
      recentRequests
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Provider Routes ──────────────────────────────────────────────────────────

// POST /providers — Register a new provider
app.post('/providers', async (req, res) => {
  try {
    const { name, email, phone, skills, bio, location } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const provider = new Provider({ name, email, phone, skills, bio, location });
    await provider.save();
    res.status(201).json({ message: 'Provider registered!', data: provider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /providers — List all providers (with optional skill filter)
app.get('/providers', async (req, res) => {
  try {
    const filter = {};
    if (req.query.skill) {
      filter.skills = { $regex: new RegExp(req.query.skill, 'i') };
    }
    if (req.query.available === 'true') {
      filter.available = true;
    }
    const providers = await Provider.find(filter).sort({ rating: -1 });
    res.json({ count: providers.length, data: providers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /providers/:id — Get single provider detail
app.get('/providers/:id', async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    // Get reviews for this provider
    const reviews = await Review.find({ provider: req.params.id })
      .sort({ createdAt: -1 }).limit(10);

    res.json({ data: provider, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /providers/:id — Update provider profile
app.put('/providers/:id', async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    res.json({ message: 'Provider updated!', data: provider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /providers/:id — Remove provider
app.delete('/providers/:id', async (req, res) => {
  try {
    await Provider.findByIdAndDelete(req.params.id);
    res.json({ message: 'Provider deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Service Request Routes ───────────────────────────────────────────────────

// POST /request-service — Create a new service request
app.post('/request-service', async (req, res) => {
  try {
    const { user, userEmail, userPhone, service, description, location, urgency, budget, scheduledDate } = req.body;
    if (!user || !service) {
      return res.status(400).json({ error: 'user and service fields are required' });
    }
    const newRequest = new ServiceRequest({
      user, userEmail, userPhone, service, description, location,
      urgency: urgency || 'Medium',
      budget: budget || 0,
      scheduledDate: scheduledDate || null
    });
    await newRequest.save();
    res.status(201).json({ message: 'Service request created!', data: newRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /requests — List all service requests (with filters)
app.get('/requests', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.service) filter.service = { $regex: new RegExp(req.query.service, 'i') };
    if (req.query.urgency) filter.urgency = req.query.urgency;
    if (req.query.user) filter.user = { $regex: new RegExp(req.query.user, 'i') };

    const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 });
    res.json({ count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /requests/:id — Get single request detail
app.get('/requests/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /accept-request/:id — Provider accepts a request
app.post('/accept-request/:id', async (req, res) => {
  try {
    const { provider, providerName } = req.body;
    const update = {
      status: 'Accepted',
      providerName: providerName || 'Unknown Provider'
    };
    if (provider) update.provider = provider;

    const request = await ServiceRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Increment provider's totalJobs if provider ID given
    if (provider) {
      await Provider.findByIdAndUpdate(provider, { $inc: { totalJobs: 1 } });
    }

    res.json({ message: 'Request accepted!', data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /start-request/:id — Mark request as In Progress
app.post('/start-request/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'In Progress' },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Service started!', data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /complete-request/:id — Mark request as Completed
app.post('/complete-request/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Completed', completedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Service completed!', data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cancel-request/:id — Cancel a request
app.post('/cancel-request/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request cancelled.', data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /request/:id — Delete a request
app.delete('/request/:id', async (req, res) => {
  try {
    await ServiceRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Review Routes ────────────────────────────────────────────────────────────

// POST /reviews — Submit a review
app.post('/reviews', async (req, res) => {
  try {
    const { serviceRequest, provider, reviewer, rating, comment } = req.body;
    if (!serviceRequest || !provider || !reviewer || !rating) {
      return res.status(400).json({ error: 'serviceRequest, provider, reviewer, and rating are required' });
    }
    const review = new Review({ serviceRequest, provider, reviewer, rating, comment });
    await review.save();

    // Update provider average rating
    const allReviews = await Review.find({ provider });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Provider.findByIdAndUpdate(provider, { rating: Math.round(avgRating * 10) / 10 });

    res.status(201).json({ message: 'Review submitted!', data: review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reviews — List all reviews (optionally filter by provider)
app.get('/reviews', async (req, res) => {
  try {
    const filter = {};
    if (req.query.provider) filter.provider = req.query.provider;
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.json({ count: reviews.length, data: reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Search ───────────────────────────────────────────────────────────────────

app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const regex = new RegExp(q, 'i');

    const [requests, providers] = await Promise.all([
      ServiceRequest.find({
        $or: [
          { service: regex },
          { user: regex },
          { description: regex },
          { location: regex }
        ]
      }).sort({ createdAt: -1 }).limit(20),
      Provider.find({
        $or: [
          { name: regex },
          { skills: regex },
          { location: regex },
          { bio: regex }
        ]
      }).limit(10)
    ]);

    res.json({
      requests: { count: requests.length, data: requests },
      providers: { count: providers.length, data: providers }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Seed Data (for demo purposes) ───────────────────────────────────────────

app.post('/seed', async (req, res) => {
  try {
    // Seed providers
    const providers = await Provider.insertMany([
      { name: 'Raju Electricals', email: 'raju@example.com', phone: '9876543210', skills: ['Electrical', 'AC Repair'], bio: '10 years experience in electrical and AC work', rating: 4.5, totalJobs: 42, location: 'Hyderabad' },
      { name: 'Lakshmi Cleaning Services', email: 'lakshmi@example.com', phone: '9876543211', skills: ['Cleaning', 'Pest Control'], bio: 'Professional deep cleaning and pest control', rating: 4.8, totalJobs: 89, location: 'Hyderabad' },
      { name: 'Krishna Plumbing', email: 'krishna@example.com', phone: '9876543212', skills: ['Plumbing'], bio: 'Expert plumber for all your needs', rating: 4.2, totalJobs: 35, location: 'Hyderabad' },
      { name: 'Priya Home Tutors', email: 'priya@example.com', phone: '9876543213', skills: ['Tutoring'], bio: 'M.Sc in Mathematics, 5 years teaching experience', rating: 4.9, totalJobs: 120, location: 'Hyderabad' },
      { name: 'Vijay Painters', email: 'vijay@example.com', phone: '9876543214', skills: ['Painting', 'Carpentry'], bio: 'Interior and exterior painting specialist', rating: 4.6, totalJobs: 67, location: 'Hyderabad' },
      { name: 'Green Thumb Gardens', email: 'greenthumb@example.com', phone: '9876543215', skills: ['Gardening'], bio: 'Landscaping and garden maintenance', rating: 4.3, totalJobs: 28, location: 'Hyderabad' }
    ]);

    // Seed some requests
    await ServiceRequest.insertMany([
      { user: 'Siri', service: 'Plumbing', description: 'Kitchen sink is leaking badly', location: 'Gachibowli', urgency: 'High', budget: 500, status: 'Pending' },
      { user: 'Arjun', service: 'Electrical', description: 'Need to install new ceiling fans', location: 'Madhapur', urgency: 'Medium', budget: 1200, status: 'Accepted', providerName: 'Raju Electricals', provider: providers[0]._id },
      { user: 'Meera', service: 'Cleaning', description: 'Full house deep cleaning needed', location: 'Kondapur', urgency: 'Low', budget: 2000, status: 'Completed', providerName: 'Lakshmi Cleaning Services', provider: providers[1]._id, completedAt: new Date() },
      { user: 'Rahul', service: 'Tutoring', description: 'Need math tutor for 10th class son', location: 'Kukatpally', urgency: 'Medium', budget: 800, status: 'In Progress', providerName: 'Priya Home Tutors', provider: providers[3]._id },
      { user: 'Ananya', service: 'Painting', description: 'Repaint 2BHK apartment', location: 'Hitec City', urgency: 'Low', budget: 15000, status: 'Pending' },
    ]);

    // Seed a review
    await Review.insertMany([
      { serviceRequest: (await ServiceRequest.findOne({ user: 'Meera' }))._id, provider: providers[1]._id, reviewer: 'Meera', rating: 5, comment: 'Excellent cleaning, very thorough!' },
    ]);

    res.json({ message: '🌱 Demo data seeded successfully!', providers: providers.length, requests: 5, reviews: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});