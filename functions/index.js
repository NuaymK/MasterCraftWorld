/**
 * MasterCraftWorld Firebase Functions
 * Provides service matching and status updates for plumbing services in Riyadh
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Client } = require('@googlemaps/google-maps-services-js');

// Initialize the Firebase Admin SDK
admin.initializeApp();

// Initialize Firestore database
const db = admin.firestore();

// Initialize Google Maps client
const mapsClient = new Client({});

/**
 * Assigns service providers to new service requests
 * Finds available providers in Riyadh that match the service type
 */
exports.assignServiceProviders = functions
  .region('europe-west1')
  .firestore
  .document('serviceRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const requestData = snap.data();

    // Find all service providers in Riyadh that match the service type
    // and are currently available (not on job)
    const providersSnapshot = await db.collection('serviceProviders')
      .where('services', 'array-contains', requestData.serviceType)
      .where('currentStatus', '==', 'available')
      .get();

    // Send notification to all eligible providers
    const batch = db.batch();
    providersSnapshot.docs.forEach(doc => {
      const providerData = doc.data();

      // Create notification for each provider
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: doc.id,
        title: 'New Service Request',
        body: `A new ${requestData.serviceType} request is available in your area`,
        type: 'new_request',
        relatedId: context.params.requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return batch.commit();
  });

/**
 * Updates service provider status when service request status changes
 */
exports.onServiceRequestStatusChange = functions
  .region('europe-west1')
  .firestore
  .document('serviceRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only proceed if status has changed
    if (before.status === after.status) return null;

    // Notify customer about status change
    if (after.status !== before.status && after.customerId) {
      const notificationRef = db.collection('notifications').doc();
      await notificationRef.set({
        userId: after.customerId,
        title: 'Service Request Update',
        body: `Your service request status has changed to: ${after.status}`,
        type: 'status_update',
        relatedId: context.params.requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // If request was completed, prompt for review
    if (after.status === 'completed' && after.customerId && after.assignedProvider) {
      const reviewPromptRef = db.collection('notifications').doc();
      await reviewPromptRef.set({
        userId: after.customerId,
        title: 'Leave a Review',
        body: 'Your service is complete. Please leave a review for your service provider.',
        type: 'review_prompt',
        relatedId: context.params.requestId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // If provider was assigned, update their status
    if (after.status === 'assigned' && after.assignedProvider) {
      return db.collection('serviceProviders').doc(after.assignedProvider)
        .update({ currentStatus: 'onJob' });
    }

    // If job completed, update provider status back to available
    if (after.status === 'completed' && after.assignedProvider) {
      return db.collection('serviceProviders').doc(after.assignedProvider)
        .update({
          currentStatus: 'available',
          completedJobs: admin.firestore.FieldValue.increment(1)
        });
    }
  });

/**
 * Calculates distance between customer and service providers
 * This function can be called from the client to get nearby providers
 */
exports.findNearbyProviders = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
          'unauthenticated',
          'You must be logged in to find nearby providers'
      );
    }

    const { latitude, longitude, serviceType, maxDistance = 10 } = data;
    
    if (!latitude || !longitude) {
      throw new functions.https.HttpsError(
          'invalid-argument',
          'The function must be called with latitude and longitude.'
      );
    }

    // Get all available service providers of the requested type
    const providersQuery = db.collection('serviceProviders');
    let providers = serviceType
      ? await providersQuery.where('services', 'array-contains', serviceType).get()
      : await providersQuery.get();
    
    // Filter by distance (client location to provider's last known location)
    const nearbyProviders = [];
    
    for (const doc of providers.docs) {
      const providerData = doc.data();
      
      if (providerData.currentLocation?.latitude && providerData.currentLocation?.longitude) {
        // Calculate distance using the Haversine formula
        const distance = calculateDistance(
            latitude, 
            longitude, 
            providerData.currentLocation.latitude, 
            providerData.currentLocation.longitude
        );
        
        if (distance <= maxDistance) {
          nearbyProviders.push({
            id: doc.id,
            ...providerData,
            distance: distance.toFixed(1) // Distance in km
          });
        }
      }
    }
    
    return { providers: nearbyProviders };
  });

/**
 * Calculates the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @return {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}