// src/services/listBookService.ts
// Service for managing books in user lists
// FIXED: Uses apiService.makeRequest for consistent authentication

import { apiService } from './apiService';

interface ListBook {
  list_book_id: number;
  list_id: number;
  book_id: number;
  added_at: string;
}

interface UserList {
  list_id: number;
  user_id?: number;
  name: 'Reading' | 'Completed' | 'Plan to Read' | 'On-Hold' | 'Dropped' | 'Custom';
  title?: string;
  visibility: 'public' | 'private';
  created_at?: string;
  updated_at?: string;
  book_count?: number;
  is_added?: boolean;
  added_at?: string;
  books?: Array<{
    book_id: number;
    title: string;
    cover_image_url?: string;
    added_at: string;
    authors?: string[];
    average_rating?: number;
    genre?: string;
  }>;
}

class ListBookService {
  /**
   * Get all lists for the current user
   */
  async getUserLists(): Promise<{
    lists: UserList[];
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest']('/lists', {
      method: 'GET',
    });
  }

  /**
   * Get a specific list with all its books
   */
  async getListById(listId: number): Promise<{
    list: UserList;
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/lists/${listId}`, {
      method: 'GET',
    });
  }

  /**
   * Add a book to a specific list
   */
  async addBookToList(
    listId: number,
    bookId: number
  ): Promise<{
    message: string;
    list_book?: ListBook;
  }> {
    console.log('📚 Adding book to list:', { listId, bookId });
    
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/lists/${listId}/books`, {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId }),
    });
  }

  /**
   * Remove a book from a specific list
   */
  async removeBookFromList(
    listId: number,
    bookId: number
  ): Promise<{
    message: string;
  }> {
    console.log('🗑️ Removing book from list:', { listId, bookId });
    
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/lists/${listId}/books/${bookId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all user lists with is_added flag for a specific book
   * NEW BEHAVIOR: Returns ALL lists with indication of which ones contain the book
   */
  async getBookLists(bookId: number): Promise<{
    lists: UserList[];
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/books/${bookId}/lists`, {
      method: 'GET',
    });
  }

  /**
   * Create a new custom list
   */
  async createCustomList(
    title: string,
    visibility: 'public' | 'private' = 'private'
  ): Promise<{
    message: string;
    list: UserList;
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest']('/lists', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Custom',
        title,
        visibility,
      }),
    });
  }

  /**
   * Update list details (title, visibility)
   */
  async updateList(
    listId: number,
    updates: {
      title?: string;
      visibility?: 'public' | 'private';
    }
  ): Promise<{
    message: string;
    list: UserList;
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a custom list
   */
  async deleteList(listId: number): Promise<{
    message: string;
  }> {
    // @ts-ignore - apiService.makeRequest is private but we need to use it
    return apiService['makeRequest'](`/lists/${listId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Move a book from one list to another
   */
  async moveBookBetweenLists(
    bookId: number,
    fromListId: number,
    toListId: number
  ): Promise<{
    message: string;
  }> {
    // First remove from old list
    await this.removeBookFromList(fromListId, bookId);
    // Then add to new list
    await this.addBookToList(toListId, bookId);
    
    return {
      message: 'Book moved successfully',
    };
  }
}

export const listBookService = new ListBookService();
export type { UserList, ListBook };