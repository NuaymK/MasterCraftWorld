const { db } = require('../index');

const usersCollection = db.collection('users');

/**
 * User model functions for Firebase Firestore
 */
const User = {
  /**
   * Create a new user document in Firestore
   * @param {string} uid - Firebase Auth user ID
   * @param {Object} userData - User data to store
   * @returns {Promise}
   */
  create: async (uid, userData) => {
    return await usersCollection.doc(uid).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  /**
   * Get a user by their Firebase Auth ID
   * @param {string} uid - Firebase Auth user ID
   * @returns {Promise<Object>} User document
   */
  getById: async (uid) => {
    const userDoc = await usersCollection.doc(uid).get();
    if (!userDoc.exists) {
      return null;
    }
    return { id: userDoc.id, ...userDoc.data() };
  },

  /**
   * Update a user's information
   * @param {string} uid - Firebase Auth user ID
   * @param {Object} updates - Fields to update
   * @returns {Promise}
   */
  update: async (uid, updates) => {
    return await usersCollection.doc(uid).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  /**
   * Delete a user
   * @param {string} uid - Firebase Auth user ID
   * @returns {Promise}
   */
  delete: async (uid) => {
    return await usersCollection.doc(uid).delete();
  }
};

module.exports = User;