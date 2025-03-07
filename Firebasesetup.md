  1. Firebase Authentication

  - Enable Email/Password authentication
  - Enable Google authentication for Gmail login
  - Skip phone number authentication

  2. Firestore Database Structure

  Users Collection

  users/{userId}
    - uid: string
    - email: string
    - displayName: string
    - photoURL: string (optional)
    - userType: string (customer or serviceProvider)
    - phone: string (optional)
    - address: {
        street: string,
        city: string,
        state: string,
        zipCode: string,
        coordinates: {
          latitude: number,
          longitude: number
        }
      }
    - createdAt: timestamp
    - lastLoginAt: timestamp

  Service Providers Collection

  serviceProviders/{userId}
    - uid: string (same as users collection)
    - services: array of strings (e.g., ["plumbing", "electrical"])
    - specialties: array of strings (optional)
    - experience: number (years)
    - certifications: array of {
        name: string,
        issuedBy: string,
        issueDate: timestamp,
        expiryDate: timestamp,
        verificationStatus: string,
        certificateUrl: string (reference to file in Storage)
      }
    - availability: {
        isAvailable: boolean,
        workingHours: {
          monday: { start: string, end: string, isWorking: boolean },
          tuesday: { start: string, end: string, isWorking: boolean },
          // etc. for all days
        }
      }
    - currentStatus: string (available, onJob, offline)
    - currentLocation: {
        latitude: number,
        longitude: number,
        lastUpdated: timestamp
      }
    - rating: number (average)
    - completedJobs: number
    - verificationStatus: string (pending, verified, rejected)

  Service Requests Collection

  serviceRequests/{requestId}
    - customerId: string
    - serviceType: string
    - description: string
    - urgency: string (normal, urgent)
    - status: string (pending, assigned, inProgress, completed, canceled)
    - createdAt: timestamp
    - scheduledFor: timestamp
    - location: {
        address: string,
        coordinates: {
          latitude: number,
          longitude: number
        }
      }
    - assignedProvider: string (provider ID, if assigned)
    - assignedAt: timestamp
    - completedAt: timestamp
    - estimatedCost: number (optional)
    - finalCost: number (optional)
    - paymentStatus: string (pending, paid)
    - notes: string (optional)

  Reviews Collection

  reviews/{reviewId}
    - serviceRequestId: string
    - customerId: string
    - providerId: string
    - rating: number (1-5)
    - comment: string
    - createdAt: timestamp
    - photos: array of strings (URLs to Storage)

  Notifications Collection

  notifications/{notificationId}
    - userId: string
    - title: string
    - body: string
    - type: string (request, assignment, status_update, etc.)
    - relatedId: string (e.g., requestId)
    - read: boolean
    - createdAt: timestamp

  3. Firebase Storage

  - Structure your storage with the following folders:
  /profile-photos/{userId}/*
  /certifications/{userId}/*
  /job-photos/{requestId}/*

  4. Firebase Cloud Functions

  Request Matching Function

  For your specific case in Riyadh, create a function that:
  exports.assignServiceProviders = functions.firestore
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

  Service Request Status Updates

  exports.onServiceRequestStatusChange = functions.firestore
    .document('serviceRequests/{requestId}')
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();

      // Only proceed if status has changed
      if (before.status === after.status) return null;

      // Notify customer about status change
      // ...

      // If request was completed, prompt for review
      // ...

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

  5. Firebase Hosting

  Configuration steps:
  1. Install Firebase CLI: npm install -g firebase-tools
  2. Login to Firebase: firebase login
  3. Initialize hosting: firebase init hosting
    - Select your Firebase project
    - Configure as a single-page app
    - Set your build directory to frontend/build
  4. Add to firebase.json:
  {
    "hosting": {
      "public": "frontend/build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  }

  5. Build and deploy:

  cd frontend
  npm run build
  firebase deploy --only hosting

  6. Firebase Security Rules

  Firestore Rules

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Check if the user is authenticated
      function isAuthenticated() {
        return request.auth != null;
      }
      
      // Check if the user is accessing their own data
      function isOwner(userId) {
        return request.auth.uid == userId;
      }
      
      // Check if user is a service provider
      function isServiceProvider(userId) {
        return exists(/databases/$(database)/documents/serviceProviders/$(userId));
      }
      
      // Check if user is an admin
      function isAdmin() {
        return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "admin";
      }
      
      // Users collection
      match /users/{userId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && isOwner(userId);
        allow update, delete: if isAuthenticated() && (isOwner(userId) || isAdmin());
      }
      
      // Service Providers collection
      match /serviceProviders/{userId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && isOwner(userId);
        allow update: if isAuthenticated() && (isOwner(userId) || isAdmin());
        allow delete: if isAdmin();
      }
      
      // Service Requests collection
      match /serviceRequests/{requestId} {
        allow read: if isAuthenticated() && (
          request.auth.uid == resource.data.customerId || 
          request.auth.uid == resource.data.assignedProvider || 
          isAdmin()
        );
        allow create: if isAuthenticated();
        allow update: if isAuthenticated() && (
          request.auth.uid == resource.data.customerId || 
          request.auth.uid == resource.data.assignedProvider || 
          isAdmin()
        );
        allow delete: if isAdmin();
      }
      
      // Reviews collection
      match /reviews/{reviewId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && request.auth.uid == request.resource.data.customerId;
        allow update, delete: if isAdmin();
      }
      
      // Notifications collection
      match /notifications/{notificationId} {
        allow read: if isAuthenticated() && request.auth.uid == resource.data.userId;
        allow create: if isAuthenticated();
        allow update: if isAuthenticated() && request.auth.uid == resource.data.userId;
        allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
      }
    }
  }

  Storage Rules

  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      // Check if the user is authenticated
      function isAuthenticated() {
        return request.auth != null;
      }
      
      // Check if the user is accessing their own data
      function isOwner(userId) {
        return request.auth.uid == userId;
      }
      
      // Check if user is an admin
      function isAdmin() {
        return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.userType == "admin";
      }
      
      // Profile photos
      match /profile-photos/{userId}/{allPaths=**} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated() && (isOwner(userId) || isAdmin());
      }
      
      // Certifications
      match /certifications/{userId}/{allPaths=**} {
        allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
        allow write: if isAuthenticated() && (isOwner(userId) || isAdmin());
      }
      
      // Job photos
      match /job-photos/{requestId}/{allPaths=**} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated() && (
          firestore.get(/databases/(default)/documents/serviceRequests/$(requestId)).data.customerId == request.auth.uid || 
          firestore.get(/databases/(default)/documents/serviceRequests/$(requestId)).data.assignedProvider == request.auth.uid || 
          isAdmin()
        );
      }
    }
  }

  This comprehensive setup will support your MasterCraftWorld application focused on Riyadh, with the request matching system sending job notifications to all available service providers in the area rather than using complex
  geographical matching.


