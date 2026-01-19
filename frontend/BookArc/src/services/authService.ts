// src/services/authService.ts

import { awsConfig } from '../config/aws-config';

export interface RegisterData {
  email: string;
  password: string;
  username: string;     
  displayName: string;   
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserSession {
  username: string;
  email: string;
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private cognitoUrl: string;

  constructor() {
    this.cognitoUrl = `https://cognito-idp.${awsConfig.region}.amazonaws.com/`;
  }

  private async makeRequest(action: string, body: any) {
    const response = await fetch(this.cognitoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.__type || 'Authentication failed');
    }
    
    return data;
  }

  // Register new user
async register(data: RegisterData): Promise<{ success: boolean; message: string }> {
  try {
    await this.makeRequest('SignUp', {
      ClientId: awsConfig.cognito.clientId,
      Username: data.email,  
      Password: data.password,
      UserAttributes: [
        { Name: 'email', Value: data.email },
        { Name: 'name', Value: data.displayName },           
        { Name: 'preferred_username', Value: data.username }  
      ]
    });

    return {
      success: true,
      message: 'Registration successful! Please check your email for verification code.'
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
}

  // Confirm email with verification code
  async confirmSignUp(email: string, code: string): Promise<void> {
    await this.makeRequest('ConfirmSignUp', {
      ClientId: awsConfig.cognito.clientId,
      Username: email,
      ConfirmationCode: code
    });
  }

  // Login user
  async login(data: LoginData): Promise<UserSession> {
    const result = await this.makeRequest('InitiateAuth', {
      ClientId: awsConfig.cognito.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: data.email,
        PASSWORD: data.password
      }
    });

    const authResult = result.AuthenticationResult;
    
    // Decode ID token to get user info
    const idTokenPayload = JSON.parse(atob(authResult.IdToken.split('.')[1]));
    
    const session: UserSession = {
      username: idTokenPayload.name,
      email: idTokenPayload.email,
      idToken: authResult.IdToken,
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken
    };

    // Store in localStorage
    localStorage.setItem('userSession', JSON.stringify(session));

    return session;
  }

  // Logout user
  logout(): void {
    localStorage.removeItem('userSession');
  }

  // Get current session
  getCurrentSession(): UserSession | null {
    const sessionStr = localStorage.getItem('userSession');
    if (!sessionStr) return null;
    
    try {
      return JSON.parse(sessionStr);
    } catch (e) {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }

  // Get ID token for API calls
  getIdToken(): string | null {
    const session = this.getCurrentSession();
    return session?.idToken || null;
  }

  // Get Access token for API calls
  getAccessToken(): string | null {
    const session = this.getCurrentSession();
    return session?.accessToken || null;
  }

  // Resend verification code
  async resendVerificationCode(email: string): Promise<void> {
    await this.makeRequest('ResendConfirmationCode', {
      ClientId: awsConfig.cognito.clientId,
      Username: email
    });
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    await this.makeRequest('ForgotPassword', {
      ClientId: awsConfig.cognito.clientId,
      Username: email
    });
  }

  // Reset password with code
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.makeRequest('ConfirmForgotPassword', {
      ClientId: awsConfig.cognito.clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });
  }

async changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const idToken = this.getIdToken();
  const accessToken = this.getAccessToken();
  
  console.log('🔍 DEBUG: ID Token exists?', !!idToken);
  console.log('🔍 DEBUG: Access Token exists?', !!accessToken);
  console.log('🔍 DEBUG: ID Token (first 50 chars):', idToken?.substring(0, 50));
  console.log('🔍 DEBUG: Access Token (first 50 chars):', accessToken?.substring(0, 50));
  
  if (!idToken || !accessToken) {
    throw new Error('Not authenticated - please log in again');
  }

  const url = `${awsConfig.api.baseUrl}${awsConfig.api.endpoints.changePassword}`;
  
  console.log('🔍 DEBUG: Request URL:', url);
  
  const requestBody = {
    oldPassword,
    newPassword,
    accessToken
  };
  
  console.log('🔍 DEBUG: Request body keys:', Object.keys(requestBody));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(requestBody)
  });

  console.log('🔍 DEBUG: Response status:', response.status);
  
  const data = await response.json();
  console.log('🔍 DEBUG: Response data:', data);

  if (!response.ok) {
    console.error('❌ API Error:', data);
    throw new Error(data.message || data.error || 'Failed to change password');
  }

  return data;
}
}

export const authService = new AuthService();