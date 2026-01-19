export const awsConfig = {
  region: 'us-east-1',
  
  cognito: {
    userPoolId: 'us-east-1_0xoMJ0FRU',
    clientId: 'oeo0vimkba2mduiommesnadmc',
  },
  
  api: {
    baseUrl: 'https://f0gzb9kak6.execute-api.us-east-1.amazonaws.com/prod',
    endpoints: {
      profile: '/profile',
      updateProfile: '/profile',
      deleteAccount: '/profile',
      books: '/books',
      profilePicture: '/picture',
      userStats: '/stats',
      preSignedUrl: '/profile/picture/url',
      changePassword: '/auth/change-password',
      
      // Admin endpoints
      adminStats: '/admin/stats',
      adminReports: '/admin/reports',
      adminUsers: '/admin/users',
      adminAuthors: '/admin/authors',
      adminBooks: '/admin/books',
      toggleUserStatus: '/admin/users',
      addBook: '/admin/books/add',
      
      // User search endpoints
      searchUsers: '/users/search',
      getUserById: '/users',

      users: '/users',
      lists: '/lists',
      createList: '/lists',
      updateList: '/lists',
      deleteList: '/lists',

      genres: '/genres',
      genreFavorite: '/genres',

      recommendations: '/recommendations',
      recordInteraction: '/interactions',

      authorBooks: '/author/books',
      submitBook: '/author/books',
      updatePendingBook: '/author/books',
      deletePendingBook: '/author/books',

      // Author search and profile endpoints (using /author)
      searchAuthors: '/author',      // GET /author?q=search
      authorProfile: '/author',       // GET /author/{user_id}
      
      // Author verification endpoints
      submitAuthorVerification: '/author/verification',
      getVerificationStatus: '/author/verification',
      
      // Admin verification management
      adminVerificationRequests: '/admin/verification-requests',
      approveVerification: '/admin/verification-requests',
      rejectVerification: '/admin/verification-requests',

      notifications: '/notifications',
      markNotificationRead: '/notifications',
      deleteNotification: '/notifications',
      markAllNotificationsRead: '/notifications/mark-all-read',
      notificationPreferences: '/notifications/preferences',

      followAuthor: '/authors',        // POST /authors/{author_id}/follow
      checkAuthorFollow: '/authors',   // GET /authors/{author_id}/follow-status
      getAuthorFollowers: '/authors',  // GET /authors/{author_id}/followers
    }
  },
  
  s3: {
    bucketName: 'bookarc-profile-pictures',
    verificationBucket: 'bookarc-verification-documents',
    region: 'us-east-1'
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${awsConfig.api.baseUrl}${endpoint}`;
};