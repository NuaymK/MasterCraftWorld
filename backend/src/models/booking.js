const { db } = require('../index');

const bookingsCollection = db.collection('bookings');

/**
 * Booking status enum
 */
const BookingStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Booking model functions for Firebase Firestore
 */
const Booking = {
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data to store
   * @returns {Promise<string>} New booking ID
   */
  create: async (bookingData) => {
    // Set default status as pending if not provided
    const data = {
      ...bookingData,
      status: bookingData.status || BookingStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await bookingsCollection.add(data);
    return docRef.id;
  },

  /**
   * Get a booking by ID
   * @param {string} id - Booking ID
   * @returns {Promise<Object>} Booking document
   */
  getById: async (id) => {
    const doc = await bookingsCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Get bookings by customer ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Array of booking documents
   */
  getByCustomerId: async (customerId) => {
    const snapshot = await bookingsCollection
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Get bookings by plumber ID
   * @param {string} plumberId - Plumber ID
   * @returns {Promise<Array>} Array of booking documents
   */
  getByPlumberId: async (plumberId) => {
    const snapshot = await bookingsCollection
      .where('plumberId', '==', plumberId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Get bookings by status
   * @param {string} status - Booking status
   * @returns {Promise<Array>} Array of booking documents
   */
  getByStatus: async (status) => {
    const snapshot = await bookingsCollection
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Update a booking
   * @param {string} id - Booking ID
   * @param {Object} updates - Fields to update
   * @returns {Promise}
   */
  update: async (id, updates) => {
    return await bookingsCollection.doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  /**
   * Update booking status
   * @param {string} id - Booking ID
   * @param {string} status - New status
   * @returns {Promise}
   */
  updateStatus: async (id, status) => {
    return await bookingsCollection.doc(id).update({
      status,
      updatedAt: new Date()
    });
  },

  /**
   * Assign booking to a plumber
   * @param {string} id - Booking ID
   * @param {string} plumberId - Plumber ID
   * @returns {Promise}
   */
  assignPlumber: async (id, plumberId) => {
    return await bookingsCollection.doc(id).update({
      plumberId,
      status: BookingStatus.ASSIGNED,
      assignedAt: new Date(),
      updatedAt: new Date()
    });
  }
};

module.exports = {
  Booking,
  BookingStatus
};