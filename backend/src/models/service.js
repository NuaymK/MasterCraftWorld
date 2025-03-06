const { db } = require('../index');

const servicesCollection = db.collection('services');

/**
 * Service model functions for Firebase Firestore
 */
const Service = {
  /**
   * Create a new service
   * @param {Object} serviceData - Service data to store
   * @returns {Promise<string>} New service ID
   */
  create: async (serviceData) => {
    const docRef = await servicesCollection.add({
      ...serviceData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  },

  /**
   * Get a service by ID
   * @param {string} id - Service ID
   * @returns {Promise<Object>} Service document
   */
  getById: async (id) => {
    const doc = await servicesCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Get all services
   * @returns {Promise<Array>} Array of service documents
   */
  getAll: async () => {
    const snapshot = await servicesCollection.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Update a service
   * @param {string} id - Service ID
   * @param {Object} updates - Fields to update
   * @returns {Promise}
   */
  update: async (id, updates) => {
    return await servicesCollection.doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  /**
   * Delete a service
   * @param {string} id - Service ID
   * @returns {Promise}
   */
  delete: async (id) => {
    return await servicesCollection.doc(id).delete();
  }
};

module.exports = Service;